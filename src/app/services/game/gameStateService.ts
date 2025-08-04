// ===== /app/services/game/gameStateService.ts =====
import type { GameState, Player, Territory, GameAction } from '@/app/lib/GameState'
import { GAME_CONFIG } from '@/app/services/game/gameSetup'

export async function loadOrCreateDefaultState(ctx: DurableObjectState): Promise<GameState> {
  const stored = await ctx.storage.get<GameState>('gameState')
  
  if (stored) {
    return hydrateStoredState(stored)
  }
  
  return createDefaultGame()
}

function hydrateStoredState(stored: GameState): GameState {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    actions: stored.actions.map(action => ({
      ...action,
      timestamp: new Date(action.timestamp)
    }))
  }
}

export async function createDefaultGame(): Promise<GameState> {
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
      energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
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

  return {
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
    bidding: undefined,
    yearlyTurnOrders: {}
  }
}

export async function createGame(data: { playerNames: string[], territoryConfig: Record<string, any> }): Promise<GameState> {
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
    energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
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

  return {
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
    bidding: undefined,
    yearlyTurnOrders: {}
  }
}

export function joinGame(gameState: GameState, data: { playerId: string, playerName: string }): GameState {
  const existingPlayer = gameState.players.find(p => p.id === data.playerId)
  if (existingPlayer) return gameState

  const newPlayer: Player = {
    id: data.playerId,
    name: data.playerName,
    color: ['blue', 'red', 'green', 'yellow'][gameState.players.length % 4],
    cards: [],
    territories: [],
    isActive: false,
    pendingDecision: undefined,
    remainingUnitsToPlace: GAME_CONFIG.SETUP_UNITS_PER_PLAYER,
    unitsPlacedThisTurn: 0,
    energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
    currentBid: undefined,
    totalEnergySpentOnBids: 0
  }
  
  const newState = { ...gameState }
  newState.players.push(newPlayer)
  newState.turnOrder.push(data.playerId)
  newState.updatedAt = new Date()
  
  return newState
}

export function createStateSnapshot(gameState: GameState): Partial<GameState> {
  return {
    currentYear: gameState.currentYear,
    currentPhase: gameState.currentPhase,
    currentPlayerIndex: gameState.currentPlayerIndex,
    players: JSON.parse(JSON.stringify(gameState.players)),
    territories: JSON.parse(JSON.stringify(gameState.territories))
  }
}

export function rewindToAction(
  gameState: GameState, 
  actionIndex: number,
  reduceActionFn: (state: GameState, action: GameAction) => GameState
): GameState {
  if (actionIndex < 0 || actionIndex >= gameState.actions.length) {
    throw new Error('Invalid action index')
  }

  const initialState = createInitialStateFromActions(gameState)
  let replayState = initialState
  
  for (let i = 0; i <= actionIndex; i++) {
    replayState = reduceActionFn(replayState, gameState.actions[i])
  }

  return {
    ...replayState,
    actions: gameState.actions,
    currentActionIndex: actionIndex
  }
}

function createInitialStateFromActions(gameState: GameState): GameState {
  return {
    ...gameState,
    actions: [],
    currentActionIndex: -1
  }
}