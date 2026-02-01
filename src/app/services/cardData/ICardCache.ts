// src/app/services/cardData/ICardCache.ts
import type { CardData, CardSearchResult, AutocompleteResult, OracleData, PrintingData } from './types'

/**
 * Abstract card cache interface
 * Implementations: KVCardCache, DurableObjectCache, etc.
 *
 * Supports both legacy CardData and new Oracle/Printing separation
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

  // ========== NEW: Oracle/Printing Separation ==========

  /**
   * Get oracle data by oracle ID
   */
  getOracle?(oracleId: string): Promise<OracleData | null>

  /**
   * Store oracle data
   */
  setOracle?(oracle: OracleData): Promise<void>

  /**
   * Get printing data by print ID
   */
  getPrinting?(printId: string): Promise<PrintingData | null>

  /**
   * Store printing data
   */
  setPrinting?(printing: PrintingData): Promise<void>

  /**
   * Get all printings for an oracle ID
   * Returns list of print IDs
   */
  getPrintingsForOracle?(oracleId: string): Promise<string[]>

  /**
   * Add a printing to an oracle's printing list
   */
  addPrintingToOracle?(oracleId: string, printId: string): Promise<void>
}