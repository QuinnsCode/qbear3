// app/serverActions/draft/getValidPvpDecks.ts
'use server';

import { getUserDecks } from "../deckBuilder/deckActions";
import { PVP_DECK_EXPIRY_MS, type Region } from "@/app/lib/constants/regions";
import type { Deck } from "@/app/types/Deck";

interface PvpDeckMetadata {
  pvpRegion: Region;
  exportedForPvp: number;
  isPvpDeck: true;
}

type DeckWithPvpMetadata = Deck & {
  pvpMetadata?: PvpDeckMetadata;
};

/**
 * Get valid PVP decks for a user (exported within the last 4 hours)
 * Grouped by region
 */
export async function getValidPvpDecks(userId: string) {
  try {
    const { decks, success } = await getUserDecks(userId);

    if (!success) {
      return {
        success: false,
        error: 'Failed to fetch user decks',
        decksByRegion: {} as Record<Region, DeckWithPvpMetadata[]>
      };
    }

    const now = Date.now();
    const expiryTime = now - PVP_DECK_EXPIRY_MS;

    // Filter for valid PVP decks (format='draft', has pvpMetadata, not expired)
    const validPvpDecks = decks
      .filter((deck): deck is DeckWithPvpMetadata => {
        const d = deck as DeckWithPvpMetadata;
        return (
          d.format === 'draft' &&
          d.pvpMetadata?.isPvpDeck === true &&
          d.pvpMetadata.exportedForPvp >= expiryTime
        );
      })
      .sort((a, b) => (b.pvpMetadata!.exportedForPvp - a.pvpMetadata!.exportedForPvp));

    // Group by region
    const decksByRegion: Record<string, DeckWithPvpMetadata[]> = {};

    validPvpDecks.forEach(deck => {
      const region = deck.pvpMetadata!.pvpRegion;
      if (!decksByRegion[region]) {
        decksByRegion[region] = [];
      }
      decksByRegion[region].push(deck);
    });

    console.log(`[getValidPvpDecks] User ${userId} has ${validPvpDecks.length} valid PVP decks across ${Object.keys(decksByRegion).length} regions`);

    return {
      success: true,
      decksByRegion: decksByRegion as Record<Region, DeckWithPvpMetadata[]>,
      totalValidDecks: validPvpDecks.length
    };
  } catch (error) {
    console.error('[getValidPvpDecks] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      decksByRegion: {} as Record<Region, DeckWithPvpMetadata[]>
    };
  }
}
