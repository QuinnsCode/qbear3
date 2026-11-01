// app/serverActions/cardData/cacheManagement.ts
'use server';

import { env } from "cloudflare:workers";
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider';
import { cardCache } from '@/app/services/cardData/fromEnv';
import { cardImageUrl, cardKeyMetadata } from '@/app/services/cardData/KVCardCache';

/** One page of card:id: keys with their metadata (name + image), so most listings read no values. */
async function listCardKeys(kv: KVNamespace) {
  const list = await kv.list({ prefix: 'card:id:', limit: 1000 });
  return {
    hasMore: !list.list_complete,
    keys: list.keys.map(key => ({ id: key.name.slice('card:id:'.length), meta: cardKeyMetadata(key.metadata) })),
  };
}

/**
 * Search cards in the cache
 */
export async function searchCachedCards(query: string, limit: number = 50) {
  try {
    const cache = cardCache();
    const { keys, hasMore } = await listCardKeys(env.CARDS_KV);
    const wanted = query.toLowerCase();

    // Filter on the name in metadata; keys written before metadata carried a name are kept as
    // candidates and checked once their value is read.
    const candidates = keys
      .filter(k => !wanted || !k.meta || k.meta.name.toLowerCase().includes(wanted))
      .slice(0, limit * 2);
    const found = await cache.getCards(candidates.map(k => k.id));

    const cards = candidates.flatMap(k => {
      const cardData = found.get(k.id);
      if (!cardData || (wanted && !cardData.name.toLowerCase().includes(wanted))) return [];
      const imageUrl = cardImageUrl(cardData);
      return [{
        id: k.id,
        name: cardData.name,
        imageUrl,
        hasValidImage: !!imageUrl && imageUrl.startsWith('http'),
        lastUpdated: cardData.lastUpdated,
        cardData,
      }];
    }).slice(0, limit);

    cards.sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      cards,
      total: cards.length,
      hasMore
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

    const cardData = await new ScryfallProvider().getCard(cardId);
    await cardCache().setCard(cardData);

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

    const cache = cardCache();
    const cardData = await cache.getCard(cardId);
    if (!cardData) {
      return {
        success: false,
        error: 'Card not found in cache'
      };
    }

    cardData.imageUris = {
      ...cardData.imageUris,
      normal: imageUrl,
      large: imageUrl,
      small: imageUrl
    };
    cardData.lastUpdated = Date.now();
    await cache.setCard(cardData);

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

    const { keys } = await listCardKeys(env.CARDS_KV);
    const issueWith = (imageUrl: string | undefined) =>
      !imageUrl ? 'No image URL' : !imageUrl.startsWith('http') ? 'Invalid image URL format' : null;

    // A key whose metadata has an image is fine; read only the rest (no image, or written
    // before metadata carried one).
    const unknown = keys.filter(k => !k.meta?.image).map(k => k.id);
    const read = await cardCache().getCards(unknown);

    const brokenCards: Array<{ id: string; name: string; imageUrl?: string; issue: string }> = [];
    for (const { id, meta } of keys) {
      const card = read.get(id);
      const name = card?.name ?? meta?.name;
      const imageUrl = card ? cardImageUrl(card) : meta?.image;
      const issue = issueWith(imageUrl);
      if (!name || !issue) continue;
      brokenCards.push({ id, name, imageUrl, issue });
      if (brokenCards.length >= limit) break;
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
