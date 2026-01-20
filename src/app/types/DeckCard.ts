// @/app/types/Deck.ts

export type DeckFormat = 'commander' | 'draft'

export interface DeckCard {
    id: string
    name: string
    quantity: number
    scryfallId?: string
    imageUrl?: string
    type?: string
    manaCost?: string
    colors?: string[]
    isCommander?: boolean
  }
  
  export interface DeckListParseResult {
    cards: Array<{
      quantity: number
      name: string
    }>
    commander?: string // Primary commander (for backward compat)
    commanders?: string[] // All commanders (1-2)
    errors: string[]
  }
  
  /**
  * Deck data versioning system
  * 
  * WHY: Prevent breaking user decks when we update data structures
  * HOW: Version all deck data and provide migration functions
  */
  
  export const CURRENT_DECK_VERSION = 4
  
  export interface DeckV1 {
  version?: 1 // Optional because old decks won't have it
  id: string
  name: string
  commander?: string
  commanderImageUrl?: string
  colors: string[]
  cards: Array<{
    id: string
    scryfallId?: string
    name: string
    quantity: number
    imageUrl?: string
    type?: string
    manaCost?: string
    colors?: string[]
    isCommander?: boolean // May or may not be present
  }>
  totalCards: number
  createdAt: number
  updatedAt: number
  }
  
  export type DeckCardZone = 'main' | 'commander' | 'sideboard'
  
  export interface DeckV2 {
  version: 2
  id: string
  name: string
  commander: string // Required
  commanderImageUrl?: string
  colors: string[]
  cards: Array<{
    id: string
    scryfallId: string
    name: string
    quantity: number
    imageUrl: string
    type: string
    manaCost: string
    colors: string[]
    isCommander: boolean // Required - marks which card is the commander
    zone?: DeckCardZone // Optional - for organizing deck into sections
  }>
  totalCards: number
  createdAt: number
  updatedAt: number
  }
  
  export interface DeckV3 {
  version: 3
  id: string
  name: string
  commanders: string[] // 1-2 commanders (ALWAYS an array)
  commanderImageUrls?: string[]
  colors: string[]
  cards: Array<{
    id: string
    scryfallId: string
    name: string
    quantity: number
    imageUrl: string
    type: string
    manaCost: string
    colors: string[]
    isCommander: boolean
    zone?: DeckCardZone
  }>
  totalCards: number
  createdAt: number
  updatedAt: number
  }

  export interface DeckV4 {
    version: 4
    id: string
    name: string
    format: DeckFormat  // ✅ NEW: Distinguish deck types
    
    // Commander-specific (optional for draft)
    commanders?: string[]  // ✅ Changed: Optional (only for commander format)
    commanderImageUrls?: string[]
    
    colors: string[]
    cards: Array<{
      id: string
      scryfallId: string
      name: string
      quantity: number
      imageUrl: string
      type: string
      manaCost: string
      colors: string[]
      isCommander: boolean  // ✅ Always false for draft
      zone?: DeckCardZone
    }>
    totalCards: number
    createdAt: number
    updatedAt: number
    
    // ✅ NEW: Draft-specific metadata
    draftMetadata?: {
      draftId: string           // Link back to original draft
      draftDate: number         // Timestamp
      cubeId?: string          // Which cube was drafted
      pickHistory?: string[]   // Cards picked in order (scryfallIds)
    }
  }
  
  // Current deck type (points to latest version)
  export type Deck = DeckV4
  
  /**
  * Migrate a deck from any version to the current version
  */
  export function migrateDeck(deck: any): DeckV4 {
    const version = deck.version || 1
    
    console.log(`[DeckMigration] Migrating deck "${deck.name}" from v${version} to v${CURRENT_DECK_VERSION}`)
    
    let migrated = deck
    
    if (version < 2) migrated = migrateDeckV1toV2(migrated)
    if (version < 3) migrated = migrateDeckV2toV3(migrated)
    if (version < 4) migrated = migrateDeckV3toV4(migrated)  // ✅ NEW
    
    return migrated
  }
  
  /**
  * Migrate V1 deck to V2
  * 
  * Changes:
  * - Add version: 2
  * - Ensure all cards have isCommander flag
  * - Ensure commander field is set
  * - Fill in missing required fields with defaults
  * - Auto-assign zones based on isCommander flag
  */
  function migrateDeckV1toV2(deckV1: DeckV1): DeckV2 {
  // Determine commander
  let commander = deckV1.commander
  
  // If no commander specified, use first card with isCommander flag
  if (!commander) {
    const commanderCard = deckV1.cards.find(c => c.isCommander)
    if (commanderCard) {
      commander = commanderCard.name
    } else if (deckV1.cards.length > 0) {
      // Fallback: first card is commander
      commander = deckV1.cards[0].name
    }
  }
  
  if (!commander) {
    console.error('[DeckMigration] Could not determine commander!')
    commander = 'Unknown Commander'
  }
  
  // Update all cards with proper isCommander flag and zone
  const migratedCards = deckV1.cards.map(card => {
    const isCommander = card.name.toLowerCase() === commander.toLowerCase()
    
    return {
      id: card.id,
      scryfallId: card.scryfallId || card.id,
      name: card.name,
      quantity: card.quantity,
      imageUrl: card.imageUrl || '',
      type: card.type || '',
      manaCost: card.manaCost || '',
      colors: card.colors || [],
      isCommander: isCommander,
      zone: (isCommander ? 'commander' : 'main') as DeckCardZone,
    }
  })
  
  const deckV2: DeckV2 = {
    version: 2,
    id: deckV1.id,
    name: deckV1.name,
    commander: commander,
    commanderImageUrl: deckV1.commanderImageUrl,
    colors: deckV1.colors,
    cards: migratedCards,
    totalCards: deckV1.totalCards,
    createdAt: deckV1.createdAt,
    updatedAt: Date.now(),
  }
  
  console.log(`[DeckMigration] ✅ Migrated deck "${deckV1.name}" to v2`)
  
  return deckV2
  }
  
  /**
  * Migrate V2 deck to V3
  * 
  * Changes:
  * - commander (string) → commanders (string[])
  * - commanderImageUrl (string) → commanderImageUrls (string[])
  */
  function migrateDeckV2toV3(deckV2: DeckV2): DeckV3 {
  return {
    version: 3,
    id: deckV2.id,
    name: deckV2.name,
    commanders: [deckV2.commander], // Wrap single commander in array
    commanderImageUrls: deckV2.commanderImageUrl ? [deckV2.commanderImageUrl] : undefined,
    colors: deckV2.colors,
    cards: deckV2.cards,
    totalCards: deckV2.totalCards,
    createdAt: deckV2.createdAt,
    updatedAt: Date.now()
  }
  }

  /**
   * Migrate V3 deck to V4
   * 
   * Changes:
   * - Add format: 'commander' (all existing decks are commander)
   * - Keep commanders field (already required for V3)
   */
  function migrateDeckV3toV4(deckV3: DeckV3): DeckV4 {
    return {
      version: 4,
      id: deckV3.id,
      name: deckV3.name,
      format: 'commander',  // ✅ All existing decks are commander format
      commanders: deckV3.commanders,  // Keep as-is
      commanderImageUrls: deckV3.commanderImageUrls,
      colors: deckV3.colors,
      cards: deckV3.cards,
      totalCards: deckV3.totalCards,
      createdAt: deckV3.createdAt,
      updatedAt: Date.now()
    }
  }
  
  /**
  * Check if a deck needs migration
  */
  export function needsMigration(deck: any): boolean {
  const version = deck.version || 4
  return version < CURRENT_DECK_VERSION
  }
  
  /**
  * Helper function to ensure deck cards have zones assigned
  * Useful for decks that might be missing zone data
  */
  export function ensureCardZones(deck: DeckV3): DeckV3 {
    const cardsWithZones = deck.cards.map(card => ({
      ...card,
      zone: card.zone || (card.isCommander ? 'commander' : 'main') as DeckCardZone
    }))
    
    return {
      ...deck,
      cards: cardsWithZones
    }
  }

  /**
 * Validate a deck based on its format
 */
export function validateDeck(deck: DeckV4): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (deck.format === 'commander') {
    // Commander format rules
    if (!deck.commanders || deck.commanders.length === 0) {
      errors.push('Commander deck must have at least one commander')
    }
    if (deck.commanders && deck.commanders.length > 2) {
      errors.push('Commander deck can have at most 2 commanders (partner)')
    }
    if (deck.totalCards !== 100) {
      errors.push('Commander deck must have exactly 100 cards')
    }
  } else if (deck.format === 'draft') {
    // Draft format rules
    if (deck.totalCards < 40) {
      errors.push('Draft deck must have at least 40 cards')
    }
    if (deck.commanders && deck.commanders.length > 0) {
      errors.push('Draft deck cannot have commanders')
    }
    if (!deck.draftMetadata) {
      errors.push('Draft deck must have draftMetadata')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Check if deck can be used in a specific format
 */
export function isDeckValidForFormat(deck: DeckV4, format: DeckFormat): boolean {
  if (deck.format !== format) return false
  const validation = validateDeck(deck)
  return validation.valid
}
  

export const BASIC_LANDS = {
  W: {
    scryfallId: '8365ab45-6d78-47ad-a6ed-282069b0fabc',  // Plains (most recent)
    name: 'Plains',
    type: 'Basic Land — Plains',
    colors: ['W'],
    imageUrl: 'https://cards.scryfall.io/normal/front/8/3/8365ab45-6d78-47ad-a6ed-282069b0fabc.jpg'
  },
  U: {
    scryfallId: 'b2c6aa39-2d2a-459c-a555-fb48ba993373',  // Island
    name: 'Island',
    type: 'Basic Land — Island',
    colors: ['U'],
    imageUrl: 'https://cards.scryfall.io/normal/front/b/2/b2c6aa39-2d2a-459c-a555-fb48ba993373.jpg'
  },
  B: {
    scryfallId: '96a33518-8b67-4fa2-8b48-6d7c6c1e8b42',  // Swamp
    name: 'Swamp',
    type: 'Basic Land — Swamp',
    colors: ['B'],
    imageUrl: 'https://cards.scryfall.io/normal/front/9/6/96a33518-8b67-4fa2-8b48-6d7c6c1e8b42.jpg'
  },
  R: {
    scryfallId: '8cf5e8a9-c6c7-4562-8e1b-f8e650cd42e8',  // Mountain
    name: 'Mountain',
    type: 'Basic Land — Mountain',
    colors: ['R'],
    imageUrl: 'https://cards.scryfall.io/normal/front/8/c/8cf5e8a9-c6c7-4562-8e1b-f8e650cd42e8.jpg'
  },
  G: {
    scryfallId: '8efa1a9e-6f74-44a3-8556-f2d3e6b3b3e1',  // Forest
    name: 'Forest',
    type: 'Basic Land — Forest',
    colors: ['G'],
    imageUrl: 'https://cards.scryfall.io/normal/front/8/e/8efa1a9e-6f74-44a3-8556-f2d3e6b3b3e1.jpg'
  }
} as const

export type BasicLandColor = keyof typeof BASIC_LANDS