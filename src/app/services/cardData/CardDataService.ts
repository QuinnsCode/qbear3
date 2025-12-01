// src/app/services/cardData/CardDataService.ts
import type { ICardProvider } from './ICardProvider'
import type { ICardCache } from './ICardCache'
import type { CardData, CardSearchResult, AutocompleteResult, CardIdentifier } from './types'

/**
 * Unified card data service with cache-first strategy
 * Uses dependency injection for both provider and cache
 * 
 * Usage:
 *   const provider = new ScryfallProvider()
 *   const cache = new KVCardCache(env.CARDS_KV)
 *   const service = new CardDataService(provider, cache)
 */
export class CardDataService {
  constructor(
    private provider: ICardProvider,
    private cache: ICardCache
  ) {}
  
  /**
   * Get a card by ID (cache-first)
   */
  async getCard(id: string): Promise<CardData> {
    // Try cache first
    const cached = await this.cache.getCard(id)
    if (cached) {
      console.log(`[CardData] Cache HIT for card ID: ${id}`)
      return cached
    }
    
    // Cache miss - fetch from provider
    console.log(`[CardData] Cache MISS for card ID: ${id} - fetching from ${this.provider.name}`)
    const card = await this.provider.getCard(id)
    
    // Store in cache for next time
    await this.cache.setCard(card)
    
    return card
  }
  
  /**
   * Get a card by name (cache-first)
   */
  async getCardByName(name: string, setCode?: string): Promise<CardData> {
    // Try cache first (only if no set filter, since cache key is just name)
    if (!setCode) {
      const cached = await this.cache.getCardByName(name)
      if (cached) {
        console.log(`[CardData] Cache HIT for card name: ${name}`)
        return cached
      }
    }
    
    // Cache miss or set-filtered - fetch from provider
    console.log(`[CardData] Cache MISS for card name: ${name} - fetching from ${this.provider.name}`)
    const card = await this.provider.getCardByName(name, setCode)
    
    // Store in cache (only if no set filter to avoid conflicts)
    if (!setCode) {
      await this.cache.setCard(card)
    }
    
    return card
  }
  
  /**
   * Search for cards (cache-first for searches)
   */
  async searchCards(query: string, page: number = 1): Promise<CardSearchResult> {
    // Try cache first
    const cached = await this.cache.getSearchResults(query, page)
    if (cached) {
      console.log(`[CardData] Cache HIT for search: "${query}" page ${page}`)
      return cached
    }
    
    // Cache miss - fetch from provider
    console.log(`[CardData] Cache MISS for search: "${query}" - fetching from ${this.provider.name}`)
    const results = await this.provider.searchCards(query, page)
    
    // Store search results in cache
    await this.cache.setSearchResults(query, page, results)
    
    // Also cache individual cards from results
    if (results.cards.length > 0) {
      await this.cache.setCards(results.cards)
    }
    
    return results
  }
  
  /**
   * Get autocomplete suggestions (cache-first)
   */
  async autocomplete(query: string): Promise<AutocompleteResult> {
    // Try cache first
    const cached = await this.cache.getAutocomplete(query)
    if (cached) {
      console.log(`[CardData] Cache HIT for autocomplete: "${query}"`)
      return cached
    }
    
    // Cache miss - fetch from provider
    console.log(`[CardData] Cache MISS for autocomplete: "${query}" - fetching from ${this.provider.name}`)
    const results = await this.provider.autocomplete(query)
    
    // Store in cache
    await this.cache.setAutocomplete(query, results)
    
    return results
  }
  
  /**
   * Get multiple cards by identifiers (batch operation with cache)
   * CONSERVATIVE BATCHING: 10 cards per batch for maximum reliability
   */
  async getCardsByIdentifiers(identifiers: CardIdentifier[]): Promise<CardData[]> {
    const results: CardData[] = []
    const missingIdentifiers: CardIdentifier[] = []
    const SCRYFALL_FETCH_DELAY_MS = 150
    
    // Check cache for each card (only for ID-based lookups)
    for (const identifier of identifiers) {
      if (identifier.id) {
        const cached = await this.cache.getCard(identifier.id)
        if (cached) {
          results.push(cached)
          continue
        }
      } else if (identifier.name && !identifier.setCode) {
        const cached = await this.cache.getCardByName(identifier.name)
        if (cached) {
          results.push(cached)
          continue
        }
      }
      
      // Cache miss - add to missing list
      missingIdentifiers.push(identifier)
    }
    
    console.log(`[CardData] Batch request: ${results.length} cached, ${missingIdentifiers.length} to fetch`)
    
    // Fetch missing cards from provider in batches (CONSERVATIVE: 10 cards per batch)
    if (missingIdentifiers.length > 0) {
      const BATCH_SIZE = 10 // Conservative batch size for reliability
      
      // Create all batches
      const batches: CardIdentifier[][] = []
      for (let i = 0; i < missingIdentifiers.length; i += BATCH_SIZE) {
        batches.push(missingIdentifiers.slice(i, i + BATCH_SIZE))
      }
      
      console.log(`[CardData] Fetching ${batches.length} batches with staggered start (${BATCH_SIZE} cards each)`)
      
      // Fetch batches with staggered start to respect rate limits
      // Scryfall allows 10 req/sec, so we stagger by 150ms = ~6-7 req/sec to be safe
      const batchPromises = batches.map(async (batch, index) => {
        const batchNum = index + 1
        
        // Stagger the start of each batch
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * SCRYFALL_FETCH_DELAY_MS))
        }
        
        console.log(`[CardData] Starting batch ${batchNum}/${batches.length} (${batch.length} cards)`)
        
        try {
          const fetchedCards = await this.provider.getCardsByIdentifiers(batch)
          
          // Cache the fetched cards
          await this.cache.setCards(fetchedCards)
          
          console.log(`[CardData] Completed batch ${batchNum}/${batches.length}`)
          return fetchedCards
        } catch (error) {
          console.error(`[CardData] Error fetching batch ${batchNum}:`, error)
          throw error
        }
      })
      
      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Flatten results
      batchResults.forEach(fetchedCards => {
        results.push(...fetchedCards)
      })
    }
    
    return results
  }
  
  /**
   * Get a random card
   */
  async getRandomCard(query?: string): Promise<CardData> {
    // Random cards shouldn't be cached
    const card = await this.provider.getRandomCard(query)
    
    // But we can cache the card data itself for future lookups
    await this.cache.setCard(card)
    
    return card
  }
  
  /**
   * Invalidate a card from cache (useful if data needs updating)
   */
  async invalidateCard(id: string): Promise<void> {
    await this.cache.deleteCard(id)
  }
  
  /**
   * Check if card exists in cache
   */
  async hasCached(id: string): Promise<boolean> {
    return this.cache.hasCard(id)
  }
  
  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.name
  }
}