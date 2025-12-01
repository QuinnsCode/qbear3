// src/app/services/cardData/ICardCache.ts
import type { CardData, CardSearchResult, AutocompleteResult } from './types'

/**
 * Abstract card cache interface
 * Implementations: KVCardCache, DurableObjectCache, etc.
 */
export interface ICardCache {
  /**
   * Get a card by ID from cache
   */
  getCard(id: string): Promise<CardData | null>
  
  /**
   * Get a card by name from cache
   */
  getCardByName(name: string): Promise<CardData | null>
  
  /**
   * Store a card in cache
   */
  setCard(card: CardData): Promise<void>
  
  /**
   * Store multiple cards in cache (batch)
   */
  setCards(cards: CardData[]): Promise<void>
  
  /**
   * Get cached search results
   */
  getSearchResults(query: string, page: number): Promise<CardSearchResult | null>
  
  /**
   * Store search results in cache
   */
  setSearchResults(query: string, page: number, results: CardSearchResult): Promise<void>
  
  /**
   * Get cached autocomplete suggestions
   */
  getAutocomplete(query: string): Promise<AutocompleteResult | null>
  
  /**
   * Store autocomplete suggestions in cache
   */
  setAutocomplete(query: string, results: AutocompleteResult): Promise<void>
  
  /**
   * Check if a card exists in cache
   */
  hasCard(id: string): Promise<boolean>
  
  /**
   * Delete a card from cache (for invalidation)
   */
  deleteCard(id: string): Promise<void>
  
  /**
   * Clear all cache (optional, for maintenance)
   */
  clearAll?(): Promise<void>
}