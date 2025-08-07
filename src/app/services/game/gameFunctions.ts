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


export const RAW_CARD_DATA = [
  // Space Command Cards - will leave out in v1
  // { qty: 1, cardTitle: 'Energy Extraction', cardPhase: 0, cardCost: 0, cardText: "If you occupy all the the lunar or asteroid territories in a region of space at the end of this turn, collect 7 energy" },
  // { qty: 2, cardTitle: 'Orbital Mines', cardPhase: 1, cardCost: 2, cardText: "Your opponent must destroy half the units in the invading territory. Round up." },
  // { qty: 2, cardTitle: 'Colony Influence', cardPhase: 2, cardCost: 0, cardText: "If your Space Commander is still alive, move your score marker ahead 3 spaces" },
  // { qty: 3, cardTitle: 'Invade Earth', cardPhase: 0, cardCost: 0, cardText: "Choose a planet. Turn over land territory cards for that planet until you turn over a territory you do not occupy. During this turn you may attack this land territory from any surrounding lunar or asteroid territories you occupy" },
  // { qty: 3, cardTitle: 'Assemble MODs', cardPhase: 0, cardCost: 1, cardText: "Place 3 MODs on any one moon or asteroid territory you control." },
  // { qty: 4, cardTitle: 'Stealth MODs', cardPhase: 1, cardCost: 0, cardText: "Place 3 additional defending MODs in the defending lunar or asteroid territory" },
  // { qty: 2, cardTitle: 'Frequency Jam', cardPhase: 0, cardCost: 0, cardText: "Choose a player. The chosen player cannot play command cards during your turn." },
  // { qty: 3, cardTitle: 'Reinforcements', cardPhase: 0, cardCost: 0, cardText: "Place 3 MODS, one each on 3 different space territories you occupy" },

  // Diplomat Command Cards
  { qty: 4, cardTitle: 'Colony Influence', cardPhase: 2, cardCost: 0, cardText: "If your Diplomat Commander is still alive, move your score marker ahead 3 spaces" },
  { qty: 2, cardTitle: 'Decoys Revealed', cardPhase: 0, cardCost: 0, cardText: "Move any number of your commanders to any number of territories you control." },
  { qty: 2, cardTitle: 'Evacuation', cardPhase: 1, cardCost: 0, cardText: "Move all units from the attacked territory to any territory you occupy." },
  { qty: 3, cardTitle: 'Territorial Station', cardPhase: 0, cardCost: 1, cardText: "Place a space station on any land territory you occupy." },
  { qty: 2, cardTitle: 'MOD Reduction', cardPhase: 0, cardCost: 2, cardText: "All of your opponents must remove 4 MODs in turn order. Then you remove 2 MODs" },
  { qty: 3, cardTitle: 'Redeployment', cardPhase: 3, cardCost: 0, cardText: "Take an extra free move this turn. You may only take this free move after you have finished attacking" },
  { qty: 2, cardTitle: 'Cease Fire', cardPhase: 1, cardCost: 2, cardText: "Prevent the invasion. The attacking player cannot attack any of your territories for the rest of his/her turn." },
  { qty: 2, cardTitle: 'Energy Crisis', cardPhase: 0, cardCost: 0, cardText: "Collect one energy from each opponent." },

  // Naval Command Cards
  { qty: 5, cardTitle: 'Hidden Energy', cardPhase: 0, cardCost: 0, cardText: "Draw a water or lava territory card. If you occupy this water or lava territory at the end of your turn, collect 4 energy. Discard the territory card at the end of this turn." },
  { qty: 3, cardTitle: 'Assemble MODs', cardPhase: 0, cardCost: 1, cardText: "Place 3 MODS on any one water or lava territory you occupy" },
  { qty: 5, cardTitle: 'Stealth MODs', cardPhase: 1, cardCost: 0, cardText: "Place 3 additional defending MODS in the defending water or lava territory." },
  { qty: 2, cardTitle: 'Colony Influence', cardPhase: 2, cardCost: 0, cardText: "If your Naval Commander is still alive, move your score marker ahead 3 spaces" },
  { qty: 1, cardTitle: 'Water Death Trap', cardPhase: 1, cardCost: 3, cardText: "Your opponent must destroy half the units in the invading territory. Round up." },
  { qty: 2, cardTitle: 'Reinforcements', cardPhase: 0, cardCost: 0, cardText: "Place 3 MODS, one each on 3 different water or lava territories you occupy" },
  { qty: 2, cardTitle: 'Frequency Jam', cardPhase: 0, cardCost: 0, cardText: "Choose a player. The chosen player cannot play command cards during your turn." },

  // Land Command Cards
  { qty: 5, cardTitle: 'Stealth MODs', cardPhase: 1, cardCost: 0, cardText: "Place 3 additional defending MODS in the defending land territory" },
  { qty: 2, cardTitle: 'Colony Influence', cardPhase: 2, cardCost: 0, cardText: "If your Land Commander is still alive, move your score marker ahead 3 spaces." },
  { qty: 3, cardTitle: 'Assemble MODs', cardPhase: 0, cardCost: 1, cardText: "Place 3 MODS on any one land territory you occupy." },
  { qty: 3, cardTitle: 'Reinforcements', cardPhase: 0, cardCost: 0, cardText: "Place 3 MODS, one each on 3 different land territories you occupy." },
  { qty: 3, cardTitle: 'Scout Forces', cardPhase: 0, cardCost: 0, cardText: "Draw a land territory card and secretly place it facedown in front of you. Place 5 MODS on this card. When you occupy this territory immediately place the MODS. Discard the territory card." },
  { qty: 2, cardTitle: 'Frequency Jam', cardPhase: 0, cardCost: 0, cardText: "Choose a player. The chosen player cannot play command cards during your turn." },
  { qty: 1, cardTitle: 'Stealth Station', cardPhase: 1, cardCost: 0, cardText: "Place a space station in the defending land territory." },
  { qty: 1, cardTitle: 'Land Death Trap', cardPhase: 1, cardCost: 3, cardText: "Your opponent must destroy half the units in the invading territory. Round up." },

  // Nuclear Command Cards
  { qty: 3, cardTitle: 'Assassin Bomb', cardPhase: 0, cardCost: 1, cardText: "Choose an opponent's commander. Roll an 8-sided die. If you roll a 3 or higher destroy the chosen commander." },
  { qty: 3, cardTitle: 'Scatter Bomb Land', cardPhase: 0, cardCost: 1, cardText: "Choose a planet and turn over 3 land territory cards for that planet. Destroy half the opponents' units on territories drawn. Round up." },
  { qty: 2, cardTitle: 'Scatter Bomb Water', cardPhase: 0, cardCost: 1, cardText: "Choose a planet and turn over 2 water or lava territory cards for that planet. Destroy half the opponents' units on territories drawn. Round up." },
  { qty: 2, cardTitle: 'Scatter Bomb Moon', cardPhase: 0, cardCost: 1, cardText: "Choose a lunar or asteroid region and turn over 2 lunar or asteroid territory cards for that planet. Destroy half the opponents' units on territories drawn. Round up." },
  { qty: 2, cardTitle: 'Rocket Strike Water', cardPhase: 0, cardCost: 2, cardText: "Choose any opponent's water or lava territory. Roll a 6-sided die. Your opponent must destroy units equal to the number rolled in the chosen territory." },
  { qty: 2, cardTitle: 'Rocket Strike Land', cardPhase: 0, cardCost: 2, cardText: "Choose any opponent's land territory. Roll a 6-sided die. Your opponent must destroy units equal to the number rolled in the chosen territory." },
  { qty: 2, cardTitle: 'Rocket Strike Moon', cardPhase: 0, cardCost: 2, cardText: "Choose any opponent's moon or asteroid territory. Roll a 6-sided die. Your opponent must destroy units equal to the number rolled in the chosen territory." },
  { qty: 1, cardTitle: 'Aqua Brother', cardPhase: 0, cardCost: 3, cardText: "Choose a planet, then roll a 6-sided die. Consult the table to see the water/lava zone(s) affected. Destroy one unit in each territory in the zone(s) rolled." },
  { qty: 1, cardTitle: 'Nicky Boy', cardPhase: 0, cardCost: 3, cardText: "Choose a planet, then roll a 6-sided die. Consult the table to see the lunar or asteroid zone(s) affected. Destroy one unit in each territory in the zone(s) rolled." },
  { qty: 1, cardTitle: 'The Mother', cardPhase: 0, cardCost: 3, cardText: "Choose a planet, then roll a 6-sided die. Consult the table to see the land zone(s) affected. Destroy one unit in each territory in the zone(s) rolled." },
  { qty: 1, cardTitle: 'Armageddon', cardPhase: 0, cardCost: 4, cardText: "All players, in turn order, may play any number of nuclear command cards without paying the energy cost." }
];
//when to play card enum key
//0,before invasions
//1,opponent invades
//2,end game
//3,end of turn

export function buildDeck(cardData: Array<{ qty: number, cardTitle: string, cardPhase: number, cardCost: number, cardText: string }>): string[] {
  const deck: string[] = [];

  cardData.forEach(card => {
    for (let i = 0; i < card.qty; i++) {
      deck.push(card.cardTitle);
    }
  });

  return deck;
}



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