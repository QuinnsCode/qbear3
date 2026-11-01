// src/app/services/cardData/ICardProvider.ts
import type { CardData, CardIdentifier } from './types'

/**
 * Where card data comes from when the cache misses (Scryfall today).
 */
export interface ICardProvider {
  readonly name: string

  /** Most identifiers one getCardsByIdentifiers call takes. */
  readonly maxBatch: number

  getCard(id: string): Promise<CardData>

  /** Fuzzy name lookup, optionally within one set. */
  getCardByName(name: string, setCode?: string): Promise<CardData>

  /** Batch fetch. Identifiers the provider can't find are left out of the result. */
  getCardsByIdentifiers(identifiers: CardIdentifier[]): Promise<CardData[]>

  /** Every printing of one oracle card, newest first. */
  getAllPrintings(oracleId: string): Promise<CardData[]>
}
