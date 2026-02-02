// @/app/types/Deck.ts

export type DeckCardZone = 'main' | 'commander' | 'sideboard' | 'contemplating'
export type DeckFormat = 'commander' | 'draft'  // ✅ NEW

export const DECK_LIMITS = {
  commander: 2,
  draft: 10
} as const

// ✅ Basic Lands from Foundations set (fresh URLs verified working)
export const BASIC_LANDS = {
  W: {
    scryfallId: '4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3',
    name: 'Plains',
    type: 'Basic Land — Plains',
    colors: ['W'],
    imageUrl: 'https://cards.scryfall.io/normal/front/4/e/4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3.jpg?1730489617',
    manaCost: ''
  },
  U: {
    scryfallId: '17e2b637-72b1-4457-aaba-66d51107be4c',
    name: 'Island',
    type: 'Basic Land — Island',
    colors: ['U'],
    imageUrl: 'https://cards.scryfall.io/normal/front/1/7/17e2b637-72b1-4457-aaba-66d51107be4c.jpg?1730489625',
    manaCost: ''
  },
  B: {
    scryfallId: '319bc1f0-ee42-44e5-b08b-735613ded2ba',
    name: 'Swamp',
    type: 'Basic Land — Swamp',
    colors: ['B'],
    imageUrl: 'https://cards.scryfall.io/normal/front/3/1/319bc1f0-ee42-44e5-b08b-735613ded2ba.jpg?1730489632',
    manaCost: ''
  },
  R: {
    scryfallId: '279df7e2-2a3b-464a-a7df-e91da28e3a8c',
    name: 'Mountain',
    type: 'Basic Land — Mountain',
    colors: ['R'],
    imageUrl: 'https://cards.scryfall.io/normal/front/2/7/279df7e2-2a3b-464a-a7df-e91da28e3a8c.jpg?1730489639',
    manaCost: ''
  },
  G: {
    scryfallId: 'd232fcc2-12f6-401a-b1aa-ddff11cb9378',
    name: 'Forest',
    type: 'Basic Land — Forest',
    colors: ['G'],
    imageUrl: 'https://cards.scryfall.io/normal/front/d/2/d232fcc2-12f6-401a-b1aa-ddff11cb9378.jpg?1730489646',
    manaCost: ''
  }
} as const

export type BasicLandColor = keyof typeof BASIC_LANDS

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
  zone?: DeckCardZone
  cmc?: number
  rarity?: string
  oracle_text?: string
  rulings?: Array<{
    source: string
    published_at: string
    comment: string
  }>
  legalities?: Record<string, string>
}

export interface DeckListParseResult {
  cards: Array<{
    quantity: number
    name: string
  }>
  commander?: string
  commanders?: string[]
  errors: string[]
}

/**
 * Deck data versioning system
 * 
 * WHY: Prevent breaking user decks when we update data structures
 * HOW: Version all deck data and provide migration functions
 */

export const CURRENT_DECK_VERSION = 4  // ✅ UPDATED

export interface DeckV1 {
  version?: 1
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
    isCommander?: boolean
  }>
  totalCards: number
  createdAt: number
  updatedAt: number
}

export interface DeckV2 {
  version: 2
  id: string
  name: string
  commander: string
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
    isCommander: boolean
    zone?: DeckCardZone
  }>
  totalCards: number
  createdAt: number
  updatedAt: number
}

export interface DeckV3 {
  version: 3
  id: string
  name: string
  commanders: string[]
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

// ✅ NEW: V4 adds format support
export interface DeckV4 {
  version: 4
  id: string
  name: string
  format: DeckFormat  // ✅ NEW: 'commander' or 'draft'
  
  // Optional for draft decks
  commanders?: string[]
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
    cmc?: number
    rarity?: string
    oracle_text?: string
    rulings?: Array<{
      source: string
      published_at: string
      comment: string
    }>
    legalities?: Record<string, string>
  }>
  totalCards: number
  createdAt: number
  updatedAt: number
  
  // ✅ NEW: Draft-specific metadata
  draftMetadata?: {
    draftId: string
    draftDate: number
    cubeId?: string
    pickHistory?: string[]
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
  
  // Apply migrations in sequence
  if (version < 2) {
    migrated = migrateDeckV1toV2(migrated)
  }
  
  if (version < 3) {
    migrated = migrateDeckV2toV3(migrated)
  }
  
  if (version < 4) {
    migrated = migrateDeckV3toV4(migrated)  // ✅ NEW
  }
  
  return migrated
}

/**
 * Migrate V1 deck to V2
 */
function migrateDeckV1toV2(deckV1: DeckV1): DeckV2 {
  let commander = deckV1.commander
  
  if (!commander) {
    const commanderCard = deckV1.cards.find(c => c.isCommander)
    if (commanderCard) {
      commander = commanderCard.name
    } else if (deckV1.cards.length > 0) {
      commander = deckV1.cards[0].name
    }
  }
  
  if (!commander) {
    console.error('[DeckMigration] Could not determine commander!')
    commander = 'Unknown Commander'
  }
  
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
 */
function migrateDeckV2toV3(deckV2: DeckV2): DeckV3 {
  return {
    version: 3,
    id: deckV2.id,
    name: deckV2.name,
    commanders: [deckV2.commander],
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
 * - Add format: 'commander' (all existing decks are commander format)
 * - Keep commanders field (already present in V3)
 */
function migrateDeckV3toV4(deckV3: DeckV3): DeckV4 {
  console.log(`[DeckMigration] ✅ Migrating deck "${deckV3.name}" to v4 (adding format field)`)
  
  return {
    version: 4,
    id: deckV3.id,
    name: deckV3.name,
    format: 'commander',  // ✅ All existing decks are commander format
    commanders: deckV3.commanders,
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
  const version = deck.version || 1
  return version < CURRENT_DECK_VERSION
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
 * Check if a user can create another deck of a specific format
 */
export function canCreateDeck(
  existingDecks: DeckV4[], 
  format: DeckFormat
): { canCreate: boolean; currentCount: number; limit: number } {
  const currentCount = existingDecks.filter(d => d.format === format).length
  const limit = DECK_LIMITS[format]
  
  return {
    canCreate: currentCount < limit,
    currentCount,
    limit
  }
}

/**
 * Get decks by format
 */
export function getDecksByFormat(decks: DeckV4[], format: DeckFormat): DeckV4[] {
  return decks.filter(d => d.format === format)
}

/**
 * Helper function to ensure deck cards have zones assigned
 */
export function ensureCardZones(deck: DeckV4): DeckV4 {
  const cardsWithZones = deck.cards.map(card => ({
    ...card,
    zone: card.zone || (card.isCommander ? 'commander' : 'main') as DeckCardZone
  }))
  
  return {
    ...deck,
    cards: cardsWithZones
  }
}