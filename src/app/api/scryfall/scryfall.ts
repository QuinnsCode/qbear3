// @/app/api/scryfall/scryfall.ts
import {
    Card,
    ScryfallList,
    Set,
    Ruling,
    Catalog,
    BulkData,
    ManaCostSymbol,
    SearchParams,
    NamedCardParams,
    AutocompleteParams,
    RandomCardParams,
    CollectionRequest,
    CardIdentifier,
  } from "./scryfallTypes";
  
  // Scryfall API utilities
  const SCRYFALL_API_BASE = "https://api.scryfall.com";

  // Scryfall asks for 100ms between requests, and 500ms (2/s) on search, named, random and collection.
  // Slots are reserved synchronously, so requests that overlap in one isolate queue up instead of
  // all reading the same "last request" time and firing together.
  const GAP_MS = 100;
  const SLOW_GAP_MS = 500;
  const SLOW_ENDPOINT = /^\/cards\/(search|named|random|collection)\b/;
  let nextSlot = 0;
  let nextSlowSlot = 0;

  async function waitForSlot(endpoint: string): Promise<void> {
    const slow = SLOW_ENDPOINT.test(endpoint);
    const now = Date.now();
    const at = Math.max(now, nextSlot, slow ? nextSlowSlot : 0);
    nextSlot = at + GAP_MS;
    if (slow) nextSlowSlot = at + SLOW_GAP_MS;
    if (at > now) await new Promise(resolve => setTimeout(resolve, at - now));
  }

  // GET replies are kept in the colo's Cache API for a day. It costs nothing per read or write
  // (KV bills both), so searches, autocomplete, printings and named lookups repeat for free and
  // skip the rate limit. /cards/random must stay random, so it is never cached.
  const EDGE_TTL_SECONDS = 24 * 60 * 60;

  async function edgeCache(endpoint: string, method: string): Promise<Cache | undefined> {
    if (method !== 'GET' || endpoint.startsWith('/cards/random')) return undefined;
    if (typeof caches === 'undefined') return undefined; // not on Workers (tests, scripts)
    return caches.open('scryfall').catch(() => undefined);
  }

  function errorMessage(status: number, text: string): string {
    try {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === 'object' && 'details' in body && typeof body.details === 'string') {
        return `Scryfall API Error: ${status} - ${body.details}`;
      }
    } catch {
      // Not JSON (a gateway page, say): fall through to the status alone.
    }
    return `Scryfall API Error: ${status}`;
  }

  // Unified Scryfall HTTP Client
  class ScryfallClient {
    private organizationId?: string;

    constructor(organizationId?: string) {
      this.organizationId = organizationId;
    }

    // Unified HTTP request method
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = `${SCRYFALL_API_BASE}${endpoint}`;
      const cache = await edgeCache(endpoint, options.method ?? 'GET');

      const hit = await cache?.match(url).catch(() => undefined);
      if (hit) return hit.json();

      await waitForSlot(endpoint);
      const response = await fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'qntbr/1.0',
            ...(options.method === 'POST' && { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
      });

      const text = await response.text();
      if (!response.ok) throw new Error(errorMessage(response.status, text));

      if (cache) {
        const copy = new Response(text, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}` },
        });
        await cache.put(url, copy).catch((error) => console.warn('[Scryfall] edge cache put failed', error));
      }
      return JSON.parse(text);
    }

    // Build query string from params
    private buildQueryString(params?: Record<string, any>): string {
      if (!params) return '';
      
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      return queryString ? `?${queryString}` : '';
    }
  
    // ===== CARDS API =====
  
    // Get a card by Scryfall ID
    async getCard(id: string): Promise<Card> {
      return this.request<Card>(`/cards/${id}`);
    }
  
    // Get a card by set code and collector number
    async getCardBySetAndNumber(
      setCode: string, 
      collectorNumber: string | number
    ): Promise<Card> {
      return this.request<Card>(`/cards/${setCode}/${collectorNumber}`);
    }
  
    // Get a card by multiverse ID
    async getCardByMultiverseId(multiverseId: number): Promise<Card> {
      return this.request<Card>(`/cards/multiverse/${multiverseId}`);
    }
  
    // Get a card by MTGO ID
    async getCardByMtgoId(mtgoId: number): Promise<Card> {
      return this.request<Card>(`/cards/mtgo/${mtgoId}`);
    }
  
    // Get a card by Arena ID
    async getCardByArenaId(arenaId: number): Promise<Card> {
      return this.request<Card>(`/cards/arena/${arenaId}`);
    }
  
    // Get a card by TCGplayer ID
    async getCardByTcgplayerId(tcgplayerId: number): Promise<Card> {
      return this.request<Card>(`/cards/tcgplayer/${tcgplayerId}`);
    }
  
    // Get a card by Cardmarket ID
    async getCardByCardmarketId(cardmarketId: number): Promise<Card> {
      return this.request<Card>(`/cards/cardmarket/${cardmarketId}`);
    }
  
    // Search for cards by name (exact or fuzzy)
    async getNamedCard(params: NamedCardParams): Promise<Card> {
      const queryString = this.buildQueryString(params);
      return this.request<Card>(`/cards/named${queryString}`);
    }
  
    // Autocomplete card names
    async autocomplete(params: AutocompleteParams): Promise<Catalog> {
      const queryString = this.buildQueryString(params);
      return this.request<Catalog>(`/cards/autocomplete${queryString}`);
    }
  
    // Get a random card
    async getRandomCard(params?: RandomCardParams): Promise<Card> {
      const queryString = params ? this.buildQueryString(params) : '';
      return this.request<Card>(`/cards/random${queryString}`);
    }
  
    // Search for cards with full-text search
    async searchCards(params: SearchParams): Promise<ScryfallList<Card>> {
      const queryString = this.buildQueryString(params);
      return this.request<ScryfallList<Card>>(`/cards/search${queryString}`);
    }
  
    // Get multiple cards by identifiers
    async getCollection(identifiers: CardIdentifier[]): Promise<ScryfallList<Card>> {
      const body: CollectionRequest = { identifiers };
      return this.request<ScryfallList<Card>>('/cards/collection', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }
  
    // ===== SETS API =====
  
    // Get all sets
    async listSets(): Promise<ScryfallList<Set>> {
      return this.request<ScryfallList<Set>>('/sets');
    }
  
    // Get a set by code
    async getSet(code: string): Promise<Set> {
      return this.request<Set>(`/sets/${code}`);
    }
  
    // Get a set by Scryfall ID
    async getSetById(id: string): Promise<Set> {
      return this.request<Set>(`/sets/${id}`);
    }
  
    // Get a set by TCGplayer ID
    async getSetByTcgplayerId(tcgplayerId: number): Promise<Set> {
      return this.request<Set>(`/sets/tcgplayer/${tcgplayerId}`);
    }
  
    // ===== RULINGS API =====
  
    // Get rulings for a card by Scryfall ID
    async getRulings(cardId: string): Promise<ScryfallList<Ruling>> {
      return this.request<ScryfallList<Ruling>>(`/cards/${cardId}/rulings`);
    }
  
    // Get rulings by set code and collector number
    async getRulingsBySetAndNumber(
      setCode: string,
      collectorNumber: string | number
    ): Promise<ScryfallList<Ruling>> {
      return this.request<ScryfallList<Ruling>>(
        `/cards/${setCode}/${collectorNumber}/rulings`
      );
    }
  
    // Get rulings by multiverse ID
    async getRulingsByMultiverseId(multiverseId: number): Promise<ScryfallList<Ruling>> {
      return this.request<ScryfallList<Ruling>>(`/cards/multiverse/${multiverseId}/rulings`);
    }
  
    // Get rulings by MTGO ID
    async getRulingsByMtgoId(mtgoId: number): Promise<ScryfallList<Ruling>> {
      return this.request<ScryfallList<Ruling>>(`/cards/mtgo/${mtgoId}/rulings`);
    }
  
    // Get rulings by Arena ID
    async getRulingsByArenaId(arenaId: number): Promise<ScryfallList<Ruling>> {
      return this.request<ScryfallList<Ruling>>(`/cards/arena/${arenaId}/rulings`);
    }
  
    // ===== SYMBOLOGY API =====
  
    // Get all mana symbols
    async getSymbols(): Promise<ScryfallList<ManaCostSymbol>> {
      return this.request<ScryfallList<ManaCostSymbol>>('/symbology');
    }
  
    // Parse mana cost
    async parseMana(cost: string): Promise<{ cost: string; cmc: number; colors: string[] }> {
      const queryString = this.buildQueryString({ cost });
      return this.request(`/symbology/parse-mana${queryString}`);
    }
  
    // ===== CATALOG API =====
  
    // Get card names catalog
    async getCardNames(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/card-names');
    }
  
    // Get artist names catalog
    async getArtistNames(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/artist-names');
    }
  
    // Get word bank catalog
    async getWordBank(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/word-bank');
    }
  
    // Get creature types catalog
    async getCreatureTypes(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/creature-types');
    }
  
    // Get planeswalker types catalog
    async getPlaneswalkerTypes(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/planeswalker-types');
    }
  
    // Get land types catalog
    async getLandTypes(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/land-types');
    }
  
    // Get artifact types catalog
    async getArtifactTypes(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/artifact-types');
    }
  
    // Get enchantment types catalog
    async getEnchantmentTypes(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/enchantment-types');
    }
  
    // Get spell types catalog
    async getSpellTypes(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/spell-types');
    }
  
    // Get powers catalog
    async getPowers(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/powers');
    }
  
    // Get toughnesses catalog
    async getToughnesses(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/toughnesses');
    }
  
    // Get loyalties catalog
    async getLoyalties(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/loyalties');
    }
  
    // Get watermarks catalog
    async getWatermarks(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/watermarks');
    }
  
    // Get keyword abilities catalog
    async getKeywordAbilities(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/keyword-abilities');
    }
  
    // Get keyword actions catalog
    async getKeywordActions(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/keyword-actions');
    }
  
    // Get ability words catalog
    async getAbilityWords(): Promise<Catalog> {
      return this.request<Catalog>('/catalog/ability-words');
    }
  
    // ===== BULK DATA API =====
  
    // Get all bulk data definitions
    async getBulkData(): Promise<ScryfallList<BulkData>> {
      return this.request<ScryfallList<BulkData>>('/bulk-data');
    }
  
    // Get a specific bulk data definition by ID
    async getBulkDataById(id: string): Promise<BulkData> {
      return this.request<BulkData>(`/bulk-data/${id}`);
    }
  
    // Get a specific bulk data definition by type
    async getBulkDataByType(type: string): Promise<BulkData> {
      return this.request<BulkData>(`/bulk-data/${type}`);
    }
  }
  
  // Legacy function exports for backwards compatibility
  export async function getCard(id: string): Promise<Card> {
    const client = new ScryfallClient();
    return client.getCard(id);
  }
  
  export async function searchCards(params: SearchParams): Promise<ScryfallList<Card>> {
    const client = new ScryfallClient();
    return client.searchCards(params);
  }
  
  export async function getNamedCard(params: NamedCardParams): Promise<Card> {
    const client = new ScryfallClient();
    return client.getNamedCard(params);
  }
  
  export async function getRandomCard(params?: RandomCardParams): Promise<Card> {
    const client = new ScryfallClient();
    return client.getRandomCard(params);
  }
  
  export async function listSets(): Promise<ScryfallList<Set>> {
    const client = new ScryfallClient();
    return client.listSets();
  }
  
  export async function getSet(code: string): Promise<Set> {
    const client = new ScryfallClient();
    return client.getSet(code);
  }
  
  // Export the client class for direct use
  export { ScryfallClient };
