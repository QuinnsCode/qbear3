// src/app/serverActions/cardData/cardDataActions.ts
'use server'

import { cardDataService } from '@/app/services/cardData/fromEnv'
import type { CardIdentifier } from '@/app/services/cardData/types'

/**
 * Get many cards by identifiers (deck imports).
 */
export async function getCardsByIdentifiers(identifiers: CardIdentifier[]) {
  try {
    const cards = await cardDataService().getCardsByIdentifiers(identifiers)
    return {
      success: true,
      cards,
      totalFound: cards.length,
    }
  } catch (error) {
    console.error('Batch card fetch error:', error)
    return {
      success: false,
      cards: [],
      totalFound: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
