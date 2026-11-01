// src/app/services/cardData/types.ts
/**
 * Domain types for card data - provider-agnostic
 * This allows us to swap Scryfall for other providers without changing cache/business logic
 *
 * CardData is one printing with its oracle (rules) fields, keyed by the print id.
 */

/**
 * One printing of a card, with the oracle (rules) fields alongside
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
  
  // Card identifier for lookups
  export interface CardIdentifier {
    id?: string
    name?: string
    setCode?: string
    collectorNumber?: string
  }