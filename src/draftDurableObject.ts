// src/draftDurableObject.ts
import { DurableObject } from "cloudflare:workers";
import type { DraftState, DraftConfig, DraftPlayer, CubeCard, DraftAction } from "@/app/types/Draft";
import { DraftManager } from '@/app/services/draft/DraftManager'
import { sanitizeArrayForPlayer, CommonRules } from '@/lib/durableObjectSecurity'
import { viewFor, type DraftViewMode } from '@/app/services/draft/DraftView'
import { DraftAI } from '@/app/services/draft/DraftAI'
import { updateDraftMetadata, completeDraft } from '@/app/serverActions/draft/draftTracking'

const DEFAULT_PICK_SECONDS = 120

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

      // One drafter's seat: their pack, their pool, whether they owe a pick. Nobody else's packs.
      if (method === 'GET' && url.pathname.startsWith('/view/')) {
        const playerId = decodeURIComponent(url.pathname.slice('/view/'.length))
        const state = await this.getState().catch(() => null)
        if (!state) return Response.json({ error: 'No such draft' }, { status: 404 })
        const player = state.players.find(p => p.id === playerId && !p.isAI && !p.open)
        if (!player) return Response.json({ error: 'Not a drafter in this draft' }, { status: 403 })
        const card = (id: string) => this.cubeCards.find(c => c.scryfallId === id)
        return Response.json({
          status: state.status,
          round: state.currentRound,
          pick: state.currentPick,
          config: state.config,
          me: { id: player.id, name: player.name },
          pack: (player.currentPack?.cards ?? []).map(card).filter(Boolean),
          hasPicked: state.playersWhoPickedThisRound?.includes(player.id) ?? false,
          pool: player.draftPool.map(card).filter(Boolean),
          deckId: player.deckConfiguration?.exportedDeckId ?? null,
        })
      }
      
      // The draft as one viewer may see it (the page's initial state): their seat, or the public facts
      if (method === 'GET' && url.pathname === '/for') {
        const state = await this.getState().catch(() => null)
        if (!state) return Response.json({ error: 'No such draft' }, { status: 404 })
        const viewerId = url.searchParams.get('viewer') || null
        const mode = this.modeFor(viewerId)
        if (!mode) return Response.json({ error: 'This draft is protected' }, { status: 403 })
        return Response.json({ mode, state: viewFor(state, this.cubeCards, viewerId, mode) })
      }

      if (method === 'GET') {
        const state = await this.getState()
        return Response.json(state)
      }
      
      if (method === 'POST' && url.pathname === '/start') {
        const { cubeCards, config, players, creatorId } = await request.json() as any
        const state = await this.startDraft(cubeCards, config, players, creatorId)
        return Response.json(state)
      }
      
      // Take an open seat. Who is asking comes from the Worker (session or guest cookie), as for the socket.
      if (method === 'POST' && url.pathname === '/join') {
        const userId = request.headers.get('X-Auth-User-Id')
        const name = request.headers.get('X-Auth-User-Name') || 'Guest'
        if (!userId) return Response.json({ error: 'Sign in, or join from a browser that can keep a cookie' }, { status: 401 })
        const joined = await this.join(userId, name)
        return 'error' in joined ? Response.json(joined, { status: joined.status }) : Response.json(joined)
      }

      if (method === 'PATCH' && url.pathname === '/permissions') {
        const userId = request.headers.get('X-Auth-User-Id') || null
        const { isPublic, allowSpectators, spectatorList } = await request.json() as any

        const state = await this.getState()

        // Only creator can update permissions
        if (userId !== state.creatorId) {
          return Response.json({ error: 'Only the creator can update permissions' }, { status: 403 })
        }

        // Update permissions
        if (!state.permissions) {
          state.permissions = {
            isPublic: false,
            allowSpectators: true,
            spectatorList: []
          }
        }

        if (typeof isPublic === 'boolean') {
          state.permissions.isPublic = isPublic
        }
        if (typeof allowSpectators === 'boolean') {
          state.permissions.allowSpectators = allowSpectators
        }
        if (Array.isArray(spectatorList)) {
          state.permissions.spectatorList = spectatorList
        }

        this.draftState = state
        await this.persist()
        this.broadcast({ type: 'permissions_updated', permissions: state.permissions })

        return Response.json({ success: true, permissions: state.permissions })
      }

      if (method === 'POST') {
        const action = await request.json() as any
        try {
          return Response.json(await this.applyAction(action))
        } catch (e) {
          // A pick that breaks a rule (wrong count, not in your pack, already picked) is the caller's mistake
          return Response.json({ error: e instanceof Error ? e.message : 'Invalid action' }, { status: 400 })
        }
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

    const userId = request.headers.get('X-Auth-User-Id') || null;
    const playerName = request.headers.get('X-Auth-User-Name') || 'Guest';

    const state = await this.getState();

    // ✅ HEALING: If no creator set and this is a logged-in user who's a player, set them as creator
    if (!state.creatorId && userId && !userId.startsWith('guest-')) {
      const isPlayerInDraft = state.players.some(p => p.id === userId && !p.isAI)
      if (isPlayerInDraft) {
        console.log(`[DraftDO] Healing creator for draft ${state.id}: setting ${userId} as creator`)
        state.creatorId = userId

        // Update permissions to protected since this is a logged-in user's draft
        if (state.permissions) {
          state.permissions.isPublic = false
        }

        this.draftState = state
        await this.persist()
      }
    }

    // Seated drafters draft; anyone else may watch if the draft lets them
    const mode = this.modeFor(userId);
    if (!mode) return new Response('Unauthorized: This draft is protected', { status: 403 });
    const playerId = userId || `guest-${crypto.randomUUID()}`;

    // Tag WebSocket: ['draft', playerId, playerName, mode]
    this.ctx.acceptWebSocket(server, ['draft', playerId, playerName, mode]);

    server.send(JSON.stringify({
      type: 'state_update',
      state: viewFor(state, this.cubeCards, userId, mode),
      mode,
    }));

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
      if (stored) {
        this.draftState = stored

        // ✅ HEALING: Set default permissions for existing drafts
        let healed = false

        if (this.draftState.permissions === undefined) {
          // Default: guest drafts are public, logged-in drafts are protected
          const isGuestDraft = !this.draftState.creatorId
          this.draftState.permissions = {
            isPublic: isGuestDraft,
            allowSpectators: true,
            spectatorList: []
          }
          healed = true
          console.log(`[DraftDO] Healed permissions for draft ${this.draftState.id} (guest=${isGuestDraft})`)
        }

        if (healed) {
          await this.ctx.storage.put('draftState', this.draftState)
        }
      }

      const cards = await this.ctx.storage.get<CubeCard[]>('cubeCards')
      if (cards) this.cubeCards = cards
    }

    if (!this.draftState) throw new Error('Draft not initialized')
    return this.draftState
  }

  /** How `userId` may join: as a seated drafter, as a spectator, or not at all. */
  private modeFor(userId: string | null): DraftViewMode | null {
    const seated = !!userId && !!this.draftState?.players.some(p => !p.isAI && !p.open && p.id === userId)
    if (seated) return 'drafter'
    return this.canSpectate(userId) ? 'spectator' : null
  }

  /**
   * Check if a user can spectate this draft
   * - Public drafts: anyone can spectate if allowSpectators is true
   * - Protected drafts: creator + spectatorList can spectate if allowSpectators is true
   */
  private canSpectate(userId: string | null): boolean {
    if (!this.draftState?.permissions) return true // Default allow if no permissions set

    // Spectating must be enabled
    if (!this.draftState.permissions.allowSpectators) return false

    // Creator can always spectate their own draft
    if (userId !== null && userId === this.draftState.creatorId) return true

    // Public drafts allow anyone to spectate
    if (this.draftState.permissions.isPublic) return true

    // Protected drafts: check spectator list
    return userId !== null && this.draftState.permissions.spectatorList.includes(userId)
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
  
  async startDraft(
    cubeCards: CubeCard[],
    config: DraftConfig,
    players: DraftPlayer[],
    creatorId?: string | null
  ): Promise<DraftState> {
    console.log('🎴 Starting draft with', players.length, 'players')
    console.log('📦 Cube has', cubeCards.length, 'cards')

    this.cubeCards = cubeCards  // Already storing this
    this.draftState = DraftManager.initializeDraft(cubeCards, config, players)

    // ✅ Store cubeCards in state for deck building later
    this.draftState.cubeCards = cubeCards

    // ✅ NEW: Set creator and permissions
    this.draftState.creatorId = creatorId || undefined

    // Seats nobody has taken yet hold the draft back until the last one is filled
    if (players.some(p => p.open)) this.draftState.status = 'waiting'

    // Default permissions based on whether creator is logged in
    const isGuestDraft = !creatorId
    this.draftState.permissions = {
      isPublic: isGuestDraft,       // Guest drafts are public by default
      allowSpectators: true,        // Allow spectators by default
      spectatorList: []             // Empty spectator list initially
    }

    console.log(`✅ Draft initialized, status: ${this.draftState.status}, isPublic: ${this.draftState.permissions.isPublic}`)

    this.persist()
    this.armPickDeadline()

    return this.draftState
  }

  /** Seat `userId` in the first open seat. Taking the last one starts the draft. */
  private async join(userId: string, name: string): Promise<{ ok: true; status: DraftState['status'] } | { error: string; status: number }> {
    const state = await this.getState()
    if (state.players.some(p => p.id === userId && !p.open)) return { ok: true, status: state.status }
    const seat = state.players.findIndex(p => p.open)
    if (seat === -1) return { error: 'This draft has no open seats', status: 409 }

    const seatNumber = state.players.filter(p => !p.isAI && !p.open).length + 1
    state.players[seat] = { ...state.players[seat], id: userId, name: name === 'Guest' ? `Guest ${seatNumber}` : name, open: false }
    if (!state.players.some(p => p.open) && state.status === 'waiting') state.status = 'drafting'
    state.updatedAt = new Date()
    this.draftState = state
    this.persist()
    this.armPickDeadline()
    this.broadcastState('seat_taken', state)
    return { ok: true, status: state.status }
  }

  /** With several humans, the pick everyone waits on has a deadline; with one there is nobody to wait for. */
  private armPickDeadline(): void {
    const state = this.draftState
    if (!state) return
    const humans = state.players.filter(p => !p.isAI).length
    if (state.status !== 'drafting' || humans < 2) { state.pickDeadline = undefined; return }
    const seconds = state.config.pickTimerSeconds ?? DEFAULT_PICK_SECONDS
    state.pickDeadline = Date.now() + seconds * 1000
    this.persist()
    void this.ctx.storage.setAlarm(state.pickDeadline)
  }

  /** The deadline passed: a seated human who has not picked gets an AI pick, then the round moves on. */
  async alarm(): Promise<void> {
    const state = await this.getState().catch(() => null)
    if (!state || state.status !== 'drafting' || !state.pickDeadline) return
    if (Date.now() < state.pickDeadline) { void this.ctx.storage.setAlarm(state.pickDeadline); return }
    for (const p of state.players) {
      if (!p.isAI && !p.open) this.autoPick(p.id)
    }
    this.advanceRound()
    this.persist()
  }
  
  async applyAction(action: Omit<DraftAction, 'id' | 'timestamp'>): Promise<{ success: boolean }> {
    if (!this.draftState) await this.getState()
    if (!this.draftState) throw new Error('Draft not initialized')

    if (action.type === 'make_pick') {
      if (this.draftState.status === 'waiting') throw new Error('Waiting for the other drafters to take their seats')
      if (this.draftState.status !== 'drafting') throw new Error('The draft is over')
      // Between a pick and the pass the same pack is still in hand: a second pick would take two turns
      if (this.draftState.playersWhoPickedThisRound?.includes(action.playerId)) {
        throw new Error('Already picked from this pack; wait for it to pass')
      }
    }

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
            this.broadcastState('pick_confirmed', this.draftState)

            // ✅ Update draft tracking for human player
            const draftId = this.ctx.id.name ?? ''
            updateDraftMetadata(action.playerId, draftId, {
              lastActivity: Date.now(),
              packNumber: this.draftState.currentRound + 1,
              pickNumber: this.draftState.currentPick + 1
            }).catch(err => {
              console.error('[DraftDO] Failed to update draft metadata:', err)
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

  /** Pick for `playerId` as the AI would, and count it as their pick this round. */
  private autoPick(playerId: string): void {
    const state = this.draftState
    const p = state?.players.find(q => q.id === playerId)
    if (!state || !p?.currentPack || p.currentPack.cards.length === 0) return
    const picked = state.playersWhoPickedThisRound ?? (state.playersWhoPickedThisRound = [])
    if (picked.includes(playerId)) return
    const cardIds = DraftAI.pickCards(p.currentPack, p.draftPool, this.cubeCards, state.config.pickCount)
    this.draftState = DraftManager.makePick(state, playerId, cardIds, this.cubeCards)
    picked.push(playerId)
  }

  private processAITurnsSync(): void {
    if (!this.draftState || this.draftState.status !== 'drafting') return
    for (const ai of this.draftState.players.filter(p => p.isAI)) this.autoPick(ai.id)
    this.advanceRound()
    this.persist()
  }

  /** Once every drafter has picked, pass the packs, start the next round, or finish. */
  private advanceRound(): void {
    if (!this.draftState || this.draftState.status !== 'drafting') return
    const picked = this.draftState.playersWhoPickedThisRound ?? []
    // Players whose pack ran dry have nothing to pick
    const owing = this.draftState.players.filter(p => p.currentPack && p.currentPack.cards.length > 0)
    if (owing.some(p => !picked.includes(p.id))) return

    this.draftState.playersWhoPickedThisRound = []
    const { pickCount } = this.draftState.config
    const canContinuePicking = this.draftState.players.some(p => p.currentPack && p.currentPack.cards.length >= pickCount)

    if (canContinuePicking) {
      this.draftState.currentPick++
      this.draftState = DraftManager.passPacks(this.draftState)
      this.armPickDeadline()
      this.broadcastState('packs_passed', this.draftState, { pick: this.draftState.currentPick })
      return
    }

    // Pack exhausted - auto-pick any remaining cards (< pickCount)
    this.draftState.players = this.draftState.players.map(p =>
      p.currentPack && p.currentPack.cards.length > 0
        ? { ...p, draftPool: [...p.draftPool, ...p.currentPack.cards], currentPack: undefined }
        : p)

    if (this.draftState.currentRound < this.draftState.config.packsPerPlayer - 1) {
      this.draftState.currentRound++
      this.draftState.currentPick = 0
      this.draftState = DraftManager.startNextRound(this.draftState)
      this.armPickDeadline()
      this.broadcastState('round_started', this.draftState, { round: this.draftState.currentRound })
      return
    }

    this.draftState.status = 'complete'
    this.draftState.pickDeadline = undefined
    this.broadcast({ type: 'draft_complete' })

    // Mark draft as complete in KV for all human players, and store their pools for easy import
    const draftId = this.ctx.id.name ?? ''
    const humanPlayers = this.draftState.players.filter(p => !p.isAI)
    humanPlayers.forEach(player => {
      completeDraft(player.id, draftId).catch(err => {
        console.error(`[DraftDO] Failed to complete draft for ${player.id}:`, err)
      })
    })
    this.storeDraftDecksInKV(draftId, humanPlayers)
  }

  /** Send each socket the state as its own viewer sees it. */
  private broadcastState(type: string, state: DraftState, extra: Record<string, unknown> = {}): void {
    for (const ws of this.ctx.getWebSockets()) {
      const [, viewerId, , mode] = this.ctx.getTags(ws)
      const view = viewFor(state, this.cubeCards, viewerId ?? null, mode === 'drafter' ? 'drafter' : 'spectator')
      try { ws.send(JSON.stringify({ type, ...extra, state: view })) } catch (e) {}
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

  /**
   * Hand a finished solo (guest) draft's picks to the deck importer for 7 days: `draft:${draftId}:deck`,
   * the key `fetchDraftDeckFromKV` reads. A guest has no eqosys account to save into, so this short-lived
   * KV entry is the handoff, not a saved deck. Signed-in drafters export through the deck store; a
   * multi-player draft has no per-player key because nothing reads one.
   */
  private async storeDraftDecksInKV(draftId: string, players: DraftPlayer[]): Promise<void> {
    if (players.length !== 1) return
    try {
      const [player] = players
      const cardCounts = new Map<string, number>()
      for (const scryfallId of player.draftPool) {
        const card = this.cubeCards.find(c => c.scryfallId === scryfallId)
        if (card) cardCounts.set(card.name, (cardCounts.get(card.name) ?? 0) + 1)
      }
      const decklistText = [...cardCounts].map(([name, quantity]) => `${quantity} ${name}`).join('\n')
      await this.env.DECKS_KV.put(`draft:${draftId}:deck`, decklistText, { expirationTtl: 60 * 60 * 24 * 7 })
    } catch (error) {
      // Not critical to draft completion
      console.error('[DraftDO] Error storing draft deck in KV:', error)
    }
  }
}
