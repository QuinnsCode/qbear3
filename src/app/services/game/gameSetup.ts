//@/app/services/game/gameSetup.ts
// Game Setup Functions
import type { GameState, Player, Territory } from '@/app/lib/GameState'
import { TERRITORY_DATA, createInitialTerritories } from '@/app/services/game/gameFunctions'

// Configuration
const NPC_UNITS_PER_TERRITORY = 2
const PLAYER_STARTING_UNITS = 35 // Total units each player gets to place during setup
const DEFAULT_NUKE_COUNT = 4

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function nukeXTerritories(nukeCount: number, territories: typeof TERRITORY_DATA): {
  remainingTerritories: typeof TERRITORY_DATA,
  nukedTerritoryIds: number[],
  nukedTerritories: typeof TERRITORY_DATA
} {
  if (nukeCount <= 0) {
    return {
      remainingTerritories: territories,
      nukedTerritoryIds: [],
      nukedTerritories: []
    }
  }
  
  if (nukeCount >= territories.length) {
    console.warn(`Cannot nuke ${nukeCount} territories - only ${territories.length} available`)
    return {
      remainingTerritories: [],
      nukedTerritoryIds: territories.map(t => t.id),
      nukedTerritories: territories
    }
  }
  
  const shuffledTerritories = shuffleArray(territories)
  const territoriesToNuke = shuffledTerritories.slice(0, nukeCount)
  const nukedTerritoryIds = territoriesToNuke.map(t => t.id)
  
  console.log(`💥 Nuking ${nukeCount} territories:`, territoriesToNuke.map(t => `${t.id}: ${t.name}`))
  
  const remainingTerritories = territories.filter(territory => 
    !nukedTerritoryIds.includes(territory.id)
  )
  
  const cleanedTerritories = remainingTerritories.map(territory => ({
    ...territory,
    connections: territory.connections.filter(connectionId => 
      !nukedTerritoryIds.includes(connectionId)
    )
  }))
  
  return {
    remainingTerritories: cleanedTerritories,
    nukedTerritoryIds,
    nukedTerritories: territoriesToNuke
  }
}

export function distributeTerritories(playerIds: string[], availableTerritories: typeof TERRITORY_DATA): Record<string, string[]> {
  const shuffledTerritories = shuffleArray(availableTerritories.map(t => t.id.toString()))
  const playerTerritories: Record<string, string[]> = {}
  
  // Initialize empty arrays for each player
  playerIds.forEach(playerId => {
    playerTerritories[playerId] = []
  })
  
  // Distribute territories round-robin
  shuffledTerritories.forEach((territoryId, index) => {
    const playerIndex = index % playerIds.length
    const playerId = playerIds[playerIndex]
    playerTerritories[playerId].push(territoryId)
  })
  
  return playerTerritories
}

export function createInitialPlayers(player1Id: string, player2Id: string): Player[] {
  return [
    {
      id: player1Id,
      name: 'Human Player',
      color: 'blue',
      cards: [
        { id: 'land-commander-1', type: 'commander', name: 'Land Commander', data: { commanderType: 'land' } },
        { id: 'diplomat-commander-1', type: 'commander', name: 'Diplomat Commander', data: { commanderType: 'diplomat' } }
      ],
      territories: [],
      isActive: false,
      remainingUnitsToPlace: GAME_CONFIG.PLAYER_STARTING_UNITS, // ✅ Use your existing name
      energy: GAME_CONFIG.SETUP_STARTING_ENERGY // ✅ ONLY ADD THIS LINE
    },
    {
      id: player2Id,
      name: 'AI Player', 
      color: 'red',
      cards: [
        { id: 'land-commander-2', type: 'commander', name: 'Land Commander', data: { commanderType: 'land' } },
        { id: 'diplomat-commander-2', type: 'commander', name: 'Diplomat Commander', data: { commanderType: 'diplomat' } }
      ],
      territories: [],
      isActive: false,
      remainingUnitsToPlace: GAME_CONFIG.PLAYER_STARTING_UNITS, // ✅ Use your existing name
      energy: GAME_CONFIG.SETUP_STARTING_ENERGY // ✅ ONLY ADD THIS LINE
    },
    {
      id: 'npc-neutral',
      name: 'Neutral NPC',
      color: 'gray',
      cards: [],
      territories: [],
      isActive: false,
      remainingUnitsToPlace: 0,
      energy: 0 // ✅ ONLY ADD THIS LINE
    }
  ]
}

export function setupNewGame(gameId: string, player1Id: string, player2Id: string, nukeCount: number = DEFAULT_NUKE_COUNT): GameState {
  const landTerritories = TERRITORY_DATA.filter(territory => territory.id <= 41)
  
  const { remainingTerritories, nukedTerritoryIds, nukedTerritories } = nukeXTerritories(nukeCount, landTerritories)
  
  const players = createInitialPlayers(player1Id, player2Id)
  
  // Only human and AI players participate in territory distribution (not NPC)
  const allPlayerIds = players.map(p => p.id) // Include NPC
  const territoryDistribution = distributeTerritories(allPlayerIds, remainingTerritories) 
  
  // Assign territories to players
  players.forEach(player => {
    player.territories = territoryDistribution[player.id] || []
  })
  
  // Create territories based on remaining territories
  const territories: Record<string, Territory> = {}
  
  remainingTerritories.forEach(territoryData => {
    territories[territoryData.id.toString()] = {
      id: territoryData.id.toString(),
      name: territoryData.name,
      ownerId: undefined,
      machineCount: 1, // Start with 1 unit each
      connections: territoryData.connections.map(id => id.toString())
    }
  })
  
  // Set territory ownership and initial units
  Object.keys(territories).forEach(territoryId => {
    const territory = territories[territoryId]
    
    const owner = players.find(player => 
      player.territories.includes(territoryId)
    )
    
    if (owner) {
      territory.ownerId = owner.id
      
      if (owner.id === 'npc-neutral') {
        territory.machineCount = NPC_UNITS_PER_TERRITORY
      } else {
        territory.machineCount = 1 // Players start with 1 and will place more during setup
      }
    }
  })
  // Create turn order (AI first, then Human)
  const activeTurnOrder = createTurnOrder(players)
  // Create game state - start with first human/AI player active for setup
  
  const gameState: GameState = {
    id: gameId,
    status: 'setup',
    setupPhase: 'units',
    currentYear: 1,
    currentPlayerIndex: 0, // Start with first player
    // ✅ Add new turn cycle properties
    currentPhase: 2,
    activeTurnOrder,
    players,
    turnOrder: [player1Id, player2Id], // Only human players in turn order
    territories,
    actions: [{
      id: 'game-start',
      type: 'game_initialized',
      playerId: 'system',
      timestamp: new Date(),
      data: {
        nukedTerritories: nukedTerritories.map(t => ({ id: t.id, name: t.name })),
        nukedCount: nukeCount,
        remainingTerritoryCount: remainingTerritories.length
      }
    }],
    currentActionIndex: 0,
    setupDeployPhase: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  
  // Set first player as active for setup
  gameState.players[0].isActive = true
  
  console.log(`🎮 Game initialized with ${remainingTerritories.length} territories (${nukeCount} nuked)`)
  console.log(`💥 Nuked territories:`, nukedTerritories.map(t => t.name).join(', '))
  console.log(`🎲 Setup phase: Players need to place ${PLAYER_STARTING_UNITS} units each`)
  
  return gameState
}

export function createTurnOrder(players: Player[]): string[] {
  // Filter out NPC - only AI and Human get real turns
  const playablePlayers = players.filter(p => 
    p.id !== 'npc-neutral' && 
    !p.name.includes('NPC') &&
    p.name !== 'NPC'
  )
  
  // Hard-coded order: AI first, then Human
  const aiPlayer = playablePlayers.find(p => p.name === 'AI Player')
  const humanPlayer = playablePlayers.find(p => p.name === 'Human Player')
  
  const turnOrder: string[] = []
  
  if (aiPlayer) turnOrder.push(aiPlayer.id)
  if (humanPlayer) turnOrder.push(humanPlayer.id)
  
  console.log(`🎯 Turn order created: ${turnOrder.map(id => {
    const player = players.find(p => p.id === id)
    return player?.name
  }).join(' → ')}`)
  
  return turnOrder
}

export function getSetupInfo(gameState: GameState): {
  isSetupPhase: boolean
  currentPlayer: Player | null
  setupInstructions: string
  canProceed: boolean
  remainingUnits: number
} {
  const isSetupPhase = gameState.status === 'setup'
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  
  if (!isSetupPhase) {
    return {
      isSetupPhase: false,
      currentPlayer: null,
      setupInstructions: 'Game has started',
      canProceed: false,
      remainingUnits: 0
    }
  }
  
  if (!currentPlayer) {
    return {
      isSetupPhase: true,
      currentPlayer: null,
      setupInstructions: 'Invalid game state',
      canProceed: false,
      remainingUnits: 0
    }
  }
  
  const remainingUnits = currentPlayer.remainingUnitsToPlace || 0
  
  // Check if all players have finished placing units
  const allPlayersFinished = gameState.players
    .filter(p => p.id !== 'npc-neutral')
    .every(p => (p.remainingUnitsToPlace || 0) <= 0)
  
  if (allPlayersFinished) {
    return {
      isSetupPhase: true,
      currentPlayer: null,
      setupInstructions: 'Setup complete - ready to start game',
      canProceed: true,
      remainingUnits: 0
    }
  }
  
  if (remainingUnits > 0) {
    return {
      isSetupPhase: true,
      currentPlayer,
      setupInstructions: `${currentPlayer.name}: Place ${remainingUnits} more units on your territories`,
      canProceed: false,
      remainingUnits
    }
  }
  
  // Current player finished, need to switch to next player
  return {
    isSetupPhase: true,
    currentPlayer,
    setupInstructions: `${currentPlayer.name} finished placing units. Switching to next player...`,
    canProceed: false,
    remainingUnits: 0
  }
}

export function canPlaceUnitOnTerritory(
  gameState: GameState, 
  playerId: string, 
  territoryId: string
): { canPlace: boolean; reason?: string } {
  const territory = gameState.territories[territoryId]
  
  if (!territory) {
    return { canPlace: false, reason: 'Territory not found' }
  }
  
  if (territory.ownerId !== playerId) {
    return { canPlace: false, reason: 'You do not own this territory' }
  }
  
  if (gameState.status !== 'setup') {
    return { canPlace: false, reason: 'Not in setup phase' }
  }
  
  const player = gameState.players.find(p => p.id === playerId)
  if (!player || (player.remainingUnitsToPlace || 0) <= 0) {
    return { canPlace: false, reason: 'No units remaining to place' }
  }
  
  return { canPlace: true }
}

export function getPlayerStats(gameState: GameState): {
  playerId: string
  name: string
  territoryCount: number
  totalUnits: number
  color: string
  remainingUnitsToPlace: number
}[] {
  return gameState.players.map(player => {
    const totalUnits = player.territories.reduce((sum, territoryId) => {
      const territory = gameState.territories[territoryId]
      return sum + (territory?.machineCount || 0)
    }, 0)
    
    return {
      playerId: player.id,
      name: player.name,
      territoryCount: player.territories.length,
      totalUnits,
      color: player.color,
      remainingUnitsToPlace: player.remainingUnitsToPlace || 0
    }
  })
}

// export function advanceSetupTurn(gameState: GameState): GameState {
//   const newState = { ...gameState }
  
//   console.log(`🔧 BEFORE advanceSetupTurn: currentPlayerIndex=${newState.currentPlayerIndex}, currentPlayer=${newState.players[newState.currentPlayerIndex]?.name}`)
  
//   // Advance to next player
//   const playablePlayerIds = newState.players
//     .filter(p => p.id !== 'npc-neutral')
//     .map(p => p.id)
  
//   console.log(`🔧 Playable player IDs:`, playablePlayerIds)
  
//   const currentPlayableIndex = playablePlayerIds.indexOf(newState.players[newState.currentPlayerIndex].id)
//   console.log(`🔧 Current playable index: ${currentPlayableIndex}`)
  
//   const nextPlayableIndex = (currentPlayableIndex + 1) % playablePlayerIds.length
//   console.log(`🔧 Next playable index: ${nextPlayableIndex}`)
  
//   // If we've cycled back to first player, advance the deployment phase
//   if (nextPlayableIndex === 0) {
//     newState.setupDeployPhase = (newState.setupDeployPhase || 0) + 1
//     console.log(`🔧 Advanced to setup deploy phase: ${newState.setupDeployPhase}`)
//   }
  
//   // Check if setup is complete
//   if ((newState.setupDeployPhase || 0) >= GAME_CONFIG.SETUP_FINAL_TURN_THRESHOLD + 1) {
//     console.log('🎮 Setup phase complete! Starting main game...')
//     newState.status = 'playing'
//     newState.currentPhase = 1
//     newState.currentPlayerIndex = 0
//     newState.players[0].isActive = true
    
//     // Clear remaining units to place
//     newState.players.forEach(player => {
//       player.remainingUnitsToPlace = 0
//     })
//   } else {
//     // Continue setup - switch to next player
//     const nextPlayerId = playablePlayerIds[nextPlayableIndex]
//     console.log(`🔧 Next player ID: ${nextPlayerId}`)
    
//     const nextPlayerIndex = newState.players.findIndex(p => p.id === nextPlayerId)
//     console.log(`🔧 Next player index: ${nextPlayerIndex}`)
    
//     newState.players[newState.currentPlayerIndex].isActive = false
//     newState.currentPlayerIndex = nextPlayerIndex
//     newState.players[nextPlayerIndex].isActive = true
    
//     // Reset turn counter for the new player
//     newState.players[nextPlayerIndex].unitsPlacedThisTurn = 0
    
//     console.log(`🔧 AFTER advanceSetupTurn: currentPlayerIndex=${newState.currentPlayerIndex}, currentPlayer=${newState.players[newState.currentPlayerIndex]?.name}`)
//     console.log(`🎲 Setup Deploy Phase ${newState.setupDeployPhase}: ${newState.players[nextPlayerIndex].name}'s turn`)
//   }
  
//   return newState
// }

export const GAME_CONFIG = {
  NPC_UNITS_PER_TERRITORY,
  PLAYER_STARTING_UNITS, // ✅ Keep your existing name
  PLAYER_STARTING_UNITS_PER_TERRITORY: 1,
  LAND_TERRITORIES_COUNT: TERRITORY_DATA.filter(t => t.type === 'land').length,
  SETUP_UNITS_PER_TURN_NORMAL: 3,
  SETUP_NPC_UNITS_PER_TERRITORY: 2,
  SETUP_UNITS_PER_TURN_FINAL: 2,
  SETUP_FINAL_TURN_THRESHOLD: 11,
  SETUP_MAX_PLACEMENT_ATTEMPTS: 50,
  SETUP_UNITS_PER_TURN_MULTIPLIER: 3, 
  SETUP_UNITS_PER_PLAYER: 35, // ✅ Keep your existing name
  SETUP_MAX_GAME_YEARS: 5, // ✅ Keep your existing name (same as MAX_GAME_TURNS)
  SETUP_MAX_AI_ACTIONS_PER_TURN: 10,
  SETUP_AI_CONTINUE_DELAY_MS: 1500,
  SETUP_AI_SETUP_DELAY_MS: 1000,
  
  // ✅ ONLY ADD THESE NEW LINES:
  SETUP_STARTING_ENERGY: 3,
  PLAYER_PHASES: {
    1: { name: 'Collect & Deploy', allowedActions: ['collect_energy', 'deploy_mods', 'advance_phase'] },
    2: { name: 'Build & Hire', allowedActions: ['hire_commander', 'build_station', 'advance_phase'] },
    3: { name: 'Buy Cards', allowedActions: ['buy_card', 'advance_phase'] },
    4: { name: 'Play Cards', allowedActions: ['play_card', 'advance_phase'] },
    5: { name: 'Invade', allowedActions: ['attack_territory', 'advance_phase'] },
    6: { name: 'Fortify', allowedActions: ['fortify_territory', 'advance_phase'] },
  } as const
}