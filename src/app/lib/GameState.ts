// GameState.ts - Updated types with bidding system and Build & Hire support
export type AIVibe = 'aggro' | 'defensive' | 'evasive' | 'efficient'

export interface Player {
  id: string
  name: string
  color: string
  cards: Card[]
  territories: string[]
  isActive: boolean
  pendingDecision?: PendingDecision
  energy: number
  aiVibe?: 'aggressive' | 'defensive' | 'balanced' | 'efficient'
  
  // ✅ SETUP PHASE: Unit placement tracking
  remainingUnitsToPlace?: number  // For setup phase
  unitsPlacedThisTurn?: number   // For setup phase (max 3 per turn)
  
  // ✅ PLAYING PHASE: Enhanced unit tracking
  unitsToPlaceThisTurn?: number  // Total units to place this turn (base + space base bonus)
  
  // ✅ BIDDING: Bidding system properties
  currentBid?: number
  totalEnergySpentOnBids?: number
  
  // 🆕 BUILD & HIRE: Track purchased items during Phase 2
  purchasedItems?: string[]  // Array of 'land', 'diplomat', 'naval', 'nuclear', 'space_base_123456'
}

export interface Territory {
  id: string
  name: string
  ownerId?: string
  machineCount: number
  connections: string[]
  landCommander?: string      // playerId who owns the land commander here
  diplomatCommander?: string  // playerId who owns the diplomat commander here
  spaceBase?: string         // playerId who owns the space base here
  modifiers?: Record<string, any>
  
  // 🆕 BUILD & HIRE: Additional commander types for main game
  navalCommander?: string     // playerId who owns the naval commander here  
  nuclearCommander?: string   // playerId who owns the nuclear commander here
}

export interface Card {
  id: string
  type: 'commander' | 'energy' | 'territory' | 'special'
  name: string
  data: Record<string, any>
}

export interface PendingDecision {
  type: 'select_territory' | 'play_card' | 'place_bid' | 'attack' | 'fortify'
  data?: Record<string, any>
  timeoutAt?: Date
}

// 🎯 NEW: Bidding system types
export interface YearlyBidding {
  year: number                           // Current year (1-5)
  bidsSubmitted: Record<string, number>  // playerId → bid amount (revealed)
  bidsRevealed: boolean                  // Are bids public yet?
  highestBidder?: string                 // Winner of bidding
  tiebreakRoll?: Record<string, number>  // If tied, dice rolls
  finalTurnOrder?: string[]              // Resulting turn order for this year
  playersWaitingToBid?: string[]         // Players who haven't bid yet
}

export interface GameAction {
  id: string
  type: string
  playerId: string
  timestamp: Date
  data: Record<string, any>
  previousState?: Partial<GameState>
}

// 🎯 NEW: Bidding-specific action types
export type BiddingActionType = 
  | 'place_bid'           // Player submits secret bid
  | 'reveal_bids'         // Show all bids
  | 'resolve_tiebreak'    // Handle tied bids
  | 'start_year_turns'    // Begin main turns

// 🆕 BUILD & HIRE: Phase 2 action types
export type BuildHireActionType = 
  | 'purchase_commander'      // Buy a commander (3 energy)
  | 'place_commander_game'    // Place purchased commander on territory
  | 'purchase_space_base'     // Buy a space base (5 energy)
  | 'place_space_base_game'   // Place purchased space base on territory

// 🎯 COMPLETE: All game action types
export type GameActionType = 
  | 'advance_phase'
  | 'advance_turn'
  | 'player_decision'
  | 'deploy_machines'
  | 'place_unit'
  | 'place_commander'          // Setup phase commander placement
  | 'place_space_base'         // Setup phase space base placement
  | 'collect_energy'
  | 'spend_energy'
  | 'advance_player_phase'
  | 'start_main_game'
  | 'attack_territory'
  | 'fortify_territory'
  | 'play_card'
  | BiddingActionType
  | BuildHireActionType

// 🎯 ENHANCED: Game status with bidding
export interface GameState {
  id: string
  status: 'setup' | 'bidding' | 'playing' | 'paused' | 'finished'
  setupPhase?: 'units' | 'land_commander' | 'diplomat_commander' | 'space_base' | 'complete'
  
  // ✅ YEARS (1-5, then game ends)
  currentYear: 1 | 2 | 3 | 4 | 5
  
  // ✅ PLAYER PHASES (1-6 per player turn) - Updated for correct phase count
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6
  currentPlayerIndex: number
  
  // 🎯 Bidding state
  bidding?: YearlyBidding
  yearlyTurnOrders?: Record<number, string[]>
  
  players: Player[]
  turnOrder: string[]
  activeTurnOrder: string[]
  territories: Record<string, Territory>
  actions: GameAction[]
  currentActionIndex: number
  setupDeployPhase?: number
  createdAt: Date
  updatedAt: Date
}

// type helpers
export type CurrentPhase = GameState['currentPhase']
export type GameStatus = GameState['status']
export type SetupPhase = NonNullable<GameState['setupPhase']>
export type CurrentYear = GameState['currentYear']

// 🎯 PHASE MAPPING: Human-readable phase names
export const PHASE_NAMES: Record<CurrentPhase, string> = {
  1: 'Collect & Deploy',
  2: 'Build & Hire',
  3: 'Buy Cards',
  4: 'Play Cards', 
  5: 'Invade',
  6: 'Fortify'
}

// 🎯 COMMANDER TYPES: Available commander types
export type CommanderType = 'land' | 'diplomat' | 'naval' | 'nuclear'

// 🎯 SETUP VALIDATION: Helper to check setup completion
export interface SetupProgress {
  unitsRemaining: number
  hasLandCommander: boolean
  hasDiplomatCommander: boolean
  hasSpaceBase: boolean
  isComplete: boolean
}

// 🎯 BUILD & HIRE: Purchase strategy for AI
export interface PurchaseStrategy {
  commanders: CommanderType[]  // Which commanders to buy in order
  spaceBases: number          // How many space bases to buy  
  totalCost: number          // Expected total cost
  priority: 'commanders' | 'space_bases' | 'mixed'
}

// 🎯 BUILD & HIRE: Purchase validation
export interface PurchaseValidation {
  canAfford: boolean
  alreadyOwns: boolean
  hasValidTerritory: boolean
  errorMessage?: string
}

// 🎯 BUILD & HIRE: Constants
export const COMMANDER_COSTS: Record<CommanderType, number> = {
  land: 3,
  diplomat: 3,
  naval: 3,
  nuclear: 3
}

export const SPACE_BASE_COST = 5

// 🎯 BUILD & HIRE: Helper to get owned commanders
export function getOwnedCommanders(player: Player, territories: Record<string, Territory>): CommanderType[] {
  const owned: CommanderType[] = []
  
  player.territories.forEach(tId => {
    const territory = territories[tId]
    if (territory?.landCommander === player.id) owned.push('land')
    if (territory?.diplomatCommander === player.id) owned.push('diplomat')
    if (territory?.navalCommander === player.id) owned.push('naval')
    if (territory?.nuclearCommander === player.id) owned.push('nuclear')
  })
  
  return owned
}

// 🎯 BUILD & HIRE: Helper to count space bases
export function getSpaceBaseCount(player: Player, territories: Record<string, Territory>): number {
  return player.territories.filter(tId => 
    territories[tId]?.spaceBase === player.id
  ).length
}

export interface PurchaseStrategy {
  commanders: CommanderType[]
  spaceBases: number
  totalCost: number
  priority: 'commanders' | 'space_bases' | 'mixed'
}