// src/app/services/cardData/types.ts
/**
 * Domain types for card data - provider-agnostic
 * This allows us to swap Scryfall for other providers without changing cache/business logic
 *
 * Architecture:
 * - OracleData: Game rules (same across all printings)
 * - PrintingData: Specific printing (art, set, price)
 * - CardData: Combined oracle + printing (for backward compatibility)
 */

/**
 * Oracle data - game rules and text (same across all printings)
 * Cached by oracle ID
 */
export interface OracleData {
  oracleId: string              // Unique oracle ID (e.g., Scryfall oracle_id)
  name: string

  // Game rules
  manaCost?: string
  cmc: number
  typeLine: string
  oracleText?: string
  power?: string
  toughness?: string
  loyalty?: string
  colors?: string[]
  colorIdentity: string[]

  // Format legality (same across printings)
  legalities?: Record<string, 'legal' | 'not_legal' | 'restricted' | 'banned'>

  // Metadata
  provider: string
  lastUpdated: number
}

/**
 * Printing data - specific version with unique art
 * Cached by print ID
 */
export interface PrintingData {
  printId: string               // Unique print ID (e.g., Scryfall card ID)
  oracleId: string              // Reference to oracle data

  // Set information
  setCode: string
  setName: string
  collectorNumber: string
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special'
  releasedAt?: string           // ISO date

  // Visual/flavor
  imageUris?: {
    small?: string
    normal?: string
    large?: string
    artCrop?: string
    png?: string
  }
  artist?: string
  flavorText?: string

  // Pricing (varies by printing)
  prices?: {
    usd?: string | null
    usdFoil?: string | null
    eur?: string | null
    tix?: string | null
  }

  // Metadata
  provider: string
  externalUri?: string
  lastUpdated: number
}

/**
 * Combined card data (oracle + printing)
 * Used for backward compatibility and simplified lookups
 */
export interface CardData {
    // Core identifiers
    id: string                    // Print ID (for backward compat)
    oracleId?: string             // Oracle ID (if available)
    name: string

    // Game data (from oracle)
    manaCost?: string
    cmc: number                   // Converted mana cost
    typeLine: string
    oracleText?: string
    power?: string
    toughness?: string
    loyalty?: string
    colors?: string[]
    colorIdentity: string[]

    // Set/rarity (from printing)
    setCode: string
    setName: string
    collectorNumber: string
    rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special'

    // Images (from printing)
    imageUris?: {
      small?: string
      normal?: string
      large?: string
      artCrop?: string
    }

    // Pricing (from printing)
    prices?: {
      usd?: string | null
      usdFoil?: string | null
      eur?: string | null
      tix?: string | null
    }

    // Format legality (from oracle)
    legalities?: Record<string, 'legal' | 'not_legal' | 'restricted' | 'banned'>

    // Metadata
    provider: string              // 'scryfall', 'tcgplayer', etc.
    externalUri?: string          // Link to provider page
    lastUpdated: number           // Unix timestamp
  }
  
  // Search result structure
  export interface CardSearchResult {
    cards: CardData[]
    totalCards: number
    hasMore: boolean
    nextPage?: number
  }
  
  // Autocomplete result
  export interface AutocompleteResult {
    suggestions: string[]
  }
  
  // Card identifier for lookups
  export interface CardIdentifier {
    id?: string
    name?: string
    setCode?: string
    collectorNumber?: string
  }