// @/app/types/Deck.ts

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
  
  export const CURRENT_DECK_VERSION = 3
  
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
  
  // Current deck type (points to latest version)
  export type Deck = DeckV3
  
  /**
  * Migrate a deck from any version to the current version
  */
  export function migrateDeck(deck: any): DeckV3 {
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
  * Check if a deck needs migration
  */
  export function needsMigration(deck: any): boolean {
  const version = deck.version || 1
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