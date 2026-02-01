// app/serverActions/cardData/getPrintings.ts
'use server'

import { env } from "cloudflare:workers"
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider'
import { KVCardCache } from '@/app/services/cardData/KVCardCache'
import { CardDataService } from '@/app/services/cardData/CardDataService'
import type { CardData } from '@/app/services/cardData/types'

/**
 * Get all printings of a card by oracle ID or card name
 * Returns printings sorted by release date (newest first)
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
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV binding not found')
    }

    const provider = new ScryfallProvider()
    const cache = new KVCardCache(env.CARDS_KV)
    const cardService = new CardDataService(provider, cache)

    let oracleId = params.oracleId

    // If oracle ID not provided, fetch card by name to get oracle ID
    if (!oracleId && params.cardName) {
      const card = await cardService.getCardByName(params.cardName)
      oracleId = card.oracleId
    }

    if (!oracleId) {
      throw new Error('Could not determine oracle ID')
    }

    // Get all printings
    const printings = await provider.getAllPrintings(oracleId)

    // Cache each printing
    if (cache.setPrinting && cache.setOracle) {
      // Cache oracle data (from first printing)
      if (printings.length > 0) {
        const first = printings[0]
        await cache.setOracle({
          oracleId: oracleId,
          name: first.name,
          manaCost: first.manaCost,
          cmc: first.cmc,
          typeLine: first.typeLine,
          oracleText: first.oracleText,
          power: first.power,
          toughness: first.toughness,
          loyalty: first.loyalty,
          colors: first.colors,
          colorIdentity: first.colorIdentity,
          legalities: first.legalities,
          provider: first.provider,
          lastUpdated: first.lastUpdated
        })
      }

      // Cache each printing
      for (const printing of printings) {
        await cache.setPrinting({
          printId: printing.id,
          oracleId: oracleId,
          setCode: printing.setCode,
          setName: printing.setName,
          collectorNumber: printing.collectorNumber,
          rarity: printing.rarity,
          imageUris: printing.imageUris,
          prices: printing.prices,
          provider: printing.provider,
          externalUri: printing.externalUri,
          lastUpdated: printing.lastUpdated
        })

        // Add to oracle's printing list
        if (cache.addPrintingToOracle) {
          await cache.addPrintingToOracle(oracleId, printing.id)
        }
      }
    }

    return {
      success: true,
      printings
    }

  } catch (error) {
    console.error('Error fetching printings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch printings'
    }
  }
}
