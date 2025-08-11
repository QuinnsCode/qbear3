// gameDurableObject.ts - CLEANED VERSION
/**
 * RISK-STYLE STRATEGY GAME - Durable Object Game State Manager
 * 
 * TECH STACK:
 * - Cloudflare Workers & Durable Objects for distributed game state
 * - RedwoodJS SDK for full-stack framework
 * - WebSockets for real-time multiplayer communication
 * - TypeScript for type safety
 * 
 * ARCHITECTURE:
 * - GameStateDO: Single source of truth for game state, handles orchestration
 * - Modular Function Managers: Organized game logic into specialized classes
 * - WebSocket connections: Real-time bidirectional communication between clients and DO
 * - HTTP API: RESTful endpoints for game actions (POST/GET/PUT)
 * - AI Controller: Manages AI player actions with realistic delays
 * 
 * IMPORTED MANAGER CLASSES:
 * ├── WebSocketManager: Handles WebSocket connections and broadcasting
 * ├── AiManager: Manages AI player actions and scheduling
 * ├── GameUtils: Core game mechanics (units, commanders, energy, combat)
 * ├── RestOfThemManager: Phase progression, combat, bidding, purchases
 * └── StateManager: State snapshots and action replay utilities
 * 
 * EXTRACTED FUNCTIONS:
 * ├── setupFunctions: Setup phase progression and validation
 * └── gameSetup: Initial game creation and configuration
 * 
 * GAME FLOW (Post-Restart):
 * 1. TERRITORY NUKING: Random territories get nuked based on nukeCount parameter
 * 2. SETUP PHASES: Turn-based setup with 4 sequential phases:
 *    a) UNITS PHASE: Each player places 3 units per turn on their territories
 *    b) LAND COMMANDER: Each player places 1 land commander on owned territory
 *    c) DIPLOMAT COMMANDER: Each player places 1 diplomat commander on owned territory  
 *    d) SPACE BASE: Each player places 1 space base on owned territory
 * 3. MAIN GAME: Standard Risk-style gameplay with 6 phases per turn
 * 
 * DURABLE OBJECT RESPONSIBILITIES:
 * - HTTP request routing and WebSocket upgrades
 * - Game state persistence and loading
 * - Action orchestration and validation
 * - AI progression scheduling
 * - Real-time state broadcasting
 * - Game lifecycle management (create, join, restart)
 * - Action replay and rewind functionality
 * 
 * MANAGER CLASS RESPONSIBILITIES:
 * - WebSocketManager: Connection handling, message broadcasting
 * - AiManager: AI turn scheduling, timeout management, AI action execution
 * - GameUtils: Unit placement, energy collection, commander operations
 * - RestOfThemManager: Phase advancement, combat resolution, bidding system
 * - StateManager: State snapshots, action history management
 * 
 * KEY FEATURES:
 * - Persistent game state in Durable Object storage
 * - Action replay system for game rewind functionality
 * - Robust error handling and validation
 * - AI player support with configurable difficulty
 * - Real-time multiplayer with WebSocket sync
 * - Modular architecture for maintainability
 */

import { WebSocketManager } from '@/app/services/game/gameFunctions/websocket/WebSocketManager';
import { AiManager } from '@/app/services/game/gameFunctions/ai/AiManager';
import { GameUtils } from '@/app/services/game/gameFunctions/utils/GameUtils';
import { RestOfThemManager } from '@/app/services/game/gameFunctions/theRestOfThem/RestOfThemManager';
import { StateManager } from '@/app/services/game/gameFunctions/state/StateManager';
import { GAME_CONFIG } from '@/app/services/game/gameSetup'
import { DurableObject } from "cloudflare:workers";
import type { GameState, GameAction, Player, Territory } from '@/app/lib/GameState'
import { setupNewGame } from '@/app/services/game/gameSetup'
import { globalAIController } from '@/app/services/game/ADai'

// ✅ IMPORT EXTRACTED SETUP FUNCTIONS (only the ones we actually use)
import { 
  handleSetupPhaseProgression
} from '@/app/services/game/setupFunctions'

export class GameStateDO extends DurableObject {
  
  private AI_TURN_SPEED_MS = 500;
  private AI_TURN_SPEED_LONGACTION_MS = 800;
  private gameState: GameState | null = null
  private wsManager: WebSocketManager;
  private aiManager: AiManager;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.wsManager = new WebSocketManager(() => this.gameState);
    
    this.aiManager = new AiManager(
      (action) => this.applyAction(action),
      () => this.gameState
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    try {
      // Handle WebSocket upgrades
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.wsManager.handleUpgrade(request);
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
      
    } catch (error: any) {
      console.error('GameStateDO error:', error)
      return new Response(`Error: ${error?.message ? error.message : error}`, { status: 500 })
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
      previousState: StateManager.createStateSnapshot(this.gameState)
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
      
      this.wsManager.broadcast({ type: 'state_update', state: this.gameState })
      
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

  private async handleSetupProgression(action: any): Promise<void> {
    if (!this.gameState) return

    this.aiManager.clearAllTimeouts();

    const result = handleSetupPhaseProgression(this.gameState, action)
    
    if (result.newState !== this.gameState) {
      this.gameState = result.newState
      await this.persist()
      
      console.log(`📡 Broadcasting state update after progression`)
      this.wsManager.broadcast({ type: 'state_update', state: this.gameState })
    }
    
    console.log(`🎮 SETUP PROGRESSION CHECK:`, {
      status: this.gameState.status,
      setupPhase: this.gameState.setupPhase,
      currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex].name,
      shouldScheduleAI: this.gameState.status === 'setup'
    })
    
    if (this.gameState.status === 'setup') {
      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
      if (currentPlayer && globalAIController.isAIPlayer(currentPlayer.id)) {
        console.log(`🤖 Scheduling AI turn for ${currentPlayer.name} in ${this.gameState.setupPhase} phase`)
        
        // ✅ FIXED: Use AiManager
        this.aiManager.scheduleAISetupAction(currentPlayer.id);
      }
    } else if (this.gameState.status === 'bidding') {
      console.log(`💰 Game transitioned to bidding - Year ${this.gameState.bidding?.year}`)
      
      // ✅ FIXED: Use AiManager
      this.aiManager.checkAndTriggerAIBidding();
    } else {
      console.log(`🎮 Game finished (status: ${this.gameState.status}) - no more AI scheduling needed`)
    }
  }

  private async handleBiddingProgression(action: any): Promise<void> {
    if (!this.gameState || this.gameState.status !== 'bidding') return

    console.log(`💰 Handling bidding progression - Action: ${action.type}`)

    if (action.type === 'place_bid') {
      const biddingPlayers = RestOfThemManager.getBiddingPlayers(this.gameState)
      const totalBiddingPlayers = biddingPlayers.length
      const totalBids = Object.keys(this.gameState.bidding?.bidsSubmitted || {}).length
      const waitingCount = this.gameState.bidding?.playersWaitingToBid?.length || 0
      
      console.log(`📊 Bid count check: ${totalBids}/${totalBiddingPlayers} bids from real players, ${waitingCount} waiting`)
      
      if (totalBids >= totalBiddingPlayers || waitingCount === 0) {
        console.log(`🎯 All bidding players have bid - auto-revealing bids...`)
        
        setTimeout(async () => {
          if (this.gameState?.status === 'bidding' && !this.gameState.bidding?.bidsRevealed) {
            await this.applyAction({
              type: 'reveal_bids',
              playerId: 'system',
              data: {}
            })
            
            setTimeout(async () => {
              if (this.gameState?.status === 'bidding' && 
                  this.gameState.bidding?.bidsRevealed) {
                await this.applyAction({
                  type: 'start_year_turns',
                  playerId: 'system', 
                  data: {}
                })
              }
            }, this.AI_TURN_SPEED_LONGACTION_MS * 5)
          }
        }, this.AI_TURN_SPEED_LONGACTION_MS)
      }
    }
  }

  private async handleMainGamePhaseProgression(action: any): Promise<void> {
    if (!this.gameState || this.gameState.status !== 'playing') return

    // ✅ FIXED: Use AiManager
    this.aiManager.clearAllTimeouts();

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    
    console.log(`📍 Main game progression - Turn: ${this.gameState.currentYear}, Phase: ${this.gameState.currentPhase}, Player: ${currentPlayer.name}, Action: ${action.type}`)
    
    if (action.type === 'start_year_turns') {
      console.log(`🎮 Year turns just started - checking first player`)
      if (globalAIController.isAIPlayer(currentPlayer.id)) {
        console.log(`🤖 First player is AI - scheduling turn`)
        setTimeout(() => {
          // ✅ FIXED: Use AiManager
          this.aiManager.doAIMainGameAction()
        }, this.AI_TURN_SPEED_MS * 2)
      } else {
        console.log(`👤 First player is human - they should see CollectDeployOverlay`)
      }
      return
    }

    let phaseCompleted = false
    
    switch (this.gameState.currentPhase) {
      case 1: // Collect & Deploy
        if (action.type === 'advance_player_phase' && action.data?.deploymentComplete) {
          phaseCompleted = true
        }
        break
      case 2: // Build & Hire  
        if (action.type === 'advance_player_phase' && action.data?.phaseComplete) {
          phaseCompleted = true
        }
        break
      case 3: // Buy Cards
        if (action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 4: // Play Cards
        if (action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 5: // Invade
        if (action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
      case 6: // Fortify
        if (action.type === 'advance_player_phase') {
          phaseCompleted = true
        }
        break
    }
    
    if (phaseCompleted) {
      console.log(`✅ ${currentPlayer.name} completed Phase ${this.gameState.currentPhase}`)
      
      if (this.gameState.currentPhase === 6) {
        console.log(`🎯 ${currentPlayer.name} completed all phases - advancing to next player`)
        this.gameState = RestOfThemManager.advanceToNextMainGamePlayer(this.gameState)
      } else {
        this.gameState.currentPhase = (this.gameState.currentPhase + 1) as any
        const phaseInfo = GAME_CONFIG.PLAYER_PHASES[this.gameState.currentPhase]
        console.log(`📋 ${currentPlayer.name} advanced to Phase ${this.gameState.currentPhase}: ${phaseInfo?.name || 'Unknown Phase'}`)
      }
      
      console.log(`📡 Broadcasting state update after main game progression`)
      this.wsManager.broadcast({ type: 'state_update', state: this.gameState })
      
      const updatedCurrentPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
      if (updatedCurrentPlayer && globalAIController.isAIPlayer(updatedCurrentPlayer.id)) {
        console.log(`🤖 Scheduling AI turn for ${updatedCurrentPlayer.name} in Phase ${this.gameState.currentPhase}`)
        
        // ✅ FIXED: Use AiManager
        this.aiManager.scheduleAIMainGameAction(updatedCurrentPlayer.id);
      } else if (updatedCurrentPlayer) {
        console.log(`👤 Next phase for human: ${updatedCurrentPlayer.name} - Phase ${this.gameState.currentPhase}`)
        
        if (this.gameState.currentPhase === 1) {
          console.log(`👤 Human should see CollectDeployOverlay`)
        } else if (this.gameState.currentPhase === 2) {
          console.log(`👤 Human should see BuildHireOverlay`)
        } else if (this.gameState.currentPhase === 3) {
          console.log(`👤 Human should see Buy Cards UI (not implemented yet)`)
        } else {
          console.log(`👤 Human should see Phase ${this.gameState.currentPhase} UI`)
        }
      }
    } else {
      console.log(`⏳ ${currentPlayer.name} action ${action.type} did not complete Phase ${this.gameState.currentPhase}`)
    }
  }

  async restartGame(data: { player1Id: string, player2Id: string, nukeCount: number }): Promise<GameState> {
    const gameId = this.ctx.id.toString()
    
    this.gameState = setupNewGame(gameId, data.player1Id, data.player2Id, data.nukeCount)
    this.gameState.setupPhase = 'units'
    
    await this.initializeAIPlayers(this.gameState)
    await this.persist()
    
    this.wsManager.broadcast({ 
      type: 'game_restarted', 
      state: this.gameState,
      nukedTerritories: this.gameState.actions[0]?.data?.nukedTerritories || []
    })

    const firstPlayer = this.gameState.players[this.gameState.currentPlayerIndex]
    if (firstPlayer && globalAIController.isAIPlayer(firstPlayer.id)) {
      console.log('🤖 First player is AI, starting AI setup immediately')
      // ✅ FIXED: Use AiManager
      this.aiManager.doAISetupAction()
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

  private reduceAction(gameState: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'advance_phase':
        return RestOfThemManager.advancePhase(gameState)
      case 'advance_turn':
        return RestOfThemManager.advanceTurn(gameState)
      case 'player_decision':
        return RestOfThemManager.handlePlayerDecision(gameState, action)
      case 'deploy_machines':
        return GameUtils.deployMachines(gameState, action)
      case 'place_unit':
        return GameUtils.placeUnit(gameState, action)
      case 'place_commander':
        return GameUtils.placeCommander(gameState, action)
      case 'place_space_base':
        return GameUtils.placeSpaceBase(gameState, action)
      case 'collect_energy':
        return GameUtils.collectEnergy(gameState, action)
      case 'spend_energy':
        return GameUtils.spendEnergy(gameState, action)
      case 'advance_player_phase':
        return RestOfThemManager.advancePlayerPhase(gameState, action)
      case 'start_main_game':
        return RestOfThemManager.startMainGame(gameState)
      case 'attack_territory':
        return RestOfThemManager.attackTerritory(gameState, action)
      case 'fortify_territory':
        return RestOfThemManager.fortifyTerritory(gameState, action)
      case 'play_card':
        return RestOfThemManager.playCard(gameState, action)
      case 'place_bid':
        return RestOfThemManager.placeBid(gameState, action)
      case 'reveal_bids':
        return RestOfThemManager.revealBids(gameState)
      case 'start_year_turns':
        return RestOfThemManager.startYearTurns(gameState)
      case 'purchase_and_place_commander':
        return RestOfThemManager.purchaseAndPlaceCommander(gameState, action)
      case 'purchase_and_place_space_base':
        return RestOfThemManager.purchaseAndPlaceSpaceBase(gameState, action)
      default:
        console.warn(`Unknown action type: ${action.type}`)
        return gameState
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

    const initialState = StateManager.createInitialStateFromActions(this.gameState)
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
    this.wsManager.broadcast({ type: 'state_update', state: this.gameState })
    
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
      this.wsManager.broadcast({ type: 'player_joined', player: newPlayer })
    }

    return this.gameState
  }
  
  private async persist() {
    if (this.gameState) {
      await this.ctx.storage.put('gameState', this.gameState)
    }
  }
  
}

export default GameStateDO