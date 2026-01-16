// app/services/cardRefresh/CardRefreshService.ts
/**
 * Card Refresh Service
 * 
 * Fetches fresh oracle text, rulings, and legalities from Scryfall
 * for existing cards in user decks.
 * 
 * Uses existing ScryfallClient infrastructure for API calls.
 * 
 * Features:
 * - Rate limiting (respects Scryfall's 10 req/sec limit)
 * - Error handling (graceful degradation)
 * - Progress tracking
 * - Batch processing
 */

import { ScryfallClient } from '@/app/api/scryfall/scryfall'
import type { DeckCard } from '@/app/types/Deck'

export interface RefreshProgress {
  current: number
  total: number
  currentCard?: string
  failed: string[]
}

export interface RefreshResult {
  success: boolean
  updatedCard?: DeckCard
  error?: string
}

export interface BulkRefreshResult {
  success: boolean
  updatedCards: DeckCard[]
  failedCards: string[]
  totalProcessed: number
}

/**
 * Scryfall API rate limits:
 * - Average: 10 requests per second
 * - Burst: allowed up to 10/second
 * - Recommended delay: 100ms between requests
 */
const RATE_LIMIT_DELAY = 100 // milliseconds

/**
 * Parse mana cost string to calculate CMC
 */
function parseManaValue(manaCost: string): number {
  if (!manaCost) return 0
  const matches = manaCost.match(/\d+/g)
  const generic = matches ? parseInt(matches[0]) : 0
  const symbols = (manaCost.match(/[WUBRGC]/g) || []).length
  return generic + symbols
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * CardRefreshService class
 * Handles fetching fresh card data from Scryfall
 */
export class CardRefreshService {
  private client: ScryfallClient

  constructor() {
    this.client = new ScryfallClient()
  }

  /**
   * Refresh a single card's data
   * 
   * @param card - The card to refresh
   * @returns RefreshResult with updated card or error
   */
  async refreshCard(card: DeckCard): Promise<RefreshResult> {
    if (!card.scryfallId) {
      return {
        success: false,
        error: 'Card missing Scryfall ID'
      }
    }

    try {
      // Fetch card data using existing ScryfallClient
      const scryfallCard = await this.client.getCard(card.scryfallId)

      // Fetch rulings separately
      let rulings = undefined
      if (scryfallCard.rulings_uri) {
        try {
          const rulingsResponse = await fetch(scryfallCard.rulings_uri)
          if (rulingsResponse.ok) {
            const rulingsData = await rulingsResponse.json()
            rulings = rulingsData.data || []
          }
        } catch (error) {
          console.warn(`[CardRefresh] Failed to fetch rulings for ${card.name}:`, error)
          // Continue without rulings
        }
      }

      // Create updated card with fresh data
      const updatedCard: DeckCard = {
        ...card,
        oracle_text: scryfallCard.oracle_text,
        rulings: rulings,
        legalities: scryfallCard.legalities,
        rarity: scryfallCard.rarity,
        cmc: scryfallCard.cmc,
        type: scryfallCard.type_line,
        manaCost: scryfallCard.mana_cost || '',
        colors: scryfallCard.colors || [],
        imageUrl: scryfallCard.image_uris?.normal || scryfallCard.image_uris?.large || card.imageUrl
      }

      return {
        success: true,
        updatedCard
      }

    } catch (error) {
      console.error(`[CardRefresh] Failed to refresh ${card.name}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Refresh multiple cards with rate limiting and progress tracking
   * 
   * @param cards - Array of cards to refresh
   * @param onProgress - Optional callback for progress updates
   * @returns BulkRefreshResult with all updated cards
   */
  async refreshCards(
    cards: DeckCard[],
    onProgress?: (progress: RefreshProgress) => void
  ): Promise<BulkRefreshResult> {
    const updatedCards: DeckCard[] = []
    const failedCards: string[] = []

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]

      // Update progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: cards.length,
          currentCard: card.name,
          failed: failedCards
        })
      }

      // Refresh the card
      const result = await this.refreshCard(card)

      if (result.success && result.updatedCard) {
        updatedCards.push(result.updatedCard)
      } else {
        // Keep original card on failure
        updatedCards.push(card)
        failedCards.push(card.name)
      }

      // Rate limiting: wait between requests (except for last card)
      if (i < cards.length - 1) {
        await delay(RATE_LIMIT_DELAY)
      }
    }

    return {
      success: failedCards.length === 0,
      updatedCards,
      failedCards,
      totalProcessed: cards.length
    }
  }

  /**
   * Refresh cards in batches for very large decks
   * 
   * @param cards - Array of cards to refresh
   * @param batchSize - Number of cards per batch (default: 10)
   * @param onProgress - Optional callback for progress updates
   * @returns BulkRefreshResult with all updated cards
   */
  async refreshCardsInBatches(
    cards: DeckCard[],
    batchSize: number = 10,
    onProgress?: (progress: RefreshProgress) => void
  ): Promise<BulkRefreshResult> {
    const updatedCards: DeckCard[] = []
    const failedCards: string[] = []
    let processedCount = 0

    // Process in batches
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize)

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(card => this.refreshCard(card))
      )

      // Collect results
      batchResults.forEach((result, idx) => {
        const card = batch[idx]
        processedCount++

        if (result.success && result.updatedCard) {
          updatedCards.push(result.updatedCard)
        } else {
          updatedCards.push(card)
          failedCards.push(card.name)
        }

        // Update progress
        if (onProgress) {
          onProgress({
            current: processedCount,
            total: cards.length,
            currentCard: card.name,
            failed: failedCards
          })
        }
      })

      // Wait between batches (except for last batch)
      if (i + batchSize < cards.length) {
        await delay(1000) // 1 second between batches
      }
    }

    return {
      success: failedCards.length === 0,
      updatedCards,
      failedCards,
      totalProcessed: cards.length
    }
  }

  /**
   * Check if a card needs refreshing
   * (missing oracle_text, rulings, or legalities)
   * 
   * @param card - Card to check
   * @returns true if card should be refreshed
   */
  needsRefresh(card: DeckCard): boolean {
    return !card.oracle_text || !card.rulings || !card.legalities
  }

  /**
   * Get cards that need refreshing from a deck
   * 
   * @param cards - Array of cards to check
   * @returns Array of cards that need refreshing
   */
  getCardsNeedingRefresh(cards: DeckCard[]): DeckCard[] {
    return cards.filter(card => this.needsRefresh(card))
  }
}

// Export singleton instance
export const cardRefreshService = new CardRefreshService()