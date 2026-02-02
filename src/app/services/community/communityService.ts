// src/app/services/community/communityService.ts
import { env } from "cloudflare:workers";
import type { Deck } from "@/app/types/Deck";

const CACHE_KEY = 'community:decks:latest';
const CACHE_TTL = 30 * 60; // 30 minutes in seconds

// Lightweight deck info for community display (no cards array)
export interface CommunityDeckInfo {
  id: string;
  name: string;
  format: 'commander' | 'draft';
  commanders?: string[];
  commanderImageUrls?: string[];
  colors: string[];
  totalCards: number;
  createdAt: number;
}

export interface CommunityDeck {
  deck: CommunityDeckInfo;
  userId: string;
  userName?: string;
}

export interface CommunityDecksResult {
  success: boolean;
  decks: CommunityDeck[];
  cached: boolean;
  cacheAge?: string;
  error?: string;
  hasMore?: boolean;
  total?: number;
}

/**
 * Get latest community decks with 30-minute caching
 *
 * This is a service function that can be called from:
 * - Server components (directly)
 * - Server actions (wrapped)
 * - API routes
 *
 * @param offset - Number of decks to skip (for pagination)
 * @param limit - Number of decks to return
 */
export async function getCommunityDecksService(
  offset: number = 0,
  limit: number = 20
): Promise<CommunityDecksResult> {
  try {
    if (!env?.DECKS_KV) {
      throw new Error('DECKS_KV not configured');
    }

    // Try cache first (only for offset 0 - first page)
    let allDecks: CommunityDeck[] | null = null;

    if (offset === 0) {
      const cached = await env.DECKS_KV.get(CACHE_KEY, 'json');
      if (cached) {
        console.log('✅ Community decks cache HIT');
        allDecks = cached as CommunityDeck[];
      }
    }

    if (!allDecks) {
      console.log('❌ Community decks cache MISS - fetching fresh data');

      // Cache miss - fetch fresh data
      // List all deck keys (this gets metadata which includes createdAt)
      const allKeys = await env.DECKS_KV.list({
        prefix: 'deck:',
        limit: 1000
      });

      // Filter for deck data keys (not lists)
      // Format: deck:userId:deckId
      const deckKeys = allKeys.keys.filter(key => {
        const parts = key.name.split(':');
        return parts.length === 3 && parts[0] === 'deck';
      });

      // Sort by metadata createdAt (newest first)
      deckKeys.sort((a, b) => {
        const aCreated = (a.metadata as any)?.createdAt || 0;
        const bCreated = (b.metadata as any)?.createdAt || 0;
        return bCreated - aCreated;
      });

      // Fetch ALL decks for caching
      const deckPromises = deckKeys.map(async (key) => {
        const parts = key.name.split(':');
        const userId = parts[1];
        const deckId = parts[2];

        const deckJson = await env.DECKS_KV.get(key.name);
        if (!deckJson) return null;

        try {
          const fullDeck = JSON.parse(deckJson) as Deck;

          // Extract only the metadata we need (no cards array!)
          // Add defensive checks for all fields
          const deckInfo: CommunityDeckInfo = {
            id: fullDeck.id || deckId,
            name: fullDeck.name || 'Unnamed Deck',
            format: fullDeck.format || 'commander',
            commanders: fullDeck.commanders || [],
            commanderImageUrls: fullDeck.commanderImageUrls || [],
            colors: Array.isArray(fullDeck.colors) ? fullDeck.colors : [],
            totalCards: fullDeck.totalCards || 0,
            createdAt: fullDeck.createdAt || Date.now()
          };

          return {
            deck: deckInfo,
            userId,
            userName: (key.metadata as any)?.userName || 'Unknown Player'
          } as CommunityDeck;
        } catch (err) {
          console.warn(`Failed to parse deck ${deckId}:`, err);
          return null;
        }
      });

      allDecks = (await Promise.all(deckPromises)).filter(d => d !== null) as CommunityDeck[];

      console.log(`✅ Fetched ${allDecks.length} community decks`);

      // Cache ALL decks (only if fetching from offset 0)
      if (offset === 0) {
        await env.DECKS_KV.put(CACHE_KEY, JSON.stringify(allDecks), {
          expirationTtl: CACHE_TTL
        });
        console.log('✅ Cached community decks for 30 minutes');
      }
    }

    // Apply pagination
    const paginatedDecks = allDecks.slice(offset, offset + limit);
    const hasMore = offset + limit < allDecks.length;

    return {
      success: true,
      decks: paginatedDecks,
      cached: offset === 0 && allDecks.length > 0,
      cacheAge: offset === 0 ? 'Less than 30 minutes' : undefined,
      hasMore,
      total: allDecks.length
    };

  } catch (error) {
    console.error('[getCommunityDecksService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      decks: [],
      cached: false
    };
  }
}

/**
 * Invalidate the community decks cache
 * Call this when a new deck is created to refresh the list
 */
export async function invalidateCommunityDecksCacheService() {
  try {
    if (!env?.DECKS_KV) {
      return { success: false, error: 'DECKS_KV not configured' };
    }

    await env.DECKS_KV.delete(CACHE_KEY);
    console.log('✅ Community decks cache invalidated');

    return { success: true };
  } catch (error) {
    console.error('[invalidateCommunityDecksCacheService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
