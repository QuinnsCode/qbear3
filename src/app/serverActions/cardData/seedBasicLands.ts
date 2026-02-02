// app/serverActions/cardData/seedBasicLands.ts
'use server';

import { env } from "cloudflare:workers";
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider';
import { KVCardCache } from '@/app/services/cardData/KVCardCache';

/**
 * Seed the cache with basic land cards
 * Useful for ensuring common cards have proper images
 */
export async function seedBasicLands() {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    const provider = new ScryfallProvider();
    const cache = new KVCardCache(env.CARDS_KV);

    console.log('[seedBasicLands] Fetching basic lands from Scryfall...');

    // Basic land names
    const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    const results = [];

    for (const landName of basicLands) {
      try {
        console.log(`[seedBasicLands] Fetching ${landName}...`);

        // Fetch from Scryfall (gets the latest/default printing)
        const card = await provider.getCardByName(landName);

        // Cache it
        await cache.setCard(card);

        results.push({
          name: card.name,
          id: card.id,
          imageUrl: card.imageUris?.normal || card.imageUris?.large,
          cached: true
        });

        console.log(`✅ Cached ${landName}: ${card.id}`);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to cache ${landName}:`, error);
        results.push({
          name: landName,
          cached: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: true,
      results,
      message: `Seeded ${results.filter(r => r.cached).length}/${basicLands.length} basic lands`
    };
  } catch (error) {
    console.error('[seedBasicLands] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    };
  }
}

/**
 * Seed cache with specific cards by name
 */
export async function seedCards(cardNames: string[]) {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    const provider = new ScryfallProvider();
    const cache = new KVCardCache(env.CARDS_KV);

    console.log(`[seedCards] Fetching ${cardNames.length} cards from Scryfall...`);

    const results = [];

    for (const cardName of cardNames) {
      try {
        console.log(`[seedCards] Fetching ${cardName}...`);

        const card = await provider.getCardByName(cardName);
        await cache.setCard(card);

        results.push({
          name: card.name,
          id: card.id,
          imageUrl: card.imageUris?.normal || card.imageUris?.large,
          cached: true
        });

        console.log(`✅ Cached ${cardName}: ${card.id}`);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to cache ${cardName}:`, error);
        results.push({
          name: cardName,
          cached: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: true,
      results,
      message: `Seeded ${results.filter(r => r.cached).length}/${cardNames.length} cards`
    };
  } catch (error) {
    console.error('[seedCards] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    };
  }
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
