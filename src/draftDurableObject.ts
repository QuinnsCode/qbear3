// src/draftDurableObject.ts
import { DurableObject } from "cloudflare:workers";
import type { DraftState, DraftConfig, DraftPlayer, CubeCard, DraftAction } from "@/app/types/Draft";
import { DraftManager } from '@/app/services/draft/DraftManager'
import { sanitizeArrayForPlayer, CommonRules } from '@/lib/durableObjectSecurity'
import { DraftAI } from '@/app/services/draft/DraftAI'

export class DraftDO extends DurableObject {
  private draftState: DraftState | null = null
  private cubeCards: CubeCard[] = []
  private aiTimeouts = new Set<NodeJS.Timeout>()

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    
    this.ctx.blockConcurrencyWhile(async () => {
      const initialized = await this.ctx.storage.get('initialized')
      if (!initialized) {
        await this.ctx.storage.put('initialized', true)
        await this.ctx.storage.put('createdAt', Date.now())
      }
    })
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method
    
    try {
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocketUpgrade(request)
      }

      if (method === 'GET' && url.pathname.startsWith('/export/')) {
        const playerId = url.pathname.split('/').pop()
        if (!playerId) {
          return Response.json({ error: 'Invalid player ID' }, { status: 400 })
        }
        
        const state = await this.getState()
        const player = state.players.find(p => p.id === playerId)
        
        if (!player) {
          return Response.json({ error: 'Player not found' }, { status: 404 })
        }
        
        const deck = {
          playerName: player.name,
          cards: player.draftPool,
          totalPicks: player.draftPool.length,
          draftComplete: state.status === 'complete'
        }
        
        return Response.json({ deck })
      }
      
      if (method === 'GET') {
        const state = await this.getState()
        return Response.json(state)
      }
      
      if (method === 'POST' && url.pathname === '/start') {
        const { cubeCards, config, players } = await request.json() as any
        const state = await this.startDraft(cubeCards, config, players)
        return Response.json(state)
      }
      
      if (method === 'POST') {
        const action = await request.json() as any
        const result = await this.applyAction(action)
        return Response.json(result)
      }
      
      if (method === 'DELETE') {
        this.broadcast({ type: 'draft_deleted' })
        this.closeAllWebSockets()
        await this.ctx.storage.deleteAll()
        this.draftState = null
        this.cubeCards = []
        return Response.json({ success: true })
      }
      
      return new Response('Not found', { status: 404 })
      
    } catch (error: any) {
      console.error('DraftDO error:', error)
      return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 })
    }
  }
  
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    
    const playerId = request.headers.get('X-Auth-User-Id') || `guest-${crypto.randomUUID()}`;
    const playerName = request.headers.get('X-Auth-User-Name') || 'Guest';
    
    this.ctx.acceptWebSocket(server, ['draft', playerId, playerName]);
    
    const state = await this.getState();

    // Enrich packs with full card data
    const enrichedState = {
    ...state,
    players: state.players.map(p => ({
        ...p,
        currentPack: p.currentPack ? {
        ...p.currentPack,
        cards: p.currentPack.cards.map((id: string) => 
            this.cubeCards.find(c => c.scryfallId === id)
        ).filter(Boolean) as CubeCard[]
        } : undefined
    }))
    };

    server.send(JSON.stringify({ type: 'state_update', state: enrichedState }));
    
    return new Response(null, { status: 101, webSocket: client });
  }
  
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      }
    } catch (e) {
      console.error('Failed to parse message:', e)
    }
  }
  
  async webSocketClose(ws: WebSocket): Promise<void> {
    const tags = this.ctx.getTags(ws)
    console.log(`🔌 ${tags[2]} disconnected`)
  }
  
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('❌ WebSocket error:', error)
  }
  
  async getState(): Promise<DraftState> {
    if (!this.draftState) {
      const stored = await this.ctx.storage.get<DraftState>('draftState')
      if (stored) this.draftState = stored
      
      const cards = await this.ctx.storage.get<CubeCard[]>('cubeCards')
      if (cards) this.cubeCards = cards
    }
    
    if (!this.draftState) throw new Error('Draft not initialized')
    return this.draftState
  }

  private clearAITimeouts() {
    for (const timeout of this.aiTimeouts) {
      clearTimeout(timeout)
    }
    this.aiTimeouts.clear()
  }
  
  private scheduleAIProcessing() {
    this.clearAITimeouts()
    
    const timeout = setTimeout(() => {
      this.processAITurnsSync()
    }, 500)
    
    this.aiTimeouts.add(timeout)
  }
  
  async startDraft(cubeCards: CubeCard[], config: DraftConfig, players: DraftPlayer[]): Promise<DraftState> {
    console.log('🎴 Starting draft with', players.length, 'players')
    console.log('📦 Cube has', cubeCards.length, 'cards')
    
    this.cubeCards = cubeCards  // Already storing this
    this.draftState = DraftManager.initializeDraft(cubeCards, config, players)
    
    // ✅ ADD: Store cubeCards in state for deck building later
    this.draftState.cubeCards = cubeCards
    
    console.log('✅ Draft initialized, status:', this.draftState.status)
    
    this.persist()
    
    return this.draftState
  }
  
  async applyAction(action: Omit<DraftAction, 'id' | 'timestamp'>): Promise<{ success: boolean }> {
    if (!this.draftState) await this.getState()
    if (!this.draftState) throw new Error('Draft not initialized')
    
    const draftAction: DraftAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }
    
    const newState = this.reduceAction(this.draftState, draftAction)
    
      if (newState !== this.draftState) {
        this.draftState = newState
        
       // Track human pick
        if (!this.draftState.playersWhoPickedThisRound) {
            this.draftState.playersWhoPickedThisRound = []
        }
        if (!this.draftState.playersWhoPickedThisRound.includes(action.playerId)) {
            this.draftState.playersWhoPickedThisRound.push(action.playerId)
        }
        
        this.draftState.updatedAt = new Date()
        this.persist()
        
        if (!action.playerId.startsWith('ai-')) {
            this.broadcast({
                type: 'pick_confirmed',
                state: this.enrichState(this.draftState)
            })
            
            this.scheduleAIProcessing()  // ✅ Same level
        }
      }
      
      return { success: true }
  }
  
  private reduceAction(state: DraftState, action: DraftAction): DraftState {
    switch (action.type) {
      case 'make_pick': {
        // ✅ Add type guard
        if (!action.data.cardIds) {
          console.error('[DraftDO] Missing cardIds in make_pick action')
          return state
        }
        return DraftManager.makePick(state, action.playerId, action.data.cardIds, this.cubeCards)
      }
      
      case 'finalize_deck': {
        const playerIndex = state.players.findIndex(p => p.id === action.playerId)
        
        if (playerIndex === -1) {
          console.error(`[DraftDO] Player ${action.playerId} not found`)
          return state
        }
        
        if (!action.data.deckConfig) {
          console.error('[DraftDO] Missing deckConfig in finalize_deck action')
          return state
        }
        
        // Calculate total cards (mainDeck + basics)
        const mainDeckCount = action.data.deckConfig.mainDeck.reduce(
          (sum, card) => sum + card.quantity, 
          0
        )
        const basicsCount = Object.values(action.data.deckConfig.basics).reduce(
          (sum, count) => sum + count, 
          0
        )
        const totalCards = mainDeckCount + basicsCount
        
        console.log(`[DraftDO] Finalizing deck for ${state.players[playerIndex].name}:`, {
          mainDeck: mainDeckCount,
          basics: basicsCount,
          total: totalCards,
          exportedDeckId: action.data.exportedDeckId
        })
        
        // Update player's deck configuration
        const updatedPlayers = [...state.players]
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          deckConfiguration: {
            mainDeck: action.data.deckConfig.mainDeck,
            sideboard: action.data.deckConfig.sideboard,
            basics: action.data.deckConfig.basics,
            totalCards,
            isFinalized: true,
            exportedDeckId: action.data.exportedDeckId
          }
        }
        
        return {
          ...state,
          players: updatedPlayers
        }
      }
      
      default:
        return state
    }
  }

  private processAITurnsSync(): void {
    console.log('🤖 Starting AI processing')
    
    if (!this.draftState || this.draftState.status !== 'drafting') {
      console.log('❌ Invalid state for AI processing')
      return
    }
    
    // Initialize pick tracking if needed
    if (!this.draftState.playersWhoPickedThisRound) {
      this.draftState.playersWhoPickedThisRound = []  // ✅ Array not Set
    }
    
    let iterations = 0
    
    while (iterations < 100) {
      const aiPlayers = this.draftState.players.filter(p => 
        p.isAI && 
        p.currentPack && 
        p.currentPack.cards.length > 0 &&
        !this.draftState?.playersWhoPickedThisRound?.includes(p.id)  // ✅ Correct
      )
      
      if (aiPlayers.length === 0) {
        console.log('✅ All AI picked')
        break
      }
      
      const ai = aiPlayers[0]
      const cardIds = DraftAI.pickCards(ai.currentPack!, ai.draftPool, this.cubeCards, this.draftState.config.pickCount)
      
      this.draftState = DraftManager.makePick(this.draftState, ai.id, cardIds, this.cubeCards)
      
      // Add AI to picked list
      if (!this.draftState.playersWhoPickedThisRound!.includes(ai.id)) {
        this.draftState.playersWhoPickedThisRound!.push(ai.id)  // ✅ Changed from .add()
      }
      
      // Check if ALL players picked
      const allPicked = this.draftState.players.every(p => 
        this.draftState?.playersWhoPickedThisRound?.includes(p.id)  // ✅ Changed from .has()
      )
      
      if (allPicked) {
        console.log('🎯 Everyone picked')
        
        this.draftState.playersWhoPickedThisRound = []
        
        // ✅ Check if ANY pack has enough cards for another full pick
        const canContinuePicking = this.draftState.players.some(p => 
          p.currentPack && p.currentPack.cards.length >= this.draftState.config.pickCount
        )
        
        if (canContinuePicking) {
          // More picks available - pass packs
          this.draftState.currentPick++
          this.draftState = DraftManager.passPacks(this.draftState)
          
          this.broadcast({
            type: 'packs_passed',
            pick: this.draftState.currentPick,
            state: this.enrichState(this.draftState)
          })
          
          break  // Wait for next human pick
          
        } else {
          // Pack exhausted - auto-pick any remaining cards (< pickCount)
          this.draftState.players.forEach(p => {
            if (p.currentPack && p.currentPack.cards.length > 0) {
              console.log(`🎯 Auto-picking ${p.currentPack.cards.length} remaining cards for ${p.name}`)
              const remainingCards = [...p.currentPack.cards]
              this.draftState = DraftManager.makePick(
                this.draftState!, 
                p.id, 
                remainingCards, 
                this.cubeCards
              )
            }
          })
          
          // Start next round or complete
          if (this.draftState.currentRound < this.draftState.config.packsPerPlayer - 1) {
            this.draftState.currentRound++
            this.draftState.currentPick = 0
            this.draftState = DraftManager.startNextRound(this.draftState)
            
            this.broadcast({
              type: 'round_started',
              round: this.draftState.currentRound,
              state: this.enrichState(this.draftState)
            })
            
            break  // Wait for human to start new pack
            
          } else {
            this.draftState.status = 'complete'
            this.broadcast({ type: 'draft_complete' })
            break
          }
        }
      }
      
      iterations++
    }
    
    this.persist()
  }
  
  private enrichState(state: DraftState): any {
    return {
      ...state,
      players: state.players.map(p => ({
        ...p,
        currentPack: p.currentPack ? {
          ...p.currentPack,
          cards: p.currentPack.cards.map((id: string) => 
            this.cubeCards.find(c => c.scryfallId === id)
          ).filter(Boolean) as CubeCard[]
        } : undefined
      }))
    }
  }
  
  private broadcast(message: any): void {
    const json = JSON.stringify(message)
    const sockets = this.ctx.getWebSockets()
    for (const ws of sockets) {
      try { ws.send(json) } catch (e) {}
    }
  }
  
  private closeAllWebSockets(): void {
    const sockets = this.ctx.getWebSockets()
    for (const ws of sockets) {
      try { ws.close(1000, 'Draft deleted') } catch (e) {}
    }
  }
  
  private persist(): void {
    if (this.draftState) this.ctx.storage.put('draftState', this.draftState)
    if (this.cubeCards.length) this.ctx.storage.put('cubeCards', this.cubeCards)
  }
}