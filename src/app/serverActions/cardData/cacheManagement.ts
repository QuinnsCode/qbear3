// app/serverActions/cardData/cacheManagement.ts
'use server';

import { env } from "cloudflare:workers";
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider';
import type { CardData } from '@/app/services/cardData/types';

/**
 * Search cards in the cache
 */
export async function searchCachedCards(query: string, limit: number = 50) {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    // List all card keys from KV
    const list = await env.CARDS_KV.list({ prefix: 'card:id:', limit: 1000 });

    const cards: Array<{
      id: string;
      name: string;
      imageUrl?: string;
      hasValidImage: boolean;
      lastUpdated?: number;
      cardData?: CardData;
    }> = [];

    // Fetch card data for matching keys
    for (const key of list.keys) {
      const cardId = key.name.replace('card:id:', '');
      const cardDataStr = await env.CARDS_KV.get(key.name);

      if (!cardDataStr) continue;

      try {
        const cardData = JSON.parse(cardDataStr) as CardData;

        // Filter by query (case-insensitive)
        const normalizedQuery = query.toLowerCase();
        if (normalizedQuery && !cardData.name.toLowerCase().includes(normalizedQuery)) {
          continue;
        }

        // Check if image URL is valid
        const imageUrl = cardData.imageUris?.normal || cardData.imageUris?.large || cardData.imageUris?.small;
        const hasValidImage = !!imageUrl && imageUrl.startsWith('http');

        cards.push({
          id: cardId,
          name: cardData.name,
          imageUrl,
          hasValidImage,
          lastUpdated: (key.metadata as any)?.lastUpdated,
          cardData
        });

        if (cards.length >= limit) break;
      } catch (err) {
        console.warn(`Failed to parse card data for ${cardId}:`, err);
      }
    }

    // Sort by name
    cards.sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      cards,
      total: cards.length,
      hasMore: list.keys.length >= 1000
    };
  } catch (error) {
    console.error('[searchCachedCards] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cards: [],
      total: 0,
      hasMore: false
    };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    const list = await env.CARDS_KV.list({ limit: 1000 });

    const stats = {
      totalKeys: list.keys.length,
      hasMore: !list.list_complete,
      breakdown: {
        cardData: 0,
        cardNameMappings: 0,
        searchResults: 0,
        autocomplete: 0,
        other: 0
      }
    };

    for (const key of list.keys) {
      const keyName = key.name;
      if (keyName.startsWith('card:id:')) stats.breakdown.cardData++;
      else if (keyName.startsWith('card:name:')) stats.breakdown.cardNameMappings++;
      else if (keyName.startsWith('search:')) stats.breakdown.searchResults++;
      else if (keyName.startsWith('autocomplete:')) stats.breakdown.autocomplete++;
      else stats.breakdown.other++;
    }

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('[getCacheStats] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: null
    };
  }
}

/**
 * Refresh a card's data from Scryfall (useful for fixing broken images)
 */
export async function refreshCardData(cardId: string) {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    console.log(`[refreshCardData] Refreshing card ${cardId}...`);

    // Fetch fresh data from Scryfall
    const provider = new ScryfallProvider();
    const cardData = await provider.getCard(cardId);

    if (!cardData) {
      return {
        success: false,
        error: 'Card not found on Scryfall'
      };
    }

    // Update cache with fresh data
    const cacheKey = `card:id:${cardId}`;
    await env.CARDS_KV.put(cacheKey, JSON.stringify(cardData), {
      expirationTtl: 60 * 60 * 24 * 365, // 1 year
      metadata: {
        lastUpdated: Date.now(),
        refreshedManually: true
      }
    });

    // Also update name mapping
    const nameMappingKey = `card:name:${cardData.name.toLowerCase()}`;
    await env.CARDS_KV.put(nameMappingKey, cardId, {
      expirationTtl: 60 * 60 * 24 * 365
    });

    console.log(`✅ Refreshed card: ${cardData.name}`);

    return {
      success: true,
      cardData
    };
  } catch (error) {
    console.error('[refreshCardData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update card image URL manually (for custom art or fixing broken images)
 */
export async function updateCardImage(cardId: string, imageUrl: string) {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    console.log(`[updateCardImage] Updating image for ${cardId}...`);

    // Get existing card data
    const cacheKey = `card:id:${cardId}`;
    const existingDataStr = await env.CARDS_KV.get(cacheKey);

    if (!existingDataStr) {
      return {
        success: false,
        error: 'Card not found in cache'
      };
    }

    const cardData = JSON.parse(existingDataStr) as CardData;

    // Update image URLs
    cardData.imageUris = {
      ...cardData.imageUris,
      normal: imageUrl,
      large: imageUrl,
      small: imageUrl
    };

    // Save updated data
    await env.CARDS_KV.put(cacheKey, JSON.stringify(cardData), {
      expirationTtl: 60 * 60 * 24 * 365, // 1 year
      metadata: {
        lastUpdated: Date.now(),
        imageUpdatedManually: true
      }
    });

    console.log(`✅ Updated image for: ${cardData.name}`);

    return {
      success: true,
      cardData
    };
  } catch (error) {
    console.error('[updateCardImage] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get cards with broken/missing images
 */
export async function getBrokenImageCards(limit: number = 100) {
  try {
    if (!env?.CARDS_KV) {
      throw new Error('CARDS_KV not configured');
    }

    const list = await env.CARDS_KV.list({ prefix: 'card:id:', limit: 1000 });

    const brokenCards: Array<{
      id: string;
      name: string;
      imageUrl?: string;
      issue: string;
    }> = [];

    for (const key of list.keys) {
      const cardId = key.name.replace('card:id:', '');
      const cardDataStr = await env.CARDS_KV.get(key.name);

      if (!cardDataStr) continue;

      try {
        const cardData = JSON.parse(cardDataStr) as CardData;
        const imageUrl = cardData.imageUris?.normal || cardData.imageUris?.large || cardData.imageUris?.small;

        let issue: string | null = null;

        if (!imageUrl) {
          issue = 'No image URL';
        } else if (!imageUrl.startsWith('http')) {
          issue = 'Invalid image URL format';
        }

        if (issue) {
          brokenCards.push({
            id: cardId,
            name: cardData.name,
            imageUrl,
            issue
          });

          if (brokenCards.length >= limit) break;
        }
      } catch (err) {
        console.warn(`Failed to parse card data for ${cardId}:`, err);
      }
    }

    return {
      success: true,
      cards: brokenCards,
      total: brokenCards.length
    };
  } catch (error) {
    console.error('[getBrokenImageCards] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cards: [],
      total: 0
    };
  }
}
