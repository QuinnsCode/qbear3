// src/app/services/cardData/ICardProvider.ts
import type { CardData, CardSearchResult, AutocompleteResult, CardIdentifier } from './types'

/**
 * Abstract card data provider interface
 * Implementations: ScryfallProvider, TCGPlayerProvider, etc.
 */
export interface ICardProvider {
  /**
   * Provider identifier
   */
  readonly name: string
  
  /**
   * Get a card by ID
   */
  getCard(id: string): Promise<CardData>
  
  /**
   * Get a card by name (with optional set filter)
   */
  getCardByName(name: string, setCode?: string): Promise<CardData>
  
  /**
   * Search for cards
   */
  searchCards(query: string, page?: number): Promise<CardSearchResult>
  
  /**
   * Get autocomplete suggestions
   */
  autocomplete(query: string): Promise<AutocompleteResult>
  
  /**
   * Get multiple cards by identifiers (batch fetch)
   */
  getCardsByIdentifiers(identifiers: CardIdentifier[]): Promise<CardData[]>
  
  /**
   * Get a random card (optional query filter)
   */
  getRandomCard(query?: string): Promise<CardData>

  /**
   * Get all printings of a card by oracle ID
   * Returns all versions/sets of the same card
   * Sorted by release date (newest first)
   */
  getAllPrintings?(oracleId: string): Promise<CardData[]>
}