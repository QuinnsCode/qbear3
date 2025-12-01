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
    ScryfallError,
  } from "./scryfallTypes";
  
  // Scryfall API utilities
  const SCRYFALL_API_BASE = "https://api.scryfall.com";
  
  // Rate limiting helper (Scryfall requests max 10 requests per second)
  const RATE_LIMIT_DELAY = 100; // 100ms between requests
  let lastRequestTime = 0;
  
  async function rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
      );
    }
    
    lastRequestTime = Date.now();
  }
  
  // Unified Scryfall HTTP Client
  class ScryfallClient {
    private organizationId?: string;
  
    constructor(organizationId?: string) {
      this.organizationId = organizationId;
    }
  
    // Unified HTTP request method
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      // Respect rate limiting
      await rateLimitDelay();
      
      const response = await fetch(`${SCRYFALL_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'qntbr/1.0',
            ...(options.method === 'POST' && { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json() as ScryfallError;
        throw new Error(
          `Scryfall API Error: ${errorData.status} - ${errorData.details}`
        );
      }
  
      return response.json();
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
  
  // Main handler for /api/scryfall/*
  export default async function handler({ request, params, ctx }) {
    try {
      // Create client instance (organization context optional for Scryfall)
      const client = new ScryfallClient(ctx.organization?.id);
  
      // Extract path from URL params
      const apiPath = params["*"]; // This captures everything after /api/scryfall/
      
      if (!apiPath) {
        return Response.json(
          { error: "API endpoint not specified" },
          { status: 400 }
        );
      }
  
      // Parse the route
      const pathParts = apiPath.split('/').filter(Boolean);
      const resource = pathParts[0];
      const subResource = pathParts[1];
      const identifier = pathParts[2];
  
      // Parse URL query parameters
      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams);
  
      // Handle different resources and HTTP methods
      switch (resource) {
        case 'cards':
          if (!subResource) {
            // /api/scryfall/cards
            switch (request.method) {
              case 'GET':
                // Could be search with query params
                if (queryParams.q) {
                  const results = await client.searchCards(queryParams as any);
                  return Response.json(results);
                }
                return Response.json(
                  { error: "Query parameter 'q' required for card search" },
                  { status: 400 }
                );
  
              case 'POST':
                // Collection endpoint
                const body = await request.json();
                const collection = await client.getCollection(body.identifiers);
                return Response.json(collection);
  
              default:
                return Response.json(
                  { error: `Method ${request.method} not allowed` },
                  { status: 405 }
                );
            }
          }
  
          // Handle specific card endpoints
          switch (subResource) {
            case 'named':
              // /api/scryfall/cards/named?exact=...&fuzzy=...
              const card = await client.getNamedCard(queryParams as NamedCardParams);
              return Response.json(card);
  
            case 'autocomplete':
              // /api/scryfall/cards/autocomplete?q=...
              const suggestions = await client.autocomplete(queryParams as any);
              return Response.json(suggestions);
  
            case 'random':
              // /api/scryfall/cards/random
              const randomCard = await client.getRandomCard(queryParams);
              return Response.json(randomCard);
  
            case 'search':
              // /api/scryfall/cards/search?q=...
              const searchResults = await client.searchCards(queryParams as SearchParams);
              return Response.json(searchResults);
  
            case 'collection':
              // /api/scryfall/cards/collection (POST)
              if (request.method !== 'POST') {
                return Response.json(
                  { error: "Collection endpoint requires POST" },
                  { status: 405 }
                );
              }
              const collectionBody = await request.json();
              const collectionResults = await client.getCollection(collectionBody.identifiers);
              return Response.json(collectionResults);
  
            case 'multiverse':
              // /api/scryfall/cards/multiverse/:id[/rulings]
              if (!identifier) {
                return Response.json(
                  { error: "Multiverse ID required" },
                  { status: 400 }
                );
              }
              const multiverseId = parseInt(identifier);
              if (pathParts[3] === 'rulings') {
                const rulings = await client.getRulingsByMultiverseId(multiverseId);
                return Response.json(rulings);
              }
              const multiverseCard = await client.getCardByMultiverseId(multiverseId);
              return Response.json(multiverseCard);
  
            case 'mtgo':
              // /api/scryfall/cards/mtgo/:id[/rulings]
              if (!identifier) {
                return Response.json(
                  { error: "MTGO ID required" },
                  { status: 400 }
                );
              }
              const mtgoId = parseInt(identifier);
              if (pathParts[3] === 'rulings') {
                const rulings = await client.getRulingsByMtgoId(mtgoId);
                return Response.json(rulings);
              }
              const mtgoCard = await client.getCardByMtgoId(mtgoId);
              return Response.json(mtgoCard);
  
            case 'arena':
              // /api/scryfall/cards/arena/:id[/rulings]
              if (!identifier) {
                return Response.json(
                  { error: "Arena ID required" },
                  { status: 400 }
                );
              }
              const arenaId = parseInt(identifier);
              if (pathParts[3] === 'rulings') {
                const rulings = await client.getRulingsByArenaId(arenaId);
                return Response.json(rulings);
              }
              const arenaCard = await client.getCardByArenaId(arenaId);
              return Response.json(arenaCard);
  
            case 'tcgplayer':
              // /api/scryfall/cards/tcgplayer/:id
              if (!identifier) {
                return Response.json(
                  { error: "TCGplayer ID required" },
                  { status: 400 }
                );
              }
              const tcgplayerCard = await client.getCardByTcgplayerId(parseInt(identifier));
              return Response.json(tcgplayerCard);
  
            case 'cardmarket':
              // /api/scryfall/cards/cardmarket/:id
              if (!identifier) {
                return Response.json(
                  { error: "Cardmarket ID required" },
                  { status: 400 }
                );
              }
              const cardmarketCard = await client.getCardByCardmarketId(parseInt(identifier));
              return Response.json(cardmarketCard);
  
            default:
              // Check if it's a UUID (card ID)
              if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subResource)) {
                // /api/scryfall/cards/:id[/rulings]
                if (identifier === 'rulings') {
                  const rulings = await client.getRulings(subResource);
                  return Response.json(rulings);
                }
                const cardById = await client.getCard(subResource);
                return Response.json(cardById);
              }
              
              // Otherwise treat as set/collector number
              // /api/scryfall/cards/:set/:number[/rulings]
              if (identifier) {
                if (pathParts[3] === 'rulings') {
                  const rulings = await client.getRulingsBySetAndNumber(subResource, identifier);
                  return Response.json(rulings);
                }
              }
              const cardBySet = await client.getCardBySetAndNumber(subResource, identifier);
              return Response.json(cardBySet);
          }
  
        case 'sets':
          if (!subResource) {
            // /api/scryfall/sets - list all sets
            const sets = await client.listSets();
            return Response.json(sets);
          }
  
          // Handle specific set endpoints
          if (subResource === 'tcgplayer' && identifier) {
            // /api/scryfall/sets/tcgplayer/:id
            const setByTcgplayer = await client.getSetByTcgplayerId(parseInt(identifier));
            return Response.json(setByTcgplayer);
          }
  
          // Check if it's a UUID (set ID) or code
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subResource)) {
            const setById = await client.getSetById(subResource);
            return Response.json(setById);
          }
  
          // Treat as set code
          const set = await client.getSet(subResource);
          return Response.json(set);
  
        case 'symbology':
          if (!subResource) {
            // /api/scryfall/symbology - get all symbols
            const symbols = await client.getSymbols();
            return Response.json(symbols);
          }
  
          if (subResource === 'parse-mana') {
            // /api/scryfall/symbology/parse-mana?cost=...
            if (!queryParams.cost) {
              return Response.json(
                { error: "Cost parameter required for mana parsing" },
                { status: 400 }
              );
            }
            const parsed = await client.parseMana(queryParams.cost);
            return Response.json(parsed);
          }
  
          return Response.json(
            { error: "Unknown symbology endpoint" },
            { status: 404 }
          );
  
        case 'catalog':
          if (!subResource) {
            return Response.json(
              { error: "Catalog type required. Available: card-names, artist-names, word-bank, etc." },
              { status: 400 }
            );
          }
  
          // Map catalog endpoints to client methods
          const catalogMethods: Record<string, () => Promise<Catalog>> = {
            'card-names': () => client.getCardNames(),
            'artist-names': () => client.getArtistNames(),
            'word-bank': () => client.getWordBank(),
            'creature-types': () => client.getCreatureTypes(),
            'planeswalker-types': () => client.getPlaneswalkerTypes(),
            'land-types': () => client.getLandTypes(),
            'artifact-types': () => client.getArtifactTypes(),
            'enchantment-types': () => client.getEnchantmentTypes(),
            'spell-types': () => client.getSpellTypes(),
            'powers': () => client.getPowers(),
            'toughnesses': () => client.getToughnesses(),
            'loyalties': () => client.getLoyalties(),
            'watermarks': () => client.getWatermarks(),
            'keyword-abilities': () => client.getKeywordAbilities(),
            'keyword-actions': () => client.getKeywordActions(),
            'ability-words': () => client.getAbilityWords(),
          };
  
          const catalogMethod = catalogMethods[subResource];
          if (!catalogMethod) {
            return Response.json(
              { 
                error: "Unknown catalog type",
                available: Object.keys(catalogMethods)
              },
              { status: 404 }
            );
          }
  
          const catalog = await catalogMethod();
          return Response.json(catalog);
  
        case 'bulk-data':
          if (!subResource) {
            // /api/scryfall/bulk-data - list all bulk data
            const bulkData = await client.getBulkData();
            return Response.json(bulkData);
          }
  
          // Check if it's a UUID or type string
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subResource)) {
            const bulkDataById = await client.getBulkDataById(subResource);
            return Response.json(bulkDataById);
          }
  
          const bulkDataByType = await client.getBulkDataByType(subResource);
          return Response.json(bulkDataByType);
  
        default:
          return Response.json(
            { 
              error: "Unknown resource", 
              available: ["cards", "sets", "symbology", "catalog", "bulk-data"],
              requested: resource 
            },
            { status: 404 }
          );
      }
  
    } catch (error) {
      console.error('Scryfall API Error:', error);
      
      return Response.json(
        { 
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  }