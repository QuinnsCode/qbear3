// GameState.ts - Updated types with bidding system support
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
}


export interface Territory {
  id: string
  name: string
  ownerId?: string
  machineCount: number
  connections: string[]
  landCommander?: string // playerId who owns the land commander here
  diplomatCommander?: string // playerId who owns the diplomat commander here
  nukeCommander?: string // playerId who owns the nuke commander here
  waterCommander?: string // playerId who owns the water commander here
  spaceBase?: string // playerId who owns the space base here
  modifiers?: Record<string, any>
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

// 🎯 ENHANCED: Game status with bidding
export interface GameState {
  id: string
  status: 'setup' | 'bidding' | 'playing' | 'paused' | 'finished'
  setupPhase?: 'units' | 'land_commander' | 'diplomat_commander' | 'space_base' | 'complete'
  
  // ✅ YEARS (1-5, then game ends)
  currentYear: 1 | 2 | 3 | 4 | 5
  
  // ✅ PLAYER PHASES (1-7 per player turn) - YOUR ORIGINAL SYSTEM
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6 | 7
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

// 🎯 NEW: Bidding-specific action types
export type BiddingActionType = 
  | 'place_bid'           // Player submits secret bid
  | 'reveal_bids'         // Show all bids
  | 'resolve_tiebreak'    // Handle tied bids
  | 'start_year_turns'    // Begin main turns

// type helpers
export type CurrentPhase = GameState['currentPhase']
export type GameStatus = GameState['status']
export type SetupPhase = NonNullable<GameState['setupPhase']>
export type CurrentYear = GameState['currentYear']