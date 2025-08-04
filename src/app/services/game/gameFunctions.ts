// app/services/game/gameFunctions.ts - FIXED for RedwoodJS SDK
// Game Logic Functions
// meant to be used in the game logic

import type { GameState, Player, Territory } from '@/app/lib/GameState'

// Territory Data (updated with correct names and groupings + types)
export const TERRITORY_DATA = [
  { id: 0, name: "Northwestern Oil Emirate", connections: [1, 5, 31], type: 'land' }, //
  { id: 1, name: "Alberta", connections: [0, 5, 6, 8], type: 'land' }, //
  { id: 2, name: "Mexico", connections: [3, 8, 12], type: 'land' }, //
  { id: 3, name: "American Republic", connections: [2, 6, 7, 8, 50], type: 'land' }, //
  { id: 4, name: "Exiled States of America", connections: [5, 7, 14], type: 'land' }, //
  { id: 5, name: "Nunavut", connections: [0, 1, 4, 6], type: 'land' }, //
  { id: 6, name: "Canada", connections: [1, 3, 5, 7, 8], type: 'land' }, //
  { id: 7, name: "République du Québec", connections: [3, 4, 6], type: 'land' }, //
  { id: 8, name: "Continental Biospheres", connections: [1, 2, 3, 6, 42], type: 'land' }, //
  { id: 9, name: "Argentina", connections: [10, 11], type: 'land' }, //
  { id: 10, name: "Amazon Desert", connections: [9, 11, 12, 24, 48, 49], type: 'land' }, //
  { id: 11, name: "Andean Nations", connections: [9, 10, 12], type: 'land' }, //
  { id: 12, name: "Nuevo Timoto", connections: [2, 10, 11, 44], type: 'land' }, //
  { id: 13, name: "New Avalon", connections: [14, 15, 16, 19, 51], type: 'land' }, //
  { id: 14, name: "Iceland GRC (Genetic Research Center)", connections: [4, 13, 16], type: 'land' }, //
  { id: 15, name: "Warsaw Republic", connections: [13, 16, 17, 18, 19], type: 'land' }, //
  { id: 16, name: "Jotenheim", connections: [13, 14, 15, 18], type: 'land' }, //
  { id: 17, name: "Imperial Balkania", connections: [15, 18, 19, 22, 24, 32], type: 'land' }, //
  { id: 18, name: "Ukrayina", connections: [15, 16, 17, 26, 32, 36], type: 'land' }, //
  { id: 19, name: "Andorra", connections: [13, 15, 17, 24], type: 'land' }, //
  { id: 20, name: "Zaire Military Zone", connections: [21, 24, 25], type: 'land' }, //
  { id: 21, name: "Ministry of Djibouti", connections: [20, 22, 23, 24, 25], type: 'land' }, //
  { id: 22, name: "Egypt", connections: [17, 21, 24, 32], type: 'land' }, //
  { id: 23, name: "Madagascar", connections: [21, 25, 53], type: 'land' }, //
  { id: 24, name: "Saharan Empire", connections: [10, 17, 19, 20, 21, 22, 47], type: 'land' }, //
  { id: 25, name: "Lesotho", connections: [20, 21, 23], type: 'land' }, //
  { id: 26, name: "Afghanistan", connections: [18, 27, 28, 32, 36], type: 'land' }, //
  { id: 27, name: "Hong Kong", connections: [26, 28, 33, 34, 35, 36, 46], type: 'land' }, //
  { id: 28, name: "United Indiastan", connections: [26, 27, 32, 34, 52], type: 'land' },//
  { id: 29, name: "Alden", connections: [31, 33, 35, 37], type: 'land' }, //
  { id: 30, name: "Japan", connections: [31, 33, 46], type: 'land' }, //
  { id: 31, name: "Pevek", connections: [0, 29, 30, 33, 37], type: 'land' }, //
  { id: 32, name: "Middle East", connections: [17, 18, 22, 26, 28], type: 'land' }, //
  { id: 33, name: "Khan Industrial State", connections: [27, 29, 30, 31, 35], type: 'land' }, //
  { id: 34, name: "Angkhor Wat", connections: [27, 28, 39], type: 'land' }, //
  { id: 35, name: "Siberia", connections: [27, 29, 33, 36, 37], type: 'land' }, //
  { id: 36, name: "Enclave of the Bear", connections: [18, 26, 27, 35], type: 'land' }, //
  { id: 37, name: "Sakha", connections: [29, 31, 35], type: 'land' }, //
  { id: 38, name: "Australian Testing Ground", connections: [40, 41], type: 'land' }, //
  { id: 39, name: "Java Cartel", connections: [34, 40, 41, 45], type: 'land' }, //
  { id: 40, name: "New Guinea", connections: [38, 39, 41], type: 'land' }, //
  { id: 41, name: "Aboriginal League", connections: [38, 39, 40, 54], type: 'land' }, //
  { id: 42, name: "Poseidon", connections: [8, 43], type: 'water' }, //
  { id: 43, name: "Hawaiian Preserve", connections: [42, 44], type: 'water' }, //
  { id: 44, name: "New Atlantis", connections: [12, 43, 46], type: 'water' }, //
  { id: 45, name: "Sung Tzu", connections: [39, 46], type: 'water' }, //
  { id: 46, name: "Neo Tokyo", connections: [27, 30, 44, 45], type: 'water' }, //
  { id: 47, name: "The Ivory Reef", connections: [24, 48], type: 'water' }, //
  { id: 48, name: "Neo Paulo", connections: [10, 47], type: 'water' }, //
  { id: 49, name: "Nova Brasilia", connections: [10, 50], type: 'water' }, //
  { id: 50, name: "New York", connections: [3, 49, 51], type: 'water' }, //
  { id: 51, name: "Western Ireland", connections: [13, 50], type: 'water' }, //
  { id: 52, name: "South Ceylon", connections: [28, 53], type: 'water' }, //
  { id: 53, name: "Microcorp", connections: [52, 54, 23], type: 'water' }, //
  { id: 54, name: "Akara", connections: [41, 53], type: 'water' } //
]

// Updated Continent Definitions
export const CONTINENTS = {
  'North America': {
    territories: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    bonus: 5
  },
  'South America': {
    territories: [9, 10, 11, 12],
    bonus: 2
  },
  'Europe': {
    territories: [13, 14, 15, 16, 17, 18, 19],
    bonus: 5
  },
  'Africa': {
    territories: [20, 21, 22, 23, 24, 25],
    bonus: 3
  },
  'Asia': {
    territories: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
    bonus: 7
  },
  'Australia': {
    territories: [38, 39, 40, 41],
    bonus: 2
  },
  'US Pacific': {
    territories: [42, 43, 44],
    bonus: 2
  },
  'Asia Pacific': {
    territories: [45, 46],
    bonus: 1
  },
  'Southern Atlantic': {
    territories: [47, 48],
    bonus: 1
  },
  'Northern Atlantic': {
    territories: [49, 50, 51],
    bonus: 2
  },
  'Indian': {
    territories: [52, 53, 54],
    bonus: 2
  }
}

// Income Calculation Functions
export function calculateTerritoryBonus(territoryCount: number): number {
  return Math.floor(territoryCount / 3)
}

export function calculateContinentBonus(player: Player, gameState: GameState): number {
  let bonus = 0
  
  for (const [continentName, continent] of Object.entries(CONTINENTS)) {
    const controlsContinent = continent.territories.every(territoryId => 
      player.territories.includes(territoryId.toString())
    )
    
    if (controlsContinent) {
      bonus += continent.bonus
    }
  }
  
  return bonus
}

export function calculatePlayerIncome(player: Player, gameState: GameState, conqueredThisTurn: number): {
  energy: number
  cards: string[]
  source: string
} {
  // Special conquest bonus
  if (conqueredThisTurn >= 3) {
    return {
      energy: 1,
      cards: ['land_commander'],
      source: 'conquest_bonus'
    }
  }
  
  // Standard income
  const territoryBonus = calculateTerritoryBonus(player.territories.length)
  const continentBonus = calculateContinentBonus(player, gameState)
  
  return {
    energy: territoryBonus + continentBonus,
    cards: [],
    source: 'standard_income'
  }
}

// Territory Helper Functions
export function getTerritory(gameState: GameState, territoryId: string): Territory | null {
  return gameState.territories[territoryId] || null
}

export function areTerritoriesConnected(territoryId1: string, territoryId2: string): boolean {
  const territory1 = TERRITORY_DATA.find(t => t.id.toString() === territoryId1)
  if (!territory1) return false
  
  return territory1.connections.map(id => id.toString()).includes(territoryId2)
}

export function getPlayerTerritories(player: Player, gameState: GameState): Territory[] {
  return player.territories
    .map(id => gameState.territories[id])
    .filter(Boolean)
}

export function canAttackTerritory(
  gameState: GameState, 
  attackerId: string, 
  fromTerritoryId: string, 
  toTerritoryId: string
): { canAttack: boolean; reason?: string } {
  const fromTerritory = getTerritory(gameState, fromTerritoryId)
  const toTerritory = getTerritory(gameState, toTerritoryId)
  
  if (!fromTerritory || !toTerritory) {
    return { canAttack: false, reason: 'Territory not found' }
  }
  
  if (fromTerritory.ownerId !== attackerId) {
    return { canAttack: false, reason: 'You do not control the attacking territory' }
  }
  
  if (toTerritory.ownerId === attackerId) {
    return { canAttack: false, reason: 'Cannot attack your own territory' }
  }
  
  if (fromTerritory.machineCount <= 1) {
    return { canAttack: false, reason: 'Need at least 2 units to attack (must leave 1 behind)' }
  }
  
  if (!areTerritoriesConnected(fromTerritoryId, toTerritoryId)) {
    return { canAttack: false, reason: 'Territories are not connected' }
  }
  
  return { canAttack: true }
}

// Game Phase Functions
export function getPhaseInfo(phase: number): { name: string; description: string } {
  const phases = {
    1: { name: 'Bidding', description: 'Bid energy for turn order' },
    2: { name: 'Collect & Deploy', description: 'Receive income and deploy units' },
    3: { name: 'Hire & Build', description: 'Hire commanders and build space stations' },
    4: { name: 'Buy Command Cards', description: 'Purchase command cards with energy' },
    5: { name: 'Play Command Cards', description: 'Activate purchased command cards' },
    6: { name: 'Invade Territories', description: 'Attack enemy territories' },
    7: { name: 'Fortify Position', description: 'Move units within your territories' }
  }
  
  return phases[phase as keyof typeof phases] || { name: 'Unknown', description: 'Unknown phase' }
}

export function getCurrentPlayer(gameState: GameState): Player | null {
  return gameState.players[gameState.currentPlayerIndex] || null
}

export function isPlayerTurn(gameState: GameState, playerId: string): boolean {
  const currentPlayer = getCurrentPlayer(gameState)
  return currentPlayer?.id === playerId
}

// Initialize Game Functions
export function createInitialTerritories(): Record<string, Territory> {
  const territories: Record<string, Territory> = {}
  
  TERRITORY_DATA.forEach(territoryData => {
    territories[territoryData.id.toString()] = {
      id: territoryData.id.toString(),
      name: territoryData.name,
      ownerId: undefined,
      machineCount: 1,
      connections: territoryData.connections.map(id => id.toString())
    }
  })
  
  return territories
}

export function createInitialGameState(gameId: string, players: Player[]): GameState {
  return {
    id: gameId,
    status: 'setup',
    setupPhase: 'units',
    currentPhase: 1,
    currentYear: 1,
    currentPlayerIndex: 0,
    players,
    turnOrder: players.map(p => p.id),
    activeTurnOrder: players.filter(p => p.id !== 'npc-neutral').map(p => p.id),
    territories: createInitialTerritories(),
    actions: [],
    currentActionIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}