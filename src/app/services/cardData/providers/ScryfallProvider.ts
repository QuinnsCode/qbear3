// src/app/services/cardData/providers/ScryfallProvider.ts
import { ScryfallClient } from '@/app/api/scryfall/scryfall'
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'
import type { ICardProvider } from '../ICardProvider'
import type { CardIdentifier as ScryfallIdentifier } from '@/app/api/scryfall/scryfallTypes'
import type { CardData, CardIdentifier } from '../types'

/**
 * Scryfall adapter that implements the generic ICardProvider interface
 * Converts Scryfall-specific types to our domain types
 */
export class ScryfallProvider implements ICardProvider {
  readonly name = 'scryfall'
  readonly maxBatch = 75 // Scryfall's /cards/collection limit
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
  
  async getCardsByIdentifiers(identifiers: CardIdentifier[]): Promise<CardData[]> {
    const scryfallIdentifiers = identifiers.flatMap((id): ScryfallIdentifier[] => {
      if (id.id) return [{ id: id.id }]
      if (id.setCode && id.collectorNumber) return [{ set: id.setCode, collector_number: id.collectorNumber }]
      // The collection endpoint misses full "Fire // Ice" names but finds the front face, which
      // is how Moxfield and Archidekt exports write double-faced and split cards.
      const name = id.name?.split(' // ')[0]
      if (name) return [id.setCode ? { name, set: id.setCode } : { name }]
      return []
    })
    if (scryfallIdentifiers.length === 0) return []
    if (scryfallIdentifiers.length > this.maxBatch) {
      throw new Error(`Cannot fetch more than ${this.maxBatch} cards at once (got ${scryfallIdentifiers.length})`)
    }

    const results = await this.client.getCollection(scryfallIdentifiers)
    return results.data.map(card => this.mapScryfallCard(card))
  }
  
  async getAllPrintings(oracleId: string): Promise<CardData[]> {
    // Search for all printings of this oracle ID
    // Use unique=prints to get all versions, order by release date (newest first)
    const results = await this.client.searchCards({
      q: `oracleid:${oracleId}`,
      unique: 'prints',
      order: 'released',
      dir: 'desc'
    })

    return results.data.map(card => this.mapScryfallCard(card))
  }

  /**
   * Map Scryfall-specific card to generic CardData
   */
  private mapScryfallCard(scryfallCard: ScryfallCard): CardData {
    const images = scryfallCard.image_uris ?? scryfallCard.card_faces?.[0]?.image_uris
    return {
      // Identifiers
      id: scryfallCard.id,
      oracleId: scryfallCard.oracle_id,
      name: scryfallCard.name,

      // Game data (a double-faced card has these on its front face)
      manaCost: scryfallCard.mana_cost ?? scryfallCard.card_faces?.[0]?.mana_cost,
      cmc: scryfallCard.cmc,
      typeLine: scryfallCard.type_line,
      oracleText: scryfallCard.oracle_text ?? scryfallCard.card_faces?.[0]?.oracle_text,
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
      
      // Images. Double-faced cards keep theirs on each face; show the front.
      imageUris: images ? {
        small: images.small,
        normal: images.normal,
        large: images.large,
        artCrop: images.art_crop
      } : undefined,
      
      // Pricing
      prices: scryfallCard.prices,
      
      // Legalities
      legalities: { ...scryfallCard.legalities },
      
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