// gameDurableObject.ts - CLEANED VERSION
/**
 * RISK-STYLE STRATEGY GAME - Durable Object Game State Manager
 * 
 * This version has been cleaned up by extracting setup functions to setupFunctions.ts
 * 
 * /**
 * RISK-STYLE STRATEGY GAME - Durable Object Game State Manager
 * 
 * TECH STACK:
 * - Cloudflare Workers & Durable Objects for distributed game state
 * - RedwoodJS SDK for full-stack framework
 * - WebSockets for real-time multiplayer communication
 * - TypeScript for type safety
 * 
 * ARCHITECTURE:
 * - GameStateDO: Single source of truth for game state, handles all game logic
 * - WebSocket connections: Real-time bidirectional communication between clients and DO
 * - HTTP API: RESTful endpoints for game actions (POST/GET/PUT)
 * - AI Controller: Manages AI player actions with realistic delays
 * 
 * GAME FLOW (Post-Restart):
 * 1. TERRITORY NUKING: Random territories get nuked based on nukeCount parameter
 * 2. SETUP PHASES: Turn-based setup with 4 sequential phases:
 *    a) UNITS PHASE: Each player places 3 units per turn on their territories
 *    b) LAND COMMANDER: Each player places 1 land commander on owned territory
 *    c) DIPLOMAT COMMANDER: Each player places 1 diplomat commander on owned territory  
 *    d) SPACE BASE: Each player places 1 space base on owned territory
 * 3. MAIN GAME: Standard Risk-style gameplay with 7 phases per turn
 * 
 * SETUP PHASE MECHANICS:
 * - Players alternate turns within each setup phase
 * - Phase only advances when ALL players complete their requirements
 * - AI players act automatically with delays for better UX
 * - Real-time updates via WebSocket broadcasts
 * - Turn validation prevents out-of-turn actions
 * 
 * KEY FEATURES:
 * - Persistent game state in Durable Object storage
 * - Action replay system for game rewind functionality
 * - Robust error handling and validation
 * - AI player support with configurable difficulty
 * - Real-time multiplayer with WebSocket sync
 */
import { GAME_CONFIG } from '@/app/services/game/gameSetup'
import { DurableObject } from "cloudflare:workers";
import type { GameState, GameAction, Player, Territory } from '@/app/lib/GameState'
import { setupNewGame, advanceSetupTurn } from '@/app/services/game/gameSetup'
import { globalAIController } from '@/app/services/game/ADai'

// ✅ IMPORT EXTRACTED SETUP FUNCTIONS (only the ones we actually use)
import { 
  handleSetupPhaseProgression,
  orchestrateAISetupAction
} from '@/app/services/game/setupFunctions'

export class GameStateDO extends DurableObject {
  
  private gameState: GameState | null = null
  private gameConnections: Set<WebSocket> = new Set();
  private wsToPlayer: Map<WebSocket, string> = new Map();
  private aiTurnTimeouts = new Map<string, any>();
  private AI_TURN_SPEED_MS = 500;
  private AI_TURN_SPEED_LONGACTION_MS = 800;
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    try {
      // Handle WebSocket upgrades
      if (request.headers.get('Upgrade') === 'websocket') {
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        server.accept();
        this.gameConnections.add(server);
        console.log(`🎮 Game WebSocket connected. Total connections: ${this.gameConnections.size}`);

        server.addEventListener('close', () => {
          console.log(`🔌 Game WebSocket closed`);
          this.gameConnections.delete(server);
          this.wsToPlayer.delete(server);
        });

        server.addEventListener('error', () => {
          console.log(`❌ Game WebSocket error`);
          this.gameConnections.delete(server);
          this.wsToPlayer.delete(server);
        });

        server.addEventListener('message', (event) => {
          this.handleWebSocketMessage(server, event.data);
        });

        try {
          const currentState = await this.getState();
          if (server.readyState === WebSocket.OPEN) {
            server.send(JSON.stringify({
              type: 'state_update',
              state: currentState
            }));
            console.log('📤 Sent initial game state to new connection');
          }
        } catch (error) {
          console.error('Failed to send initial state:', error);
        }

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }

      // Handle HTTP requests for game actions
      if (method === 'GET') {
        return Response.json(await this.getState())
      }
      
      if (method === 'POST') {
        const requestData = await request.json() as any
        
        if (requestData.playerNames && requestData.territoryConfig) {
          const newGame = await this.createGame(requestData)
          return Response.json(newGame)
        } else if (requestData.playerId && requestData.playerName) {
          const joinResult = await this.joinGame(requestData)
          return Response.json(joinResult)
        } else if (requestData.player1Id && requestData.player2Id && requestData.hasOwnProperty('nukeCount')) {
          const restartResult = await this.restartGame(requestData)
          return Response.json(restartResult)
        } else if (requestData.type) {
          const result = await this.applyAction(requestData)
          return Response.json(result)
        } else if (requestData.action === 'initialize_default') {
          const defaultGame = await this.createDefaultGame()
          return Response.json(defaultGame)
        } else {
          return new Response('Invalid POST data', { status: 400 })
        }
      }
      
      if (method === 'PUT') {
        const { actionIndex } = await request.json()
        const rewindResult = await this.rewindToAction(actionIndex)
        return Response.json(rewindResult)
      }
      
      return new Response('Method not allowed', { status: 405 })
      
    } catch (error) {
      console.error('GameStateDO error:', error)
      return new Response(`Error: ${error.message}`, { status: 500 })
    }
  }

  private handleWebSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let messageString: string;
    
    if (typeof message === 'string') {
      messageString = message;
    } else if (message instanceof ArrayBuffer) {
      messageString = new TextDecoder().decode(message);
    } else {
      console.log('❌ Unknown message type:', typeof message);
      return;
    }
    
    try {
      const data = JSON.parse(messageString);
      console.log('📨 Game message received:', data);
      
      if (data.type === 'ping' && data.gameId) {
        console.log('💓 Received game heartbeat:', data.gameId, data.playerId);
        
        if (data.playerId) {
          this.wsToPlayer.set(ws, data.playerId);
          console.log('🔗 Associated WebSocket with player:', data.playerId);
        }
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
        return;
      }
      
    } catch (e) {
      console.log('❌ Failed to parse game message as JSON:', e);
    }
  }

  async getState(): Promise<GameState> {
    if (!this.gameState) {
      await this.loadState()
    }
    
    if (!this.gameState) {
      console.log('No existing game state found, creating default game')
      this.gameState = await this.createDefaultGame()
    }
    
    return this.gameState
  }

  async loadState(): Promise<void> {
    const stored = await this.ctx.storage.get<GameState>('gameState')
    if (stored) {
      this.gameState = stored
      this.gameState.createdAt = new Date(this.gameState.createdAt)
      this.gameState.updatedAt = new Date(this.gameState.updatedAt)
      this.gameState.actions = this.gameState.actions.map(action => ({
        ...action,
        timestamp: new Date(action.timestamp)
      }))
    }
  }

  async createDefaultGame(): Promise<GameState> {
    const gameId = crypto.randomUUID()

    const players: Player[] = [
      {
        id: crypto.randomUUID(),
        name: 'Player 1',
        color: 'blue',
        cards: [],
        territories: ['territory1'],
        isActive: true,
        pendingDecision: undefined,
        remainingUnitsToPlace: GAME_CONFIG.SETUP_UNITS_PER_PLAYER, 
        unitsPlacedThisTurn: 0,
        unitsToPlaceThisTurn: 0, // ✅ NEW
        energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
        currentBid: undefined,
        totalEnergySpentOnBids: 0
      },
      {
        id: crypto.randomUUID(),
        name: 'Player 2',
        color: 'red',
        cards: [],
        territories: ['territory2'],
        isActive: false,
        pendingDecision: undefined,
        remainingUnitsToPlace: GAME_CONFIG.SETUP_UNITS_PER_PLAYER,
        unitsPlacedThisTurn: 0,
        unitsToPlaceThisTurn: 0, // ✅ NEW
        energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
        aiVibe: 'efficient',
        currentBid: undefined,
        totalEnergySpentOnBids: 0
      }
    ]

    const territories: Record<string, Territory> = {
      territory1: {
        id: 'territory1',
        name: 'North Region',
        ownerId: players[0].id,
        machineCount: 3,
        connections: ['territory2', 'territory3'],
        modifiers: {}
      },
      territory2: {
        id: 'territory2',
        name: 'South Region',
        ownerId: players[1].id,
        machineCount: 3,
        connections: ['territory1', 'territory3'],
        modifiers: {}
      },
      territory3: {
        id: 'territory3',
        name: 'Central Region',
        machineCount: 2,
        connections: ['territory1', 'territory2'],
        modifiers: {}
      }
    }

    this.gameState = {
      id: gameId,
      status: 'setup',
      setupPhase: 'units',
      currentPlayerIndex: 0,
      currentYear: 1,
      currentPhase: 1,
      players,
      turnOrder: players.map(p => p.id),
      activeTurnOrder: players.map(p => p.id),
      territories,
      actions: [],
      currentActionIndex: -1,
      createdAt: new Date(),
      updatedAt: new Date(),
      // 🎯 NEW: Initialize bidding-related properties
      bidding: undefined,              // No bidding during setup
      yearlyTurnOrders: {}            // Will track turn orders from each year's bidding
    }

    await this.persist()
    return this.gameState
  }
  
  async applyAction(action: Omit<GameAction, 'id' | 'timestamp'>): Promise<GameState> {
    if (!this.gameState) {
      await this.getState()
    }

    if (!this.gameState) {
      throw new Error('No game state found')
    }

    console.log(`🎬 Applying action: ${action.type} from ${action.playerId}`)
    console.log(`🎬 Action data:`, action.data)
    console.log(`🎬 Current game status: ${this.gameState.status}`)
    console.log(`🎬 Current setup phase: ${this.gameState.setupPhase}`)

    const gameAction: GameAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      previousState: this.createStateSnapshot()
    }

    const newState = this.reduceAction(this.gameState, gameAction)
    
    if (newState === this.gameState) {
      console.log(`⚠️ State unchanged after ${action.type} - validation may have failed`)
    } else {
      console.log(`✅ State changed after ${action.type}`)
    }
    
    if (newState !== this.gameState) {
      this.gameState = newState
      this.gameState.actions.push(gameAction)
      this.gameState.currentActionIndex = this.gameState.actions.length - 1
      this.gameState.updatedAt = new Date()

      await this.persist()
      
      this.broadcast({ type: 'state_update', state: this.gameState })
      
      if (this.gameState.status === 'setup') {
        await this.handleSetupProgression(action)
      } else if (this.gameState.status === 'playing') {
        await this.handleMainGamePhaseProgression(action)
      } 
      // 🎯 ADD THIS: Handle bidding progression
      else if (this.gameState.status === 'bidding') {
        await this.handleBiddingProgression(action)
      }
    }

    return this.gameState
  }

    // ✅ CLEANED UP - Uses imported handleSetupPhaseProgression
  //addded bidding handling
  private async handleSetupProgression(action: any): Promise<void> {
    if (!this.gameState) return

    // ✅ FIXED: Clear ALL AI timeouts first to prevent conflicts
    this.aiTurnTimeouts.forEach((timeout, playerId) => {
      clearTimeout(timeout)
    })
    this.aiTurnTimeouts.clear()

    // Use the imported function to get the progression result
    const result = handleSetupPhaseProgression(this.gameState, action)
    
    // Update the game state with the new state from the result
    if (result.newState !== this.gameState) {
      this.gameState = result.newState
      await this.persist()
      
      // ✅ ALWAYS broadcast when state changes
      console.log(`📡 Broadcasting state update after progression`)
      this.broadcast({ type: 'state_update', state: this.gameState })
    }
    
    // ✅ FIXED: Check the UPDATED game state, not the old one
    console.log(`🎮 SETUP PROGRESSION CHECK:`, {
      status: this.gameState.status,
      setupPhase: this.gameState.setupPhase,
      currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex].name,
      shouldScheduleAI: this.gameState.status === 'setup'
    })
    
    // ✅ FIXED: Handle all three possible states
    if (this.gameState.status === 'setup') {
      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
      if (currentPlayer && globalAIController.isAIPlayer(currentPlayer.id)) {
        console.log(`🤖 Scheduling AI turn for ${currentPlayer.name} in ${this.gameState.setupPhase} phase`)
        
        const timeoutId = setTimeout(() => {
          this.doAISetupAction()
        }, this.AI_TURN_SPEED_MS)
        
        this.aiTurnTimeouts.set(currentPlayer.id, timeoutId)
      }
    } else if (this.gameState.status === 'bidding') {
      console.log(`💰 Game transitioned to bidding - Year ${this.gameState.bidding?.year}`)
      
      this.checkAndTriggerAIBidding()
    } else {
      console.log(`🎮 Game finished (status: ${this.gameState.status}) - no more AI scheduling needed`)
    }
  }

  // 🎯 NEW: Add bidding progression handler
  // Update your handleBiddingProgression method:
  // Update your handleBiddingProgression to count only bidding players:
  private async handleBiddingProgression(action: any): Promise<void> {
    if (!this.gameState || this.gameState.status !== 'bidding') return

    console.log(`💰 Handling bidding progression - Action: ${action.type}`)

    if (action.type === 'place_bid') {
      // ✅ FIX: Count only non-NPC players
      const biddingPlayers = this.gameState.players.filter(player => 
        !player.name.includes('NPC') && player.name !== 'NPC'
      )
      const totalBiddingPlayers = biddingPlayers.length
      const totalBids = Object.keys(this.gameState.bidding?.bidsSubmitted || {}).length
      const waitingCount = this.gameState.bidding?.playersWaitingToBid?.length || 0
      
      console.log(`📊 Bid count check: ${totalBids}/${totalBiddingPlayers} bids from real players, ${waitingCount} waiting`)
      
      // ✅ FIX: Auto-reveal when all BIDDING players have bid
      if (totalBids >= totalBiddingPlayers || waitingCount === 0) {
        console.log(`🎯 All bidding players have bid - auto-revealing bids...`)
        
        setTimeout(async () => {
          if (this.gameState?.status === 'bidding' && !this.gameState.bidding?.bidsRevealed) {
            await this.applyAction({
              type: 'reveal_bids',
              playerId: 'system',
              data: {}
            })
            
            setTimeout(async () => {  // ← ONLY THIS ONE gets the *5
              if (this.gameState?.status === 'bidding' && 
                  this.gameState.bidding?.bidsRevealed) {
                await this.applyAction({
                  type: 'start_year_turns',
                  playerId: 'system', 
                  data: {}
                })
              }
            }, this.AI_TURN_SPEED_LONGACTION_MS * 5)  // ← *5 HERE (shows winner longer)
          }
        }, this.AI_TURN_SPEED_LONGACTION_MS)
      }
    }
  }

  // Add helper function to identify bidding players:
  private getBiddingPlayers(): Player[] {
    if (!this.gameState) return []
    
    return this.gameState.players.filter(player => 
      !player.name.includes('NPC') && player.name !== 'NPC'
    )
  }

  private async handleMainGamePhaseProgression(action: any): Promise<void> {
    if (!this.gameState || this.gameState.status !== 'playing') return

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
  
    // ✅ ADD THIS: Check if AI needs to start when first entering playing mode
    if (action.type === 'start_year_turns' && globalAIController.isAIPlayer(currentPlayer.id)) {
      console.log(`🎮 Just entered playing mode - scheduling AI for ${currentPlayer.name}`)
      setTimeout(() => {
        this.doAIMainGameAction()
      }, this.AI_TURN_SPEED_MS * 3)
      return // Exit early since this is initial setup, not progression
    }

    let shouldAdvancePhase = false
    let shouldAdvanceTurn = false
    
    console.log(`📍 Handling main game progression - Turn: ${this.gameState.currentYear}, Phase: ${this.gameState.currentPhase}, Player: ${currentPlayer.name}`)
    
    let phaseCompleted = false
    
    switch (this.gameState.currentPhase) {
      case 1: // Collect & Deploy
        if (action.type === 'collect_energy' || action.type === 'deploy_mods' || action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 2: // Build & Hire  
        if (action.type === 'hire_commander' || action.type === 'build_station' || action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 3: // Buy Cards
        if (action.type === 'buy_card' || action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 4: // Play Cards
        if (action.type === 'play_card' || action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 5: // Invade
        if (action.type === 'attack_territory' || action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 6: // Fortify
        if (action.type === 'fortify_territory' || action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
    }
    
    if (phaseCompleted) {
      console.log(`✅ ${currentPlayer.name} completed Phase ${this.gameState.currentPhase}`)
      
      if (this.gameState.currentPhase === 6) {
        console.log(`🎯 ${currentPlayer.name} completed all phases - advancing to next player`)
        this.advanceToNextMainGamePlayer()
        shouldAdvanceTurn = true
      } else {
        this.gameState.currentPhase = (this.gameState.currentPhase + 1) as any
        const phaseInfo = GAME_CONFIG.PLAYER_PHASES[this.gameState.currentPhase]
        console.log(`📋 ${currentPlayer.name} advanced to Phase ${this.gameState.currentPhase}: ${phaseInfo.name}`)
        shouldAdvancePhase = true
      }
    }

    if (shouldAdvancePhase || shouldAdvanceTurn) {
      console.log(`📡 Broadcasting state update after main game progression`)
      this.broadcast({ type: 'state_update', state: this.gameState })
      
      const newCurrentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
      if (newCurrentPlayer && globalAIController.isAIPlayer(newCurrentPlayer.id)) {
        console.log(`🤖 Scheduling AI turn for ${newCurrentPlayer.name}`)
        setTimeout(() => {
          this.doAIMainGameAction()
        }, 1000)
      }
    }
  }

  // Update your doAIBiddingAction to use the reducer instead:
  // Updated doAIBiddingAction with better error handling and logging
  private doAIBiddingAction(playerId: string): void {
    console.log(`🤖 doAIBiddingAction called for player: ${playerId}`)
    
    if (!this.gameState) {
      console.log(`🤖 ABORT: No game state`)
      return
    }
    
    // ✅ CRITICAL SAFEGUARD: Don't run bidding AI if no longer in bidding
    if (this.gameState.status !== 'bidding') {
      console.log(`🤖 SAFEGUARD: Attempted to run bidding AI but game status is '${this.gameState.status}' - ABORTING`)
      return
    }
    
    // Find the specific player by ID instead of using currentPlayerIndex
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) {
      console.log(`🤖 SAFEGUARD: Player ${playerId} not found - ABORTING`)
      return
    }
    
    if (!globalAIController.isAIPlayer(player.id)) {
      console.log(`🤖 SAFEGUARD: Player ${playerId} is not an AI player - ABORTING`)
      return
    }

    // Check if player has already bid
    if (this.gameState.bidding?.bidsSubmitted[playerId] !== undefined) {
      console.log(`🤖 SAFEGUARD: Player ${player.name} has already bid - ABORTING`)
      return
    }

    // Check if player is still in waiting list
    if (!this.gameState.bidding?.playersWaitingToBid?.includes(playerId)) {
      console.log(`🤖 SAFEGUARD: Player ${player.name} is not in waiting list - ABORTING`)
      return
    }
    
    // ✅ FIXED: Clear any existing timeout for this player to prevent overlaps
    if (this.aiTurnTimeouts.has(player.id)) {
      clearTimeout(this.aiTurnTimeouts.get(player.id))
      this.aiTurnTimeouts.delete(player.id)
    }
    
    console.log(`🤖 AI Bidding Action - Status: ${this.gameState.status}, Year: ${this.gameState.bidding?.year}, Player: ${player.name}`)
    console.log(`🤖 Player energy: ${player.energy}, Already bid: ${this.gameState.bidding?.bidsSubmitted[playerId] || 'none'}`)
    
    // Simple AI bidding strategy: 20-40% of available energy
    const minBidPercent = 0.20
    const maxBidPercent = 0.40
    const randomPercent = minBidPercent + (Math.random() * (maxBidPercent - minBidPercent))
    const bidAmount = Math.floor(player.energy * randomPercent)
    
    console.log(`🤖 AI ${player.name} calculating bid: ${bidAmount} energy (${Math.round(randomPercent * 100)}% of ${player.energy})`)
    
    // Add immediate validation before timeout
    if (bidAmount > player.energy) {
      console.log(`🤖 ERROR: Bid amount ${bidAmount} exceeds player energy ${player.energy}`)
      return
    }
    
    setTimeout(async () => {
      console.log(`🤖 AI ${player.name} attempting to place bid...`)
      
      // Double-check state before placing bid
      if (!this.gameState || this.gameState.status !== 'bidding') {
        console.log(`🤖 TIMEOUT ABORT: Game state changed`)
        return
      }

      // Check if player still needs to bid
      if (this.gameState.bidding?.bidsSubmitted[playerId] !== undefined) {
        console.log(`🤖 TIMEOUT ABORT: Player already bid`)
        return
      }
      
      try {
        // ✅ FIXED: Use the reducer through applyAction
        await this.applyAction({
          type: 'place_bid',
          playerId: player.id,
          data: { bidAmount }
        })
        
        console.log(`✅ AI ${player.name} successfully placed bid: ${bidAmount}`)
        
      } catch (error) {
        console.error(`❌ AI bidding error for ${player.name}:`, error)
      }
      
    }, this.AI_TURN_SPEED_MS)
  }

  private checkAndTriggerAIBidding(): void {
    if (!this.gameState || this.gameState.status !== 'bidding') return

    console.log(`🔍 Checking AI bidding state...`)
    console.log(`📊 Bidding state:`, {
      year: this.gameState.bidding?.year,
      playersWaitingToBid: this.gameState.bidding?.playersWaitingToBid,
      bidsSubmitted: this.gameState.bidding?.bidsSubmitted,
      bidsRevealed: this.gameState.bidding?.bidsRevealed
    })

    if (!this.gameState.bidding || this.gameState.bidding.bidsRevealed) {
      console.log(`🤖 Bidding already revealed or no bidding state - skipping AI`)
      return
    }

    // Find AI players who haven't bid yet
    const waitingToBid = this.gameState.bidding.playersWaitingToBid || []
    const aiPlayersNeedingToBid = waitingToBid.filter(playerId => 
      globalAIController.isAIPlayer(playerId)
    )

    console.log(`🤖 AI players needing to bid:`, aiPlayersNeedingToBid.map(id => 
      this.gameState?.players.find(p => p.id === id)?.name
    ))

    if (aiPlayersNeedingToBid.length === 0) {
      console.log(`🤖 No AI players need to bid`)
      return
    }

    // Clear any existing AI timeouts to prevent conflicts
    this.aiTurnTimeouts.forEach((timeout, playerId) => {
      if (aiPlayersNeedingToBid.includes(playerId)) {
        clearTimeout(timeout)
        this.aiTurnTimeouts.delete(playerId)
      }
    })

    // Schedule immediate bidding for all AI players
    aiPlayersNeedingToBid.forEach((playerId, index) => {
      const player = this.gameState?.players.find(p => p.id === playerId)
      if (player) {
        console.log(`🤖 Scheduling AI bid for ${player.name} (delay: ${200 + index * 100}ms)`)
        
        const timeoutId = setTimeout(() => {
          this.doAIBiddingAction(playerId)
        }, 200 + (index * 100)) // Stagger slightly to avoid conflicts
        
        this.aiTurnTimeouts.set(playerId, timeoutId)
      }
    })
  }

  private advanceToNextMainGamePlayer(): void {
    if (!this.gameState) return
    
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    const currentTurnIndex = this.gameState.activeTurnOrder.indexOf(currentPlayer.id)
    
    const nextTurnIndex = (currentTurnIndex + 1) % this.gameState.activeTurnOrder.length
    
    if (nextTurnIndex === 0) {
      console.log(`🔄 All players completed Turn ${this.gameState.currentYear} - advancing to next turn`)
      this.advanceMainGameTurn()
    } else {
      const nextPlayerId = this.gameState.activeTurnOrder[nextTurnIndex]
      const nextPlayerIndex = this.gameState.players.findIndex(p => p.id === nextPlayerId)
      
      this.gameState.players[this.gameState.currentPlayerIndex].isActive = false
      this.gameState.currentPlayerIndex = nextPlayerIndex
      this.gameState.players[nextPlayerIndex].isActive = true
      this.gameState.currentPhase = 1
      
      const nextPlayer = this.gameState.players[nextPlayerIndex]
      console.log(`🔄 Turn advanced to: ${nextPlayer.name} - Phase 1`)
    }
  }

  // ✅ FIXED: advanceMainGameTurn() method in gameDurableObject.ts
  // Replace your current advanceMainGameTurn() method with this:
  private advanceMainGameTurn(): void {
    if (!this.gameState) return
    
    if (this.gameState.currentYear >= 5) {
      this.gameState.status = 'finished'
      console.log('🏁 Game finished after 5 turns!')
      return
    }
    
    this.gameState.currentYear = (this.gameState.currentYear + 1) as any
    this.gameState.currentPhase = 1
    
    const firstPlayerId = this.gameState.activeTurnOrder[0]
    const firstPlayerIndex = this.gameState.players.findIndex(p => p.id === firstPlayerId)
    
    this.gameState.players.forEach(p => p.isActive = false)
    this.gameState.currentPlayerIndex = firstPlayerIndex
    this.gameState.players[firstPlayerIndex].isActive = true
    
    // ✅ FIXED: Only auto-collect energy for AI players
    // Human players will manually collect energy in Phase 1 via CollectDeployOverlay
    this.gameState.activeTurnOrder.forEach(playerId => {
      const player = this.gameState?.players.find(p => p.id === playerId)
      if (player && globalAIController.isAIPlayer(player.id)) {
        const income = this.calculateTurnIncome(player, this.gameState!)
        player.energy += income
        console.log(`💰 ${player.name} auto-collected ${income} energy (AI)`)
      } else if (player) {
        console.log(`⏳ ${player.name} will manually collect energy in Phase 1 (Human)`)
      }
    })
    
    const firstPlayer = this.gameState.players[firstPlayerIndex]
    console.log(`🎯 Turn ${this.gameState.currentYear} begins! ${firstPlayer.name} starts Phase 1`)
    
    // ✅ NEW: If first player is human, they need to manually collect energy
    if (!globalAIController.isAIPlayer(firstPlayer.id)) {
      console.log(`👤 ${firstPlayer.name} is human - CollectDeployOverlay should appear`)
    }
  }

  private doAIMainGameAction(): void {
    if (!this.gameState) return
    
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return
    
    console.log(`🤖 AI ${currentPlayer.name} doing Phase ${this.gameState.currentPhase} action`)
    
    switch (this.gameState.currentPhase) {
      case 1: this.doAICollectAndDeploy(); break
      case 2: this.doAIBuildAndHire(); break
      case 3: this.doAIBuyCards(); break
      case 4: this.doAIPlayCards(); break
      case 5: this.doAIInvade(); break
      case 6: this.doAIFortify(); break
    }
  }

  private doAICollectAndDeploy(): void {
    if (!this.gameState) return
    
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return
    
    console.log(`🤖 AI ${currentPlayer.name} doing Collect & Deploy phase`)
    
    // ✅ Step 1: Calculate income and units (fresh calculation at start of turn)
    const energyIncome = this.calculateTurnIncome(currentPlayer, this.gameState)
    const unitsToPlace = this.calculateUnitsToPlace(currentPlayer, this.gameState)
    
    console.log(`🤖 AI ${currentPlayer.name} will collect ${energyIncome} energy and place ${unitsToPlace} units`)
    
    setTimeout(async () => {
      if (!this.gameState || this.gameState.status !== 'playing') return
      
      // ✅ Step 2: Collect energy and start deployment
      console.log(`🤖 AI collecting energy and starting deployment`)
      await this.applyAction({
        type: 'collect_energy',
        playerId: currentPlayer.id,
        data: { amount: energyIncome, unitsToPlace }
      })
      
      // ✅ Step 3: Place units one by one
      this.doAIUnitPlacement(currentPlayer.id, unitsToPlace)
      
    }, this.AI_TURN_SPEED_MS)
  }

  // ✅ NEW: Calculate total units to place (base + space base bonuses)
  private calculateUnitsToPlace(player: Player, gameState: GameState): number {
    const baseUnits = this.calculateTurnIncome(player, gameState) // Same as energy income
    
    // ✅ Count space bases owned by this player
    const spaceBaseBonusUnits = player.territories.filter(tId => {
      const territory = gameState.territories[tId]
      return territory?.spaceBase === player.id
    }).length
    
    return baseUnits + spaceBaseBonusUnits
  }

  // ✅ ENHANCED: AI unit placement with proper completion
  private doAIUnitPlacement(playerId: string, totalUnitsToPlace: number): void {
    if (!this.gameState) return
    
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player || !globalAIController.isAIPlayer(player.id)) return
    
    const playerTerritories = player.territories.filter(tId => 
      this.gameState?.territories[tId]?.ownerId === player.id
    )
    
    if (playerTerritories.length === 0) {
      console.log(`🤖 ${player.name} has no territories to place units on`)
      return
    }
    
    let unitsPlaced = 0
    
    const placeNextUnit = async () => {
      if (!this.gameState || this.gameState.status !== 'playing') {
        console.log(`🤖 Game state changed, stopping AI placement`)
        return
      }
      
      if (unitsPlaced >= totalUnitsToPlace) {
        // ✅ All units placed - confirm deployment complete
        console.log(`🤖 AI ${player.name} completed unit placement, confirming deployment`)
        setTimeout(async () => {
          if (this.gameState?.status === 'playing') {
            await this.applyAction({
              type: 'advance_player_phase',
              playerId: player.id,
              data: { deploymentComplete: true }
            })
          }
        }, this.AI_TURN_SPEED_MS)
        return
      }
      
      // ✅ Pick random territory to place unit on
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)]
      
      console.log(`🤖 AI placing unit ${unitsPlaced + 1}/${totalUnitsToPlace} on territory ${randomTerritory}`)
      
      try {
        await this.applyAction({
          type: 'place_unit',
          playerId: player.id,
          data: { territoryId: randomTerritory, count: 1 }
        })
        
        unitsPlaced++
        
        // ✅ Continue to next unit after delay
        setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS)
        
      } catch (error) {
        console.error(`🤖 AI unit placement error:`, error)
      }
    }
    
    // ✅ Start placing units
    setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS)
  }

  private doAIBuildAndHire(): void {
    setTimeout(() => {
      if (this.gameState) {
        this.handleMainGamePhaseProgression({ type: 'advance_player_phase', playerId: this.gameState.players[this.gameState.currentPlayerIndex].id })
      }
    }, this.AI_TURN_SPEED_MS)
  }

  private doAIBuyCards(): void {
    setTimeout(() => {
      if (this.gameState) {
        this.handleMainGamePhaseProgression({ type: 'advance_player_phase', playerId: this.gameState.players[this.gameState.currentPlayerIndex].id })
      }
    }, this.AI_TURN_SPEED_MS)
  }

  private doAIPlayCards(): void {
    setTimeout(() => {
      if (this.gameState) {
        this.handleMainGamePhaseProgression({ type: 'advance_player_phase', playerId: this.gameState.players[this.gameState.currentPlayerIndex].id })
      }
    }, this.AI_TURN_SPEED_MS)
  }

  private doAIInvade(): void {
    setTimeout(() => {
      if (this.gameState) {
        this.handleMainGamePhaseProgression({ type: 'advance_player_phase', playerId: this.gameState.players[this.gameState.currentPlayerIndex].id })
      }
    }, this.AI_TURN_SPEED_MS)
  }

  private doAIFortify(): void {
    setTimeout(() => {
      if (this.gameState) {
        this.handleMainGamePhaseProgression({ type: 'advance_player_phase', playerId: this.gameState.players[this.gameState.currentPlayerIndex].id })
      }
    }, this.AI_TURN_SPEED_MS)
  }

  // ✅ CLEANED UP - Uses extracted orchestrateAISetupAction
  private doAISetupAction(): void {
    if (!this.gameState) return
    
    // ✅ CRITICAL SAFEGUARD: Don't run setup AI if no longer in setup
    if (this.gameState.status !== 'setup') {
      console.log(`🤖 SAFEGUARD: Attempted to run setup AI but game status is '${this.gameState.status}' - ABORTING`)
      return
    }
    
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return
    
    // ✅ FIXED: Clear any existing timeout for this player to prevent overlaps
    if (this.aiTurnTimeouts.has(currentPlayer.id)) {
      clearTimeout(this.aiTurnTimeouts.get(currentPlayer.id))
      this.aiTurnTimeouts.delete(currentPlayer.id)
    }
    
    console.log(`🤖 AI Setup Action - Status: ${this.gameState.status}, Phase: ${this.gameState.setupPhase}, Player: ${currentPlayer.name}`)
    
    orchestrateAISetupAction(
      this.gameState,
      (updatedState) => {
        this.broadcast({ type: 'state_update', state: updatedState })
      },
      (actionData) => {
        this.handleSetupProgression(actionData)
      }
    )
  }

  private startMainGame(gameState: GameState): GameState {
    const newState = { ...gameState }
    
    console.log(`🎮 Starting main game with turn cycle!`)
    
    newState.status = 'playing'
    newState.currentYear = 1
    newState.currentPhase = 1
    
    const firstPlayerId = newState.activeTurnOrder[0]
    const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
    
    newState.currentPlayerIndex = firstPlayerIndex
    newState.players.forEach(p => p.isActive = false)
    newState.players[firstPlayerIndex].isActive = true
    
    console.log(`🎯 Turn 1, Phase 1: ${newState.players[firstPlayerIndex].name} starts`)
    
    return newState
  }

  // ✅ ENHANCED: advancePlayerPhase to handle deployment completion
  private advancePlayerPhase(gameState: GameState, action: GameAction): GameState {
    const newState = { ...gameState }
    
    if (newState.status !== 'playing') {
      console.log('❌ Cannot advance phase - not in playing mode')
      return newState
    }
    
    const player = newState.players.find(p => p.id === action.playerId)
    const currentPlayer = newState.players[newState.currentPlayerIndex]
    
    if (!player || player.id !== currentPlayer.id) {
      console.log('❌ Cannot advance phase - not current player')
      return newState
    }
    
    // ✅ ENHANCED: Check deployment completion for Phase 1
    if (newState.currentPhase === 1 && action.data?.deploymentComplete) {
      const unitsToPlace = player.unitsToPlaceThisTurn || 0
      const unitsPlaced = player.unitsPlacedThisTurn || 0
      
      if (unitsPlaced < unitsToPlace) {
        console.log(`❌ Cannot advance - must place all units (${unitsPlaced}/${unitsToPlace})`)
        return newState
      }
      
      // ✅ Reset placement counters
      player.unitsToPlaceThisTurn = 0
      player.unitsPlacedThisTurn = 0
    }
    
    if (newState.currentPhase === 6) {
      console.log(`✅ ${currentPlayer.name} completed all 6 phases`)
      return this.advanceToNextPlayer(newState)
    } else {
      newState.currentPhase = (newState.currentPhase + 1) as any
      const phaseInfo = GAME_CONFIG.PLAYER_PHASES[newState.currentPhase]
      
      console.log(`📋 ${currentPlayer.name} advanced to Phase ${newState.currentPhase}: ${phaseInfo.name}`)
    }
    
    return newState
  }

  private advanceToNextPlayer(gameState: GameState): GameState {
    const newState = { ...gameState }
    
    const currentPlayer = newState.players[newState.currentPlayerIndex]
    const currentTurnIndex = newState.activeTurnOrder.indexOf(currentPlayer.id)
    
    const nextTurnIndex = (currentTurnIndex + 1) % newState.activeTurnOrder.length
    
    if (nextTurnIndex === 0) {
      return this.advanceGameTurn(newState)
    }
    
    const nextPlayerId = newState.activeTurnOrder[nextTurnIndex]
    const nextPlayerIndex = newState.players.findIndex(p => p.id === nextPlayerId)
    
    newState.players[newState.currentPlayerIndex].isActive = false
    newState.currentPlayerIndex = nextPlayerIndex
    newState.players[nextPlayerIndex].isActive = true
    newState.currentPhase = 1
    
    const nextPlayer = newState.players[nextPlayerIndex]
    console.log(`🔄 ${nextPlayer.name}'s turn → Phase 1: ${GAME_CONFIG.PLAYER_PHASES[1].name}`)
    
    return newState
  }

  private advanceGameTurn(gameState: GameState): GameState {
    const newState = { ...gameState }
    
    if (newState.currentYear >= 5) {
      newState.status = 'finished'
      console.log('🏁 Game finished after 5 turns!')
      return newState
    }
    
    newState.currentYear = (newState.currentYear + 1) as any
    newState.currentPhase = 1
    
    const firstPlayerId = newState.activeTurnOrder[0]
    const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
    
    newState.players.forEach(p => p.isActive = false)
    newState.currentPlayerIndex = firstPlayerIndex
    newState.players[firstPlayerIndex].isActive = true
    
    newState.activeTurnOrder.forEach(playerId => {
      const player = newState.players.find(p => p.id === playerId)
      if (player && globalAIController.isAIPlayer(player.id)) {
        const income = this.calculateTurnIncome(player, newState!)
        player.energy += income
        console.log(`💰 ${player.name} auto-collected ${income} energy`)
      }
    })
    
    const firstPlayer = newState.players[firstPlayerIndex]
    console.log(`🎯 Turn ${newState.currentYear} begins! ${firstPlayer.name} starts Phase 1`)
    
    return newState
  }

  // ✅ ENHANCED: calculateTurnIncome to include space base bonuses
  private calculateTurnIncome(player: Player, gameState: GameState): number {
    const baseIncome = 3 // Minimum
    const territoryIncome = Math.floor(player.territories.length / 3) // 1 per 3 territories
    
    // ✅ ADD: Continental bonuses (expand based on your continent logic)
    let continentalBonus = 0
    // TODO: Add your continent control logic here
    
    return Math.max(baseIncome, territoryIncome + continentalBonus)
  }

  

  async restartGame(data: { player1Id: string, player2Id: string, nukeCount: number }): Promise<GameState> {
    const gameId = this.ctx.id.toString()
    
    this.gameState = setupNewGame(gameId, data.player1Id, data.player2Id, data.nukeCount)
    this.gameState.setupPhase = 'units'
    
    await this.initializeAIPlayers(this.gameState)
    await this.persist()
    
    this.broadcast({ 
      type: 'game_restarted', 
      state: this.gameState,
      nukedTerritories: this.gameState.actions[0]?.data?.nukedTerritories || []
    })
    
    const firstPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    if (firstPlayer && globalAIController.isAIPlayer(firstPlayer.id)) {
      console.log('🤖 First player is AI, starting AI setup immediately')
      this.doAISetupAction()
    }
    
    console.log('✅ Game restarted successfully with AI players')
    return this.gameState
  }

  async initializeAIPlayers(gameState: GameState): Promise<void> {
    gameState.players.forEach(player => {
      if (player.name === 'AI Player') {
        globalAIController.addAIPlayer(player.id, 'medium')
        console.log(`🤖 Initialized AI player: ${player.id}`)
      }
    })
  }

  // ✅ ALL YOUR ORIGINAL GAME LOGIC PRESERVED
  // ✅ ENHANCED: Update placeUnit to track deployment progress
  private placeUnit(gameState: GameState, action: GameAction): GameState {
    const { territoryId, count } = action.data
    let newState = { ...gameState }
    
    const territory = newState.territories[territoryId]
    const player = newState.players.find(p => p.id === action.playerId)
    const currentPlayer = newState.players[newState.currentPlayerIndex]
    
    if (!territory || !player) {
      console.log(`❌ Invalid territory or player`)
      return newState
    }
    
    if (territory.ownerId !== action.playerId) {
      console.log(`❌ Player doesn't own territory`)
      return newState
    }
    
    if (count !== 1) {
      console.log(`❌ Can only place 1 unit at a time`)
      return newState
    }
    
    // ✅ ENHANCED: Check both setup and playing mode placement limits
    if (newState.status === 'setup') {
      if ((player.remainingUnitsToPlace || 0) <= 0) {
        console.log(`❌ Player has no units left to place (setup)`)
        return newState
      }
      
      if (currentPlayer.id !== action.playerId) {
        console.log(`❌ ${player.name} tried to place unit but it's ${currentPlayer.name}'s turn`)
        return newState
      }
      
      const currentUnitsPlaced = player.unitsPlacedThisTurn || 0
      if (newState.setupPhase === 'units' && currentUnitsPlaced >= 3) {
        console.log(`❌ ${player.name} has already placed 3 units this turn`)
        return newState
      }
    } else if (newState.status === 'playing') {
      // ✅ PLAYING MODE: Check against unitsToPlaceThisTurn
      const unitsToPlace = player.unitsToPlaceThisTurn || 0
      const unitsPlaced = player.unitsPlacedThisTurn || 0
      
      if (unitsPlaced >= unitsToPlace) {
        console.log(`❌ ${player.name} has already placed all units this turn (${unitsPlaced}/${unitsToPlace})`)
        return newState
      }
      
      if (currentPlayer.id !== action.playerId) {
        console.log(`❌ ${player.name} tried to place unit but it's ${currentPlayer.name}'s turn`)
        return newState
      }
    }
    
    // ✅ Place the unit
    territory.machineCount += 1
    
    // ✅ Update counters based on game mode
    if (newState.status === 'setup') {
      player.remainingUnitsToPlace = (player.remainingUnitsToPlace || 0) - 1
      player.unitsPlacedThisTurn = (player.unitsPlacedThisTurn || 0) + 1
      console.log(`✅ ${player.name} placed unit on ${territory.name} (${player.unitsPlacedThisTurn}/3 this turn, ${player.remainingUnitsToPlace} remaining)`)
    } else if (newState.status === 'playing') {
      player.unitsPlacedThisTurn = (player.unitsPlacedThisTurn || 0) + 1
      const unitsToPlace = player.unitsToPlaceThisTurn || 0
      console.log(`✅ ${player.name} placed unit on ${territory.name} (${player.unitsPlacedThisTurn}/${unitsToPlace} this turn)`)
    }
    
    return newState
  }

  private placeCommander(gameState: GameState, action: GameAction): GameState {
    const { territoryId, commanderType } = action.data
    const newState = { ...gameState }
    
    const territory = newState.territories[territoryId]
    const player = newState.players.find(p => p.id === action.playerId)
    const currentPlayer = newState.players[newState.currentPlayerIndex]
    
    if (!territory || !player || territory.ownerId !== action.playerId) {
      return newState
    }
    
    if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
      console.log(`❌ ${player.name} tried to place commander but it's ${currentPlayer.name}'s turn`)
      return newState
    }
    
    if (commanderType === 'land') {
      territory.landCommander = action.playerId
      console.log(`📍 ${player.name} placed Land Commander on ${territory.name}`)
    } else if (commanderType === 'diplomat') {
      territory.diplomatCommander = action.playerId
      console.log(`📍 ${player.name} placed Diplomat Commander on ${territory.name}`)
    }
    
    return newState
  }

  private placeSpaceBase(gameState: GameState, action: GameAction): GameState {
    const { territoryId } = action.data
    const newState = { ...gameState }
    
    const territory = newState.territories[territoryId]
    const player = newState.players.find(p => p.id === action.playerId)
    const currentPlayer = newState.players[newState.currentPlayerIndex]
    
    if (!territory || !player || territory.ownerId !== action.playerId) {
      return newState
    }
    
    if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
      console.log(`❌ ${player.name} tried to place space base but it's ${currentPlayer.name}'s turn`)
      return newState
    }
    
    territory.spaceBase = action.playerId
    console.log(`🚀 ${player.name} placed Space Base on ${territory.name}`)
    
    return newState
  }

  // The issue is in your collectEnergy method in gameDurableObject.ts
  // It's immediately calling confirmDeploymentComplete instead of waiting for unit placement
  // ✅ FIX: Update your collectEnergy method to NOT auto-advance:
  private collectEnergy(gameState: GameState, action: GameAction): GameState {
    console.log('🎯 collectEnergy method called with:', {
      actionType: action.type,
      playerId: action.playerId,
      actionData: action.data
    })
    
    const { amount, unitsToPlace } = action.data
    const newState = { ...gameState }
    const player = newState.players.find(p => p.id === action.playerId)
    
    if (!player) {
      console.log('❌ Player not found:', action.playerId)
      return newState
    }
    
    // Calculate income fresh at start of turn
    const actualIncome = this.calculateTurnIncome(player, newState)
    const energyToAdd = amount || actualIncome
    
    player.energy += energyToAdd
    
    // ✅ CRITICAL DEBUG: Log what's happening with unit placement
    console.log('🎯 Setting up unit placement:', {
      unitsToPlace,
      playerBefore: {
        unitsToPlaceThisTurn: player.unitsToPlaceThisTurn,
        unitsPlacedThisTurn: player.unitsPlacedThisTurn
      }
    })
    
    if (unitsToPlace !== undefined) {
      player.unitsToPlaceThisTurn = unitsToPlace
      player.unitsPlacedThisTurn = 0
      
      console.log('🎯 Unit placement set up:', {
        unitsToPlaceThisTurn: player.unitsToPlaceThisTurn,
        unitsPlacedThisTurn: player.unitsPlacedThisTurn
      })
    } else {
      console.log('❌ unitsToPlace is undefined! This is the problem!')
    }
    
    console.log(`⚡ ${player.name} collected ${energyToAdd} energy (${player.energy} total)`)
    if (unitsToPlace) {
      console.log(`📍 ${player.name} will place ${unitsToPlace} units this turn`)
    }
    
    return newState
  }

  private spendEnergy(gameState: GameState, action: GameAction): GameState {
    const { amount } = action.data
    const newState = { ...gameState }
    const player = newState.players.find(p => p.id === action.playerId)
    
    if (!player || player.energy < amount) {
      console.log(`❌ Player ${action.playerId} doesn't have enough energy`)
      return newState
    }
    
    player.energy -= amount
    console.log(`⚡ ${player.name} spent ${amount} energy (${player.energy} remaining)`)
    
    return newState
  }

  // Also update your placeBid method to ensure proper waiting list management:
  private placeBid(gameState: GameState, action: GameAction): GameState {
    const { bidAmount } = action.data
    const newState = { ...gameState }
    
    if (newState.status !== 'bidding' || !newState.bidding) {
      console.log(`❌ Cannot place bid - game not in bidding state`)
      return newState
    }
    
    const player = newState.players.find(p => p.id === action.playerId)
    if (!player) {
      console.log(`❌ Player not found: ${action.playerId}`)
      return newState
    }
    
    // ✅ CHECK: Don't allow duplicate bids
    if (newState.bidding.bidsSubmitted[action.playerId] !== undefined) {
      console.log(`❌ Player ${player.name} has already bid`)
      return newState
    }
    
    if (bidAmount > player.energy) {
      console.log(`❌ Bid amount ${bidAmount} exceeds player energy ${player.energy}`)
      return newState
    }
    
    if (bidAmount < 0) {
      console.log(`❌ Invalid bid amount: ${bidAmount}`)
      return newState
    }
    
    // Record the bid
    newState.bidding.bidsSubmitted[action.playerId] = bidAmount
    player.currentBid = bidAmount
    
    // ✅ FIX: Ensure player is removed from waiting list
    newState.bidding.playersWaitingToBid = 
      (newState.bidding.playersWaitingToBid || []).filter(id => id !== action.playerId)
    
    console.log(`💰 ${player.name} placed bid: ${bidAmount} energy`)
    console.log(`📊 Updated waiting list:`, newState.bidding.playersWaitingToBid)
    console.log(`📊 Total bids: ${Object.keys(newState.bidding.bidsSubmitted).length}`)
    
    return newState
  }

  // ✅ ALSO ADD: Debug method to manually trigger reveal (for testing)
  private async debugTriggerReveal(): Promise<void> {
    if (this.gameState?.status === 'bidding' && !this.gameState.bidding?.bidsRevealed) {
      console.log('🐛 DEBUG: Manually triggering bid reveal')
      await this.applyAction({
        type: 'reveal_bids',
        playerId: 'system',
        data: {}
      })
    }
  }

  // Update revealBids to only process bidding players:
  private revealBids(gameState: GameState): GameState {
    const newState = { ...gameState }
    
    if (newState.status !== 'bidding' || !newState.bidding) {
      return newState
    }
    
    newState.bidding.bidsRevealed = true
    
    const bids = newState.bidding.bidsSubmitted
    
    // ✅ FIX: Only consider bidding players for turn order
    const biddingPlayers = this.getBiddingPlayers()
    const playerIds = biddingPlayers.map(p => p.id).filter(id => id in bids)
    
    if (playerIds.length === 0) {
      console.log('❌ No valid bids found!')
      return newState
    }
    
    const bidAmounts = playerIds.map(id => bids[id])
    const maxBid = Math.max(...bidAmounts)
    
    // Find all players with the highest bid
    const winners = playerIds.filter(playerId => bids[playerId] === maxBid)
    
    if (winners.length === 1) {
      // Single winner
      newState.bidding.highestBidder = winners[0]
      newState.bidding.finalTurnOrder = [
        winners[0],
        ...playerIds.filter(id => id !== winners[0])
      ]
      console.log(`🏆 Bidding winner: ${newState.players.find(p => p.id === winners[0])?.name} with ${maxBid} energy`)
    } else {
      // Tie - need dice roll
      console.log(`🎲 Tie between ${winners.length} players - rolling dice...`)
      const tiebreakRolls: Record<string, number> = {}
      let highestRoll = 0
      let rollWinner = winners[0]
      
      winners.forEach(playerId => {
        const roll = Math.floor(Math.random() * 20) + 1
        tiebreakRolls[playerId] = roll
        if (roll > highestRoll) {
          highestRoll = roll
          rollWinner = playerId
        }
      })
      
      newState.bidding.tiebreakRoll = tiebreakRolls
      newState.bidding.highestBidder = rollWinner
      newState.bidding.finalTurnOrder = [
        rollWinner,
        ...playerIds.filter(id => id !== rollWinner)
      ]
      
      console.log(`🎲 Tiebreak results:`, tiebreakRolls)
      console.log(`🏆 Winner: ${newState.players.find(p => p.id === rollWinner)?.name}`)
    }
    
    // Deduct energy from all bidding players
    playerIds.forEach(playerId => {
      const player = newState.players.find(p => p.id === playerId)
      if (player) {
        const bidAmount = bids[playerId]
        player.energy -= bidAmount
        player.totalEnergySpentOnBids = (player.totalEnergySpentOnBids || 0) + bidAmount
        console.log(`💸 ${player.name} spent ${bidAmount} energy (${player.energy} remaining)`)
      }
    })
    
    // ✅ FIX: Set turn order to only include bidding players
    if (!newState.yearlyTurnOrders) {
      newState.yearlyTurnOrders = {}
    }
    newState.yearlyTurnOrders[newState.bidding.year] = newState.bidding.finalTurnOrder
    newState.activeTurnOrder = newState.bidding.finalTurnOrder
    
    return newState
  }

  private startYearTurns(gameState: GameState): GameState {
    const newState = { ...gameState }
    
    if (newState.status !== 'bidding' || !newState.bidding) {
      return newState
    }
    
    const year = newState.bidding.year
    const winnerOrder = newState.bidding.finalTurnOrder || []
    
    console.log(`🎮 Starting main game for Year ${year}`)
    
    // Transition to playing
    newState.status = 'playing'
    newState.currentYear = year as any
    newState.currentPhase = 1
    
    // Set first player (bidding winner) as active
    if (winnerOrder.length > 0) {
      const firstPlayerId = winnerOrder[0]
      const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
      newState.currentPlayerIndex = firstPlayerIndex
      newState.players.forEach(p => p.isActive = false)
      newState.players[firstPlayerIndex].isActive = true
    }
    
    // Clear bidding state
    newState.bidding = undefined
    
    console.log(`🎯 Year ${year} begins! ${newState.players[newState.currentPlayerIndex].name} starts Phase 1`)
    
    return newState
  }

  // ✅ YOUR COMPLETE ORIGINAL REDUCER
  private reduceAction(gameState: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'advance_phase':
        return this.advancePhase(gameState)
      case 'advance_turn':
        return this.advanceTurn(gameState)
      case 'player_decision':
        return this.handlePlayerDecision(gameState, action)
      case 'deploy_machines':
        return this.deployMachines(gameState, action)
      case 'place_unit':
        return this.placeUnit(gameState, action)
      case 'place_commander':
        return this.placeCommander(gameState, action)
      case 'place_space_base':
        return this.placeSpaceBase(gameState, action)
      case 'collect_energy':
        return this.collectEnergy(gameState, action)
      case 'spend_energy':
        return this.spendEnergy(gameState, action)
      case 'advance_player_phase':
        return this.advancePlayerPhase(gameState, action)
      case 'start_main_game':
        return this.startMainGame(gameState)
      case 'attack_territory':
        return this.attackTerritory(gameState, action)
      case 'fortify_territory':
        return this.fortifyTerritory(gameState, action)
      case 'play_card':
        return this.playCard(gameState, action)
      case 'place_bid':
        return this.placeBid(gameState, action)
      case 'reveal_bids':
        return this.revealBids(gameState)
      case 'start_year_turns':
        return this.startYearTurns(gameState)
      default:
        console.warn(`Unknown action type: ${action.type}`)
        return gameState
    }
  }

  private advancePhase(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    if (newState.currentPhase === 7) {
      return this.advanceTurn(newState);
    } else {
      newState.currentPhase = (newState.currentPhase + 1) as any;
      newState.players = newState.players.map(p => ({
        ...p,
        pendingDecision: undefined
      }));

      if (newState.currentPhase === 2) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        newState.players[newState.currentPlayerIndex].isActive = true;
      }
    }
    
    return newState;
  }

  private advanceTurn(gameState: GameState): GameState {
    const newState = { ...gameState }
    
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length
    
    if (newState.currentPlayerIndex === 0) {
      newState.currentYear += 1
      
      if (newState.currentYear > GAME_CONFIG.SETUP_MAX_GAME_YEARS) {
        newState.status = 'finished'
        return newState
      }
    }
    
    newState.currentPhase = 1
    
    newState.players = newState.players.map(p => ({
      ...p,
      pendingDecision: undefined,
      isActive: false
    }))
    
    newState.players[newState.currentPlayerIndex].isActive = true
    
    return newState
  }

  private handlePlayerDecision(gameState: GameState, action: GameAction): GameState {
    const newState = { ...gameState }
    const player = newState.players.find(p => p.id === action.playerId)
    
    if (!player?.pendingDecision) {
      return newState
    }
    
    switch (player.pendingDecision.type) {
      case 'select_territory':
        const { territoryId } = action.data.decision
        if (territoryId && newState.territories[territoryId]) {
          if (!player.territories.includes(territoryId)) {
            player.territories.push(territoryId)
            newState.territories[territoryId].ownerId = player.id
          }
        }
        break
      case 'play_card':
        break
    }
    
    player.pendingDecision = undefined
    
    return newState
  }

  private deployMachines(gameState: GameState, action: GameAction): GameState {
    const { territoryId, count } = action.data
    const newState = { ...gameState }
    
    if (newState.territories[territoryId]) {
      newState.territories[territoryId].machineCount += count
    }
    
    return newState
  }

  private attackTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, attackingUnits } = action.data
    const newState = { ...gameState }
    
    const fromTerritory = newState.territories[fromTerritoryId]
    const toTerritory = newState.territories[toTerritoryId]
    
    if (!fromTerritory || !toTerritory) {
      console.warn('Invalid territories for attack')
      return newState
    }
    
    if (fromTerritory.ownerId !== action.playerId) {
      console.warn(`Player ${action.playerId} does not own attacking territory`)
      return newState
    }
    
    if (toTerritory.ownerId === action.playerId) {
      console.warn('Cannot attack your own territory')
      return newState
    }
    
    if (fromTerritory.machineCount <= attackingUnits) {
      console.warn('Not enough units to attack (must leave 1 behind)')
      return newState
    }
    
    const combatResult = this.resolveCombat(
      attackingUnits,
      toTerritory.machineCount,
      action.playerId,
      toTerritory.ownerId || 'neutral'
    )
    
    fromTerritory.machineCount -= combatResult.attackerLosses
    toTerritory.machineCount -= combatResult.defenderLosses
    
    if (toTerritory.machineCount <= 0) {
      toTerritory.ownerId = action.playerId
      toTerritory.machineCount = combatResult.attackerUnitsRemaining
      
      const attacker = newState.players.find(p => p.id === action.playerId)
      const defender = newState.players.find(p => p.id === toTerritory.ownerId)
      
      if (attacker && !attacker.territories.includes(toTerritoryId)) {
        attacker.territories.push(toTerritoryId)
      }
      
      if (defender) {
        defender.territories = defender.territories.filter(id => id !== toTerritoryId)
      }
      
      console.log(`🎯 ${fromTerritory.name} conquered ${toTerritory.name}!`)
    } else {
      console.log(`⚔️ Attack from ${fromTerritory.name} to ${toTerritory.name} repelled`)
    }
    
    return newState
  }

  private fortifyTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, unitCount } = action.data
    const newState = { ...gameState }
    
    const fromTerritory = newState.territories[fromTerritoryId]
    const toTerritory = newState.territories[toTerritoryId]
    
    if (!fromTerritory || !toTerritory) {
      console.warn('Invalid territories for fortify')
      return newState
    }
    
    if (fromTerritory.ownerId !== action.playerId || toTerritory.ownerId !== action.playerId) {
      console.warn('Player must own both territories to fortify')
      return newState
    }
    
    if (fromTerritory.machineCount <= unitCount) {
      console.warn('Not enough units to fortify (must leave 1 behind)')
      return newState
    }
    
    fromTerritory.machineCount -= unitCount
    toTerritory.machineCount += unitCount
    
    console.log(`🛡️ Fortified ${toTerritory.name} with ${unitCount} units from ${fromTerritory.name}`)
    return newState
  }

  private playCard(gameState: GameState, action: GameAction): GameState {
    const { cardId, targets } = action.data
    const newState = { ...gameState }
    const player = newState.players.find(p => p.id === action.playerId)
    
    if (!player) return newState
    
    const cardIndex = player.cards.findIndex(c => c.id === cardId)
    if (cardIndex === -1) return newState
    
    const card = player.cards[cardIndex]
    player.cards.splice(cardIndex, 1)
    
    return newState
  }

  private resolveCombat(
    attackingUnits: number,
    defendingUnits: number,
    attackerId: string,
    defenderId: string
  ): {
    attackerLosses: number,
    defenderLosses: number,
    attackerUnitsRemaining: number,
    victory: 'attacker' | 'defender'
  } {
    console.log(`⚔️ Combat: ${attackingUnits} attackers vs ${defendingUnits} defenders`)
    
    let attackerRemaining = attackingUnits
    let defenderRemaining = defendingUnits
    
    while (attackerRemaining > 0 && defenderRemaining > 0) {
      const attackerRoll = this.rollDice('d6')
      const defenderRoll = this.rollDice('d6')
      
      console.log(`🎲 Attacker rolls ${attackerRoll}, Defender rolls ${defenderRoll}`)
      
      if (attackerRoll > defenderRoll) {
        defenderRemaining--
        console.log('🗡️ Defender loses 1 unit')
      } else {
        attackerRemaining--
        console.log('🛡️ Attacker loses 1 unit')
      }
    }
    
    const result = {
      attackerLosses: attackingUnits - attackerRemaining,
      defenderLosses: defendingUnits - defenderRemaining,
      attackerUnitsRemaining: attackerRemaining,
      victory: defenderRemaining <= 0 ? 'attacker' : 'defender' as 'attacker' | 'defender'
    }
    
    console.log(`⚔️ Combat result:`, result)
    return result
  }

  private rollDice(diceType: 'd6' | 'd8'): number {
    const max = diceType === 'd6' ? 6 : 8
    return Math.floor(Math.random() * max) + 1
  }

  private createStateSnapshot(): Partial<GameState> {
    if (!this.gameState) return {}
    
    return {
      currentYear: this.gameState.currentYear,
      currentPhase: this.gameState.currentPhase,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
      players: JSON.parse(JSON.stringify(this.gameState.players)),
      territories: JSON.parse(JSON.stringify(this.gameState.territories))
    }
  }

  private createInitialStateFromActions(): GameState {
    if (!this.gameState) {
      throw new Error('No state available to create initial state from')
    }
    
    return {
      ...this.gameState,
      actions: [],
      currentActionIndex: -1
    }
  }

  async rewindToAction(actionIndex: number): Promise<GameState> {
    if (!this.gameState) {
      await this.getState()
    }

    if (!this.gameState) {
      throw new Error('No game state found')
    }

    if (actionIndex < 0 || actionIndex >= this.gameState.actions.length) {
      throw new Error('Invalid action index')
    }

    const initialState = this.createInitialStateFromActions()
    let replayState = initialState
    
    for (let i = 0; i <= actionIndex; i++) {
      replayState = this.reduceAction(replayState, this.gameState.actions[i])
    }

    this.gameState = {
      ...replayState,
      actions: this.gameState.actions,
      currentActionIndex: actionIndex
    }

    await this.persist()
    this.broadcast({ type: 'state_update', state: this.gameState })
    
    return this.gameState
  }

  async createGame(data: { playerNames: string[], territoryConfig: Record<string, any> }): Promise<GameState> {
    const gameId = crypto.randomUUID()
    
    const players: Player[] = data.playerNames.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      color: ['blue', 'red', 'green', 'yellow'][index % 4],
      cards: [],
      territories: [],
      isActive: index === 0,
      pendingDecision: undefined,
      remainingUnitsToPlace: GAME_CONFIG.SETUP_UNITS_PER_PLAYER,
      unitsPlacedThisTurn: 0,
      unitsToPlaceThisTurn: 0, // ✅ NEW
      energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
      // ✅ ADD: Set AI vibe for AI players
      aiVibe: name === 'AI Player' ? 'efficient' : undefined,
      currentBid: undefined,
      totalEnergySpentOnBids: 0
    }))

    const territories: Record<string, Territory> = {}
    Object.entries(data.territoryConfig).forEach(([id, config]: [string, any]) => {
      territories[id] = {
        id,
        name: config.name,
        machineCount: config.initialMachines || 0,
        connections: config.connections || [],
        modifiers: config.modifiers
      }
    })

    this.gameState = {
      id: gameId,
      status: 'setup',
      setupPhase: 'units',
      currentPhase: 1,
      currentYear: 1,
      currentPlayerIndex: 0,
      players,
      turnOrder: players.map(p => p.id),
      activeTurnOrder: players.map(p => p.id),
      territories,
      actions: [],
      currentActionIndex: -1,
      createdAt: new Date(),
      updatedAt: new Date(),
      // 🎯 NEW: Initialize bidding-related properties
      bidding: undefined,              // No bidding during setup
      yearlyTurnOrders: {}            // Will track turn orders from each year's bidding
    }

    await this.persist()
    return this.gameState
  }

  async joinGame(data: { playerId: string, playerName: string }): Promise<GameState> {
    if (!this.gameState) {
      await this.getState()
    }

    if (!this.gameState) {
      throw new Error('No game found')
    }

    const existingPlayer = this.gameState.players.find(p => p.id === data.playerId)
    if (!existingPlayer) {
      const newPlayer: Player = {
        id: data.playerId,
        name: data.playerName,
        color: ['blue', 'red', 'green', 'yellow'][this.gameState.players.length % 4],
        cards: [],
        territories: [],
        isActive: false,
        pendingDecision: undefined,
        remainingUnitsToPlace: GAME_CONFIG.SETUP_UNITS_PER_PLAYER,
        unitsPlacedThisTurn: 0,
        energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
        // 🎯 NEW: Initialize bidding properties for new player
        currentBid: undefined,
        totalEnergySpentOnBids: 0
      }
      
      this.gameState.players.push(newPlayer)
      this.gameState.turnOrder.push(data.playerId)
      this.gameState.updatedAt = new Date()
      
      await this.persist()
      this.broadcast({ type: 'player_joined', player: newPlayer })
    }

    return this.gameState
  }

  

  private async persist() {
    if (this.gameState) {
      await this.ctx.storage.put('gameState', this.gameState)
    }
  }

  private broadcast(message: any) {
    try {
      if (!message || typeof message !== 'object') {
        console.error('❌ Invalid message object:', message);
        return;
      }
      
      const jsonString = JSON.stringify(message, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (value === undefined) {
          return null;
        }
        return value;
      });
      
      try {
        JSON.parse(jsonString);
      } catch (parseError) {
        console.error('❌ JSON serialization failed:', parseError);
        console.error('❌ Problem message:', message);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const ws of this.gameConnections) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(jsonString);
            successCount++;
          } catch (error) {
            console.error('Failed to send game update:', error);
            this.gameConnections.delete(ws);
            this.wsToPlayer.delete(ws);
            failCount++;
          }
        } else {
          this.gameConnections.delete(ws);
          this.wsToPlayer.delete(ws);
          failCount++;
        }
      }
      
      console.log(`📊 Broadcast complete: ${successCount} sent, ${failCount} failed/closed`);
      
    } catch (error) {
      console.error('Error broadcasting game message:', error);
      console.error('Problem message object:', message);
    }
  }
}

export default GameStateDO