// src/app/serverActions/cardGame/starterDecks.ts
'use server'

import { env } from "cloudflare:workers"
import type { Deck } from '@/app/types/Deck'
import starterDeckData from '@/heibaideck.json'

// ============================================
// HARDCODED STARTER DECK KEY
// ============================================
const STARTER_DECK_KEY = 'deck:starter:hei-bai-test'

// ============================================
// SEED DATA - Imported from heibaideck.json
// ============================================
const STARTER_DECK_SEED: Deck = starterDeckData as Deck

/**
 * Get the hardcoded starter deck
 * - Fetches from KV if exists
 * - Seeds into KV if missing
 * - Returns hardcoded data from JSON file
 */
export async function getStarterDeck(): Promise<Deck> {
  if (!env?.DECKS_KV) {
    console.warn('⚠️ DECKS_KV not available - returning hardcoded deck')
    return STARTER_DECK_SEED
  }
  
  try {
    // Try to fetch from KV
    const deckJson = await env.DECKS_KV.get(STARTER_DECK_KEY)
    
    if (deckJson) {
      console.log('✅ Starter deck found in KV')
      return JSON.parse(deckJson) as Deck
    }
    
    // Not found - seed it!
    console.log('🌱 Starter deck not found - seeding into KV...')
    await seedStarterDeck()
    
    return STARTER_DECK_SEED
    
  } catch (error) {
    console.error('❌ Failed to get starter deck from KV:', error)
    // Fallback to hardcoded data
    return STARTER_DECK_SEED
  }
}

/**
 * Seed the starter deck into KV (called automatically if missing)
 */
async function seedStarterDeck(): Promise<void> {
  if (!env?.DECKS_KV) {
    return
  }
  
  try {
    await env.DECKS_KV.put(
      STARTER_DECK_KEY,
      JSON.stringify(STARTER_DECK_SEED),
      {
        expirationTtl: 60 * 60 * 24 * 365, // 1 year
        metadata: {
          isStarterDeck: true,
          deckName: STARTER_DECK_SEED.name,
          commander: STARTER_DECK_SEED.commander,
          totalCards: STARTER_DECK_SEED.totalCards,
        }
      }
    )
    
    console.log('✅ Starter deck seeded into KV:', STARTER_DECK_KEY)
  } catch (error) {
    console.error('❌ Failed to seed starter deck:', error)
  }
}

/**
 * Admin function: Force re-seed (for updates to the deck)
 */
export async function reseedStarterDeck(): Promise<{ success: boolean, message: string }> {
  try {
    console.log('🔄 Force re-seeding starter deck...')
    await seedStarterDeck()
    return {
      success: true,
      message: `Starter deck "${STARTER_DECK_SEED.name}" re-seeded successfully`
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}