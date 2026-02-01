// src/app/serverActions/cardData/cardDataActions.ts
'use server'

import { env } from "cloudflare:workers"
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider'
import { KVCardCache } from '@/app/services/cardData/KVCardCache'
import { CardDataService } from '@/app/services/cardData/CardDataService'
import type { CardData, CardIdentifier } from '@/app/services/cardData/types'

/**
 * Get the card data service instance with cache
 * This should be called in each server action to get fresh bindings
 */
function getCardDataService(): CardDataService {
  if (!env?.CARDS_KV) {
    throw new Error('CARDS_KV binding not found')
  }

  const provider = new ScryfallProvider()
  const cache = new KVCardCache(env.CARDS_KV)
  return new CardDataService(provider, cache)
}

/**
 * Search for cards by name or query
 * Now uses cache-first strategy via CardDataService
 */
export async function searchCards(query: string, page: number = 1) {
  try {
    const service = getCardDataService()
    
    const results = await service.searchCards(query, page)
    
    return {
      success: true,
      cards: results.cards,
      totalCards: results.totalCards,
      hasMore: results.hasMore,
      nextPage: results.nextPage,
    }
  } catch (error) {
    console.error('Card search error:', error)
    return {
      success: false,
      cards: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      totalCards: 0,
      hasMore: false,
      nextPage: null,
    }
  }
}

/**
 * Get autocomplete suggestions for card names
 */
export async function autocompleteCards(query: string) {
  try {
    const service = getCardDataService()
    const results = await service.autocomplete(query)
    
    return {
      success: true,
      suggestions: results.suggestions,
    }
  } catch (error) {
    console.error('Autocomplete error:', error)
    return {
      success: false,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a specific card by ID
 */
export async function getCard(cardId: string) {
  try {
    const service = getCardDataService()
    const card = await service.getCard(cardId)
    
    return {
      success: true,
      card,
    }
  } catch (error) {
    console.error('Card fetch error:', error)
    return {
      success: false,
      card: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get card by exact name
 */
export async function getCardByName(name: string, set?: string) {
  try {
    const service = getCardDataService()
    const card = await service.getCardByName(name, set)
    
    return {
      success: true,
      card,
    }
  } catch (error) {
    console.error('Named card error:', error)
    return {
      success: false,
      card: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get multiple cards by identifiers (for deck imports)
 * This is the KEY function for your deck builder!
 */
export async function getCardsByIdentifiers(identifiers: CardIdentifier[]) {
  try {
    const service = getCardDataService()
    const cards = await service.getCardsByIdentifiers(identifiers)
    
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

/**
 * Get a random card (optionally filtered)
 */
export async function getRandomCard(query?: string) {
  try {
    const service = getCardDataService()
    const card = await service.getRandomCard(query)
    
    return {
      success: true,
      card,
    }
  } catch (error) {
    console.error('Random card error:', error)
    return {
      success: false,
      card: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Invalidate a card from cache (admin/maintenance function)
 */
export async function invalidateCard(cardId: string) {
  try {
    const service = getCardDataService()
    await service.invalidateCard(cardId)
    
    return {
      success: true,
    }
  } catch (error) {
    console.error('Cache invalidation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}