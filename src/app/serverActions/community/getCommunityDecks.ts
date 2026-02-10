// app/serverActions/community/getCommunityDecks.ts
'use server';

import { getCommunityDecksService, invalidateCommunityDecksCacheService } from '@/app/services/community/communityService';

/**
 * Server action wrapper for getCommunityDecksService
 * Use this from CLIENT components
 *
 * @param offset - Number of decks to skip (for pagination)
 * @param limit - Number of decks to return per batch
 */
export async function getCommunityDecks(offset: number = 0, limit: number = 20) {
  return getCommunityDecksService(offset, limit);
}

/**
 * Server action wrapper for invalidateCommunityDecksCacheService
 * Use this from CLIENT components
 */
export async function invalidateCommunityDecksCache() {
  return invalidateCommunityDecksCacheService();
}
