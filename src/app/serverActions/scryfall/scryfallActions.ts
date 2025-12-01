// src/app/serverActions/cardGame/scryfall/scryfallActions.ts
'use server'

import { ScryfallClient } from '@/app/api/scryfall/scryfall'
import type { Card, EnrichedCard } from '@/app/api/scryfall/scryfallTypes'

/**
 * Gets the best available card image URL with fallback support
 */
function getCardImageUrl(
  card: Card,
  preferredSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal'
): string | null {
  // Handle double-faced cards
  const imageUris = card.image_uris || card.card_faces?.[0]?.image_uris
  
  if (!imageUris) {
    return null
  }

  // Fallback order - tries preferred size first, then falls back
  const fallbackOrder = [
    preferredSize,
    'normal',
    'large',
    'png',
    'small',
    'art_crop',
    'border_crop'
  ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates

  // Return the first available image
  for (const size of fallbackOrder) {
    if (imageUris[size]) {
      return imageUris[size]
    }
  }

  return null
}

/**
 * Validates that a card image actually exists
 */
async function validateCardImage(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      cache: 'no-store' 
    })
    return response.ok && response.headers.get('content-type')?.startsWith('image/')
  } catch {
    return false
  }
}

/**
 * Enriches a card object with validated image URL
 */
async function enrichCardWithImage(
    card: Card, 
    preferredSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal',
    validate: boolean = true
  ): Promise<EnrichedCard> {
    const imageUrl = getCardImageUrl(card, preferredSize)
    
    if (!imageUrl) {
      return { ...card, validatedImageUrl: null }
    }
  
    if (validate) {
      const isValid = await validateCardImage(imageUrl)
      return { 
        ...card, 
        validatedImageUrl: isValid ? imageUrl : null 
      }
    }
  
    return { ...card, validatedImageUrl: imageUrl }
}

/**
 * Search for cards by name or query
 */
export async function searchScryfallCards(
    query: string, 
    page: number = 1,
    imageSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal',
    validateImages: boolean = false
) {
  try {
    const client = new ScryfallClient()
    
    // If query looks like a simple name, use fuzzy named search for better results
    if (query.length > 0 && !query.includes(':') && !query.includes('=')) {
      try {
        // Try exact/fuzzy match first
        const card = await client.getNamedCard({ fuzzy: query })
        const enrichedCard = await enrichCardWithImage(card, imageSize, validateImages)
        
        return {
          success: true,
          cards: [enrichedCard],
          totalCards: 1,
          hasMore: false,
          nextPage: null,
        }
      } catch (error) {
        // If fuzzy match fails, fall through to full search
        console.log('Fuzzy match failed, trying full search')
      }
    }
    
    // Full text search
    const results = await client.searchCards({ 
      q: query,
      page,
      unique: 'cards',
      order: 'name'
    })
    
    // Enrich cards with validated images
    const enrichedCards = await Promise.all(
      results.data.map(card => enrichCardWithImage(card, imageSize, validateImages))
    )
    
    return {
      success: true,
      cards: enrichedCards as EnrichedCard[],
      totalCards: results.total_cards,
      hasMore: results.has_more,
      nextPage: results.has_more ? page + 1 : null,
    }
  } catch (error) {
    console.error('Scryfall search error:', error)
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
export async function autocompleteScryfallCards(query: string) {
  try {
    const client = new ScryfallClient()
    const results = await client.autocomplete({ q: query })
    
    return {
      success: true,
      suggestions: results.data,
    }
  } catch (error) {
    console.error('Scryfall autocomplete error:', error)
    return {
      success: false,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a specific card by Scryfall ID
 */
export async function getScryfallCard(
  cardId: string,
  imageSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal',
  validateImage: boolean = false
) {
  try {
    const client = new ScryfallClient()
    const card = await client.getCard(cardId)
    const enrichedCard = await enrichCardWithImage(card, imageSize, validateImage)
    
    return {
      success: true,
      card: enrichedCard,
    }
  } catch (error) {
    console.error('Scryfall card fetch error:', error)
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
export async function getScryfallCardByName(
  name: string, 
  set?: string,
  imageSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal',
  validateImage: boolean = false
) {
  try {
    const client = new ScryfallClient()
    const card = await client.getNamedCard({ 
      exact: name,
      ...(set && { set })
    })
    const enrichedCard = await enrichCardWithImage(card, imageSize, validateImage)
    
    return {
      success: true,
      card: enrichedCard,
    }
  } catch (error) {
    console.error('Scryfall named card error:', error)
    return {
      success: false,
      card: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a random card (optionally filtered)
 */
export async function getRandomScryfallCard(
  query?: string,
  imageSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal',
  validateImage: boolean = false
) {
  try {
    const client = new ScryfallClient()
    const card = await client.getRandomCard(query ? { q: query } : undefined)
    const enrichedCard = await enrichCardWithImage(card, imageSize, validateImage)
    
    return {
      success: true,
      card: enrichedCard,
    }
  } catch (error) {
    console.error('Scryfall random card error:', error)
    return {
      success: false,
      card: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Utility: Get just the image URL for a card (client-side fallback helper)
 */
export async function getCardImage(
  cardId: string,
  preferredSize: 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop' = 'normal'
) {
  try {
    const client = new ScryfallClient()
    const card = await client.getCard(cardId)
    const imageUrl = getCardImageUrl(card, preferredSize)
    
    return {
      success: true,
      imageUrl,
      cardName: card.name
    }
  } catch (error) {
    return {
      success: false,
      imageUrl: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}