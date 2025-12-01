// src/app/services/cardData/types.ts
/**
 * Domain types for card data - provider-agnostic
 * This allows us to swap Scryfall for other providers without changing cache/business logic
 */

// Generic card data structure
export interface CardData {
    // Core identifiers
    id: string                    // Our internal ID (provider-specific)
    name: string
    
    // Game data
    manaCost?: string
    cmc: number                   // Converted mana cost
    typeLine: string
    oracleText?: string
    power?: string
    toughness?: string
    loyalty?: string
    colors?: string[]
    colorIdentity: string[]
    
    // Set/rarity
    setCode: string
    setName: string
    collectorNumber: string
    rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special'
    
    // Images
    imageUris?: {
      small?: string
      normal?: string
      large?: string
      artCrop?: string
    }
    
    // Pricing (optional)
    prices?: {
      usd?: string | null
      usdFoil?: string | null
      eur?: string | null
      tix?: string | null
    }
    
    // Format legality
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