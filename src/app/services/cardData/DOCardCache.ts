// src/app/services/cardData/DOCardCache.ts
import type { ICardCache } from './ICardCache'
import type { CardData, CardSearchResult, AutocompleteResult } from './types'

export class DOCardCache implements ICardCache {
  private binding: DurableObjectNamespace
  private readonly CARD_ID_PREFIX = 'card:id:'
  private readonly CARD_NAME_PREFIX = 'card:name:'
  private readonly SEARCH_PREFIX = 'search:'
  private readonly AUTOCOMPLETE_PREFIX = 'autocomplete:'
  
  constructor(binding: DurableObjectNamespace) {
    this.binding = binding
  }
  
  private getStub() {
    const id = this.binding.idFromName('global-card-cache');
    return this.binding.get(id);
  }
  
  async getCard(id: string): Promise<CardData | null> {
    const stub = this.getStub();
    const key = `${this.CARD_ID_PREFIX}${id}`;
    
    const response = await stub.fetch(new Request(`https://fake-host/?type=card&key=${encodeURIComponent(key)}`));
    const { value } = await response.json() as { value: CardData | null };
    return value;
  }
  
  async getCardByName(name: string): Promise<CardData | null> {
    const normalizedName = this.normalizeName(name);
    const key = `${this.CARD_NAME_PREFIX}${normalizedName}`;
    
    const stub = this.getStub();
    const response = await stub.fetch(new Request(`https://fake-host/?type=name&key=${encodeURIComponent(key)}`));
    const { value: cardId } = await response.json() as { value: string | null };
    
    if (!cardId) return null;
    return this.getCard(cardId);
  }
  
  async setCard(card: CardData): Promise<void> {
    const stub = this.getStub();
    const cardKey = `${this.CARD_ID_PREFIX}${card.id}`;
    const nameKey = `${this.CARD_NAME_PREFIX}${this.normalizeName(card.name)}`;
    
    await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      body: JSON.stringify({ type: 'card', key: cardKey, value: card })
    }));
    
    await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      body: JSON.stringify({ type: 'name', key: nameKey, value: card.id })
    }));
  }
  
  async setCards(cards: CardData[]): Promise<void> {
    await Promise.all(cards.map(card => this.setCard(card)));
  }
  
  async hasCard(id: string): Promise<boolean> {
    const card = await this.getCard(id);
    return card !== null;
  }
  
  async deleteCard(id: string): Promise<void> {
    const card = await this.getCard(id);
    const stub = this.getStub();
    const cardKey = `${this.CARD_ID_PREFIX}${id}`;
    
    await stub.fetch(new Request(`https://fake-host/?key=${encodeURIComponent(cardKey)}`, {
      method: 'DELETE'
    }));
    
    if (card) {
      const nameKey = `${this.CARD_NAME_PREFIX}${this.normalizeName(card.name)}`;
      await stub.fetch(new Request(`https://fake-host/?key=${encodeURIComponent(nameKey)}`, {
        method: 'DELETE'
      }));
    }
  }
  
  async getSearchResults(query: string, page: number): Promise<CardSearchResult | null> {
    const stub = this.getStub();
    const key = `${this.SEARCH_PREFIX}${this.hashQuery(query)}:${page}`;
    
    const response = await stub.fetch(new Request(`https://fake-host/?type=search&key=${encodeURIComponent(key)}`));
    const { value } = await response.json() as { value: CardSearchResult | null };
    return value;
  }
  
  async setSearchResults(query: string, page: number, results: CardSearchResult): Promise<void> {
    const stub = this.getStub();
    const key = `${this.SEARCH_PREFIX}${this.hashQuery(query)}:${page}`;
    
    await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      body: JSON.stringify({ type: 'search', key, value: results })
    }));
  }
  
  async getAutocomplete(query: string): Promise<AutocompleteResult | null> {
    const stub = this.getStub();
    const key = `${this.AUTOCOMPLETE_PREFIX}${this.normalizeName(query)}`;
    
    const response = await stub.fetch(new Request(`https://fake-host/?type=autocomplete&key=${encodeURIComponent(key)}`));
    const { value } = await response.json() as { value: AutocompleteResult | null };
    return value;
  }
  
  async setAutocomplete(query: string, results: AutocompleteResult): Promise<void> {
    const stub = this.getStub();
    const key = `${this.AUTOCOMPLETE_PREFIX}${this.normalizeName(query)}`;
    
    await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      body: JSON.stringify({ type: 'autocomplete', key, value: results })
    }));
  }
  
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '_');
  }
  
  private hashQuery(query: string): string {
    return btoa(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  async clearAll(): Promise<void> {
    const stub = this.getStub();
    await stub.fetch(new Request('https://fake-host/clear-all', { method: 'DELETE' }));
  }
}