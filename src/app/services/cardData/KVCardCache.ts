// src/app/services/cardData/KVCardCache.ts
import type { ICardCache } from './ICardCache'
import type { CardData, CardSearchResult, AutocompleteResult } from './types'

/**
 * Cloudflare Workers KV implementation of card cache
 * Requires KV namespace binding in wrangler.toml
 */
export class KVCardCache implements ICardCache {
  private kv: KVNamespace
  private readonly CARD_ID_PREFIX = 'card:id:'
  private readonly CARD_NAME_PREFIX = 'card:name:'
  private readonly SEARCH_PREFIX = 'search:'
  private readonly AUTOCOMPLETE_PREFIX = 'autocomplete:'
  
  // TTL values (in seconds)
  private readonly CARD_TTL = 30 * 24 * 60 * 60        // 30 days - cards rarely change
  private readonly SEARCH_TTL = 24 * 60 * 60           // 24 hours - searches can be stale
  private readonly AUTOCOMPLETE_TTL = 24 * 60 * 60     // 24 hours
  
  constructor(kv: KVNamespace) {
    this.kv = kv
  }
  
  // ===== CARD OPERATIONS =====
  
  async getCard(id: string): Promise<CardData | null> {
    const key = `${this.CARD_ID_PREFIX}${id}`
    const data = await this.kv.get(key, 'json')
    return data as CardData | null
  }
  
  async getCardByName(name: string): Promise<CardData | null> {
    // Normalize name for consistent lookups
    const normalizedName = this.normalizeName(name)
    const key = `${this.CARD_NAME_PREFIX}${normalizedName}`
    
    // First check if we have a name -> id mapping
    const cardId = await this.kv.get(key, 'text')
    if (!cardId) return null
    
    // Then fetch the actual card data
    return this.getCard(cardId)
  }
  
  async setCard(card: CardData): Promise<void> {
    const cardKey = `${this.CARD_ID_PREFIX}${card.id}`
    const nameKey = `${this.CARD_NAME_PREFIX}${this.normalizeName(card.name)}`
    
    // Store card data with TTL
    await this.kv.put(cardKey, JSON.stringify(card), {
      expirationTtl: this.CARD_TTL,
      metadata: {
        name: card.name,
        provider: card.provider,
        cached_at: Date.now()
      }
    })
    
    // Store name -> id mapping
    await this.kv.put(nameKey, card.id, {
      expirationTtl: this.CARD_TTL
    })
  }
  
  async setCards(cards: CardData[]): Promise<void> {
    // Batch operation - KV doesn't have true batching, but we can parallelize
    await Promise.all(cards.map(card => this.setCard(card)))
  }
  
  async hasCard(id: string): Promise<boolean> {
    const key = `${this.CARD_ID_PREFIX}${id}`
    const exists = await this.kv.get(key)
    return exists !== null
  }
  
  async deleteCard(id: string): Promise<void> {
    // Get the card first to find its name
    const card = await this.getCard(id)
    
    const cardKey = `${this.CARD_ID_PREFIX}${id}`
    await this.kv.delete(cardKey)
    
    // Also delete the name mapping if we found it
    if (card) {
      const nameKey = `${this.CARD_NAME_PREFIX}${this.normalizeName(card.name)}`
      await this.kv.delete(nameKey)
    }
  }
  
  // ===== SEARCH OPERATIONS =====
  
  async getSearchResults(query: string, page: number): Promise<CardSearchResult | null> {
    const key = `${this.SEARCH_PREFIX}${this.hashQuery(query)}:${page}`
    const data = await this.kv.get(key, 'json')
    return data as CardSearchResult | null
  }
  
  async setSearchResults(query: string, page: number, results: CardSearchResult): Promise<void> {
    const key = `${this.SEARCH_PREFIX}${this.hashQuery(query)}:${page}`
    
    await this.kv.put(key, JSON.stringify(results), {
      expirationTtl: this.SEARCH_TTL,
      metadata: {
        query,
        page,
        cached_at: Date.now()
      }
    })
  }
  
  // ===== AUTOCOMPLETE OPERATIONS =====
  
  async getAutocomplete(query: string): Promise<AutocompleteResult | null> {
    const key = `${this.AUTOCOMPLETE_PREFIX}${this.normalizeName(query)}`
    const data = await this.kv.get(key, 'json')
    return data as AutocompleteResult | null
  }
  
  async setAutocomplete(query: string, results: AutocompleteResult): Promise<void> {
    const key = `${this.AUTOCOMPLETE_PREFIX}${this.normalizeName(query)}`
    
    await this.kv.put(key, JSON.stringify(results), {
      expirationTtl: this.AUTOCOMPLETE_TTL,
      metadata: {
        query,
        cached_at: Date.now()
      }
    })
  }
  
  // ===== UTILITY METHODS =====
  
  /**
   * Normalize card name for consistent cache keys
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '_')
  }
  
  /**
   * Create a simple hash for query strings
   */
  private hashQuery(query: string): string {
    // Simple hash - could use crypto.subtle.digest for better distribution
    return btoa(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '')
  }
  
  /**
   * Optional: Clear all cache (use with caution!)
   */
  async clearAll(): Promise<void> {
    // Note: KV doesn't have a "clear all" operation
    // You'd need to list and delete keys, which can be expensive
    console.warn('KV clearAll() not implemented - use Cloudflare dashboard for bulk operations')
  }
}