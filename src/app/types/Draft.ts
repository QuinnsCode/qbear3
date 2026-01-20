// app/types/Draft.ts

export interface CubeCard {
    scryfallId: string
    name: string
    imageUrl?: string
    colors: string[]
    types: string[]
    rarity: string
    cmc: number
    pickPriority?: number
  }
  
  export interface DraftConfig {
    format: 'booster'
    packSize: number        // 15
    packsPerPlayer: number  // 3
    pickCount: number       // 1 or 2 cards per pick
    playerCount: number
    timerEnabled: boolean
    pickTimerSeconds?: number
  }
  
  export interface Pack {
    id: string
    cards: string[]  // scryfallId strings
    ownerId: string  // who's currently picking
  }
  
  export interface DraftPlayer {
    id: string
    name: string
    isAI: boolean
    draftPool: string[]  // All cards drafted (scryfallIds)
    currentPack?: Pack
    
    // ✅ NEW: Deck building (only for humans)
    deckConfiguration?: {
      mainDeck: Array<{ scryfallId: string; quantity: number }>
      sideboard: Array<{ scryfallId: string; quantity: number }>
      basics: { W: number; U: number; B: number; R: number; G: number }
      totalCards: number  // mainDeck + basics count
      isFinalized: boolean
      exportedDeckId?: string  // Link to created Deck
    }
  }
  
  export interface DraftState {
    id: string
    format: 'booster'
    config: DraftConfig
    status: 'waiting' | 'drafting' | 'complete'  // ✅ Remove 'deck_building' - not needed
    players: DraftPlayer[]
    currentRound: number  // 0-2 (3 rounds)
    currentPick: number   // 0-14 (15 picks per pack)
    createdAt: Date
    remainingPacks?: Pack[][]
    playersWhoPickedThisRound?: string[]  // Track who picked THIS ROUND
    updatedAt?: Date
    cubeCards?: CubeCard[]  // ✅ NEW: Store cube cards for deck building
  }
  
  export const DEFAULT_DRAFT_CONFIG: DraftConfig = {
    format: 'booster',
    packSize: 14,
    packsPerPlayer: 3,
    pickCount: 2,
    playerCount: 3,
    timerEnabled: false
  }
  
  export interface DraftAction {
    id: string
    type: 'make_pick' | 'finalize_deck'  // ✅ UPDATED: Add finalize_deck
    playerId: string
    data: {
      cardIds?: string[]  // For make_pick
      deckConfig?: {  // ✅ NEW: For finalize_deck
        mainDeck: Array<{ scryfallId: string; quantity: number }>
        sideboard: Array<{ scryfallId: string; quantity: number }>
        basics: { W: number; U: number; B: number; R: number; G: number }
      }
      exportedDeckId?: string  // ✅ NEW: For finalize_deck
      [key: string]: any
    }
    timestamp: Date
  }