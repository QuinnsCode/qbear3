// app/serverActions/cardData/seedBasicLands.ts
'use server';

import { env } from "cloudflare:workers";
import { answersName } from '@/app/services/cardData/CardDataService';
import { cardImageUrl } from '@/app/services/cardData/KVCardCache';
import { cardDataService } from '@/app/services/cardData/fromEnv';

/**
 * Fetch cards fresh from Scryfall (one collection call per 75) and overwrite them in the cache.
 */
async function seed(cardNames: string[]) {
  try {
    const names = [...new Set(cardNames)];
    const cards = await cardDataService().getCardsByIdentifiers(names.map(name => ({ name })), { fresh: true });
    const results = names.map(name => {
      const card = cards.find(c => answersName(c, name));
      return card
        ? { name: card.name, id: card.id, imageUrl: cardImageUrl(card), cached: true }
        : { name, cached: false, error: 'Not found on Scryfall' };
    });

    return {
      success: true,
      results,
      message: `Seeded ${results.filter(r => r.cached).length}/${names.length} cards`
    };
  } catch (error) {
    console.error('[seed] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    };
  }
}

/**
 * Seed the cache with basic land cards
 */
export async function seedBasicLands() {
  return seed(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);
}

/**
 * Seed cache with specific cards by name
 */
export async function seedCards(cardNames: string[]) {
  return seed(cardNames);
}

/**
 * Check if CARDS_KV is accessible and show what's in it
 */
export async function diagnosticCacheCheck() {
  try {
    if (!env?.CARDS_KV) {
      return {
        success: false,
        error: 'CARDS_KV binding not found - check wrangler.toml',
        accessible: false
      };
    }

    // Try to list keys
    const list = await env.CARDS_KV.list({ limit: 10 });

    return {
      success: true,
      accessible: true,
      totalKeys: list.keys.length,
      hasMore: !list.list_complete,
      sampleKeys: list.keys.map(k => ({
        name: k.name,
        metadata: k.metadata
      })),
      message: list.keys.length === 0
        ? 'Cache is accessible but empty - no cards cached yet'
        : `Cache is accessible with ${list.keys.length} keys`
    };
  } catch (error) {
    console.error('[diagnosticCacheCheck] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      accessible: false
    };
  }
}
