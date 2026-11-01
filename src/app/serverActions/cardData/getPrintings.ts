// app/serverActions/cardData/getPrintings.ts
'use server'

import type { CardData } from '@/app/services/cardData/types'
import { cardDataService } from '@/app/services/cardData/fromEnv'

/**
 * Every printing of a card, by oracle ID or card name, newest first.
 * Nothing is written to KV: the Scryfall search behind this sits in the edge cache for a day.
 */
export async function getAllPrintings(params: {
  oracleId?: string
  cardName?: string
}): Promise<{
  success: boolean
  printings?: CardData[]
  error?: string
}> {
  try {
    const service = cardDataService()
    const oracleId = params.oracleId
      ?? (params.cardName ? (await service.getCardByName(params.cardName)).oracleId : undefined)
    if (!oracleId) {
      throw new Error('Could not determine oracle ID')
    }
    return { success: true, printings: await service.getAllPrintings(oracleId) }
  } catch (error) {
    console.error('Error fetching printings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch printings'
    }
  }
}
