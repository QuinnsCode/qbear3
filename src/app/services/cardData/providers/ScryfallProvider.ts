// src/app/services/cardData/providers/ScryfallProvider.ts
import { ScryfallClient } from '@/app/api/scryfall/scryfall'
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'
import type { ICardProvider } from '../ICardProvider'
import type { CardData, CardSearchResult, AutocompleteResult, CardIdentifier } from '../types'

/**
 * Scryfall adapter that implements the generic ICardProvider interface
 * Converts Scryfall-specific types to our domain types
 */
export class ScryfallProvider implements ICardProvider {
  readonly name = 'scryfall'
  private client: ScryfallClient
  
  constructor() {
    this.client = new ScryfallClient()
  }
  
  async getCard(id: string): Promise<CardData> {
    const card = await this.client.getCard(id)
    return this.mapScryfallCard(card)
  }
  
  async getCardByName(name: string, setCode?: string): Promise<CardData> {
    const card = await this.client.getNamedCard({ 
      fuzzy: name,
      ...(setCode && { set: setCode })
    })
    return this.mapScryfallCard(card)
  }
  
  async searchCards(query: string, page: number = 1): Promise<CardSearchResult> {
    // Try fuzzy match for simple queries first
    if (query.length > 0 && !query.includes(':') && !query.includes('=')) {
      try {
        const card = await this.client.getNamedCard({ fuzzy: query })
        return {
          cards: [this.mapScryfallCard(card)],
          totalCards: 1,
          hasMore: false
        }
      } catch (error) {
        // Fall through to full search
      }
    }
    
    // Full text search
    const results = await this.client.searchCards({ 
      q: query,
      page,
      unique: 'cards',
      order: 'name'
    })
    
    return {
      cards: results.data.map(card => this.mapScryfallCard(card)),
      totalCards: results.total_cards || 0,
      hasMore: results.has_more,
      nextPage: results.has_more ? page + 1 : undefined
    }
  }
  
  async autocomplete(query: string): Promise<AutocompleteResult> {
    const results = await this.client.autocomplete({ q: query })
    return {
      suggestions: results.data
    }
  }
  
  async getCardsByIdentifiers(identifiers: CardIdentifier[]): Promise<CardData[]> {
    // Convert our generic identifiers to Scryfall format
    // Filter out any empty identifiers and build proper objects
    const scryfallIdentifiers = identifiers
      .map(id => {
        const scryfallId: any = {}
        
        if (id.id) scryfallId.id = id.id
        if (id.name) scryfallId.name = id.name
        if (id.setCode) scryfallId.set = id.setCode
        if (id.collectorNumber) scryfallId.collector_number = id.collectorNumber
        
        return scryfallId
      })
      .filter(id => Object.keys(id).length > 0) // Remove empty objects
    
    console.log(`[ScryfallProvider] Calling collection API with ${scryfallIdentifiers.length} identifiers`)
    
    // Validate we have identifiers
    if (scryfallIdentifiers.length === 0) {
      console.error('[ScryfallProvider] No valid identifiers provided!')
      return []
    }
    
    // Validate batch size
    if (scryfallIdentifiers.length > 75) {
      console.error(`[ScryfallProvider] Too many identifiers: ${scryfallIdentifiers.length} (max 75)`)
      throw new Error(`Cannot fetch more than 75 cards at once (got ${scryfallIdentifiers.length})`)
    }
    
    const results = await this.client.getCollection(scryfallIdentifiers)
    return results.data.map(card => this.mapScryfallCard(card))
  }
  
  async getRandomCard(query?: string): Promise<CardData> {
    const card = await this.client.getRandomCard(query ? { q: query } : undefined)
    return this.mapScryfallCard(card)
  }
  
  /**
   * Map Scryfall-specific card to generic CardData
   */
  private mapScryfallCard(scryfallCard: ScryfallCard): CardData {
    return {
      // Identifiers
      id: scryfallCard.id,
      name: scryfallCard.name,
      
      // Game data
      manaCost: scryfallCard.mana_cost,
      cmc: scryfallCard.cmc,
      typeLine: scryfallCard.type_line,
      oracleText: scryfallCard.oracle_text,
      power: scryfallCard.power,
      toughness: scryfallCard.toughness,
      loyalty: scryfallCard.loyalty,
      colors: scryfallCard.colors,
      colorIdentity: scryfallCard.color_identity,
      
      // Set/rarity
      setCode: scryfallCard.set,
      setName: scryfallCard.set_name,
      collectorNumber: scryfallCard.collector_number,
      rarity: this.mapRarity(scryfallCard.rarity),
      
      // Images
      imageUris: scryfallCard.image_uris ? {
        small: scryfallCard.image_uris.small,
        normal: scryfallCard.image_uris.normal,
        large: scryfallCard.image_uris.large,
        artCrop: scryfallCard.image_uris.art_crop
      } : undefined,
      
      // Pricing
      prices: scryfallCard.prices,
      
      // Legalities
      legalities: scryfallCard.legalities,
      
      // Metadata
      provider: 'scryfall',
      externalUri: scryfallCard.scryfall_uri,
      lastUpdated: Date.now()
    }
  }
  
  /**
   * Map Scryfall rarity to our standard rarity
   */
  private mapRarity(rarity: string): 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' {
    switch (rarity) {
      case 'common': return 'common'
      case 'uncommon': return 'uncommon'
      case 'rare': return 'rare'
      case 'mythic': return 'mythic'
      default: return 'special'
    }
  }
}