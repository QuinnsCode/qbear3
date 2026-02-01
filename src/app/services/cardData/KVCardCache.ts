// src/app/services/cardData/KVCardCache.ts
import type { ICardCache } from './ICardCache'
import type { CardData, CardSearchResult, AutocompleteResult, OracleData, PrintingData } from './types'

/**
 * KV-based card cache implementation
 * Uses Cloudflare Workers KV for globally distributed edge caching
 *
 * Cache keys:
 * - card:id:{printId} → Full card data (legacy)
 * - card:name:{normalized_name} → Card ID (for name lookups)
 * - oracle:{oracleId} → Oracle data (game rules)
 * - print:{printId} → Printing data (art, set, price)
 * - printings:{oracleId} → Array of print IDs for this oracle
 * - search:{hash}:{page} → Search results
 * - autocomplete:{normalized_query} → Autocomplete results
 *
 * TTL: 1 year (cards don't change often)
 */
export class KVCardCache implements ICardCache {
  private kv: KVNamespace
  private readonly CARD_ID_PREFIX = 'card:id:'
  private readonly CARD_NAME_PREFIX = 'card:name:'
  private readonly ORACLE_PREFIX = 'oracle:'
  private readonly PRINT_PREFIX = 'print:'
  private readonly PRINTINGS_PREFIX = 'printings:'
  private readonly SEARCH_PREFIX = 'search:'
  private readonly AUTOCOMPLETE_PREFIX = 'autocomplete:'
  private readonly CACHE_TTL = 365 * 24 * 60 * 60 // 1 year

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  async getCard(id: string): Promise<CardData | null> {
    const key = `${this.CARD_ID_PREFIX}${id}`
    const cached = await this.kv.get(key, 'json')
    return cached as CardData | null
  }

  async getCardByName(name: string): Promise<CardData | null> {
    const normalizedName = this.normalizeName(name)
    const nameKey = `${this.CARD_NAME_PREFIX}${normalizedName}`

    // First lookup: name → card ID
    const cardId = await this.kv.get(nameKey, 'text')
    if (!cardId) return null

    // Second lookup: card ID → full card data
    return this.getCard(cardId)
  }

  async setCard(card: CardData): Promise<void> {
    const cardKey = `${this.CARD_ID_PREFIX}${card.id}`
    const nameKey = `${this.CARD_NAME_PREFIX}${this.normalizeName(card.name)}`

    // Store card data by ID
    await this.kv.put(cardKey, JSON.stringify(card), {
      expirationTtl: this.CACHE_TTL
    })

    // Store name → ID mapping for name lookups
    await this.kv.put(nameKey, card.id, {
      expirationTtl: this.CACHE_TTL
    })
  }

  async setCards(cards: CardData[]): Promise<void> {
    // Batch write to KV (execute in parallel for performance)
    await Promise.all(cards.map(card => this.setCard(card)))
  }

  async getSearchResults(query: string, page: number): Promise<CardSearchResult | null> {
    const key = `${this.SEARCH_PREFIX}${this.hashQuery(query)}:${page}`
    const cached = await this.kv.get(key, 'json')
    return cached as CardSearchResult | null
  }

  async setSearchResults(query: string, page: number, results: CardSearchResult): Promise<void> {
    const key = `${this.SEARCH_PREFIX}${this.hashQuery(query)}:${page}`
    await this.kv.put(key, JSON.stringify(results), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days for search results
    })
  }

  async getAutocomplete(query: string): Promise<AutocompleteResult | null> {
    const key = `${this.AUTOCOMPLETE_PREFIX}${this.normalizeName(query)}`
    const cached = await this.kv.get(key, 'json')
    return cached as AutocompleteResult | null
  }

  async setAutocomplete(query: string, results: AutocompleteResult): Promise<void> {
    const key = `${this.AUTOCOMPLETE_PREFIX}${this.normalizeName(query)}`
    await this.kv.put(key, JSON.stringify(results), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days for autocomplete
    })
  }

  async hasCard(id: string): Promise<boolean> {
    const key = `${this.CARD_ID_PREFIX}${id}`
    const value = await this.kv.get(key)
    return value !== null
  }

  async deleteCard(id: string): Promise<void> {
    // Need to get the card first to find its name for cleanup
    const card = await this.getCard(id)

    const cardKey = `${this.CARD_ID_PREFIX}${id}`
    await this.kv.delete(cardKey)

    if (card) {
      const nameKey = `${this.CARD_NAME_PREFIX}${this.normalizeName(card.name)}`
      await this.kv.delete(nameKey)
    }
  }

  async clearAll(): Promise<void> {
    // KV doesn't have a deleteAll - would need to list and delete
    // For maintenance, we can rely on TTL expiration
    console.warn('KVCardCache.clearAll() - not implemented (rely on TTL)')
  }

  /**
   * Normalize card name for consistent lookups
   * Converts to lowercase, trims, replaces spaces with underscores
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '_')
  }

  /**
   * Hash a search query for consistent cache keys
   * Uses base64 encoding and removes special characters
   */
  private hashQuery(query: string): string {
    return btoa(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '')
  }

  // ========== Oracle/Printing Support ==========

  async getOracle(oracleId: string): Promise<OracleData | null> {
    const key = `${this.ORACLE_PREFIX}${oracleId}`
    const cached = await this.kv.get(key, 'json')
    return cached as OracleData | null
  }

  async setOracle(oracle: OracleData): Promise<void> {
    const key = `${this.ORACLE_PREFIX}${oracle.oracleId}`
    await this.kv.put(key, JSON.stringify(oracle), {
      expirationTtl: this.CACHE_TTL
    })
  }

  async getPrinting(printId: string): Promise<PrintingData | null> {
    const key = `${this.PRINT_PREFIX}${printId}`
    const cached = await this.kv.get(key, 'json')
    return cached as PrintingData | null
  }

  async setPrinting(printing: PrintingData): Promise<void> {
    const key = `${this.PRINT_PREFIX}${printing.printId}`
    await this.kv.put(key, JSON.stringify(printing), {
      expirationTtl: this.CACHE_TTL
    })
  }

  async getPrintingsForOracle(oracleId: string): Promise<string[]> {
    const key = `${this.PRINTINGS_PREFIX}${oracleId}`
    const cached = await this.kv.get(key, 'json')
    return (cached as string[]) || []
  }

  async addPrintingToOracle(oracleId: string, printId: string): Promise<void> {
    const key = `${this.PRINTINGS_PREFIX}${oracleId}`
    const existing = await this.getPrintingsForOracle(oracleId)

    // Deduplicate and add new print ID
    const printings = [...new Set([...existing, printId])]

    await this.kv.put(key, JSON.stringify(printings), {
      expirationTtl: this.CACHE_TTL
    })
  }
}
