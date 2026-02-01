// app/serverActions/draft/exportPvpDeck.ts
'use server';

import { env } from "cloudflare:workers";
import type { Region } from "@/app/lib/constants/regions";
import { exportDraftDeck } from "./exportDraftDeck";
import { getUserDecks, deleteDeck } from "../deckBuilder/deckActions";

interface PvpDeckMetadata {
  pvpRegion: Region;
  exportedForPvp: number; // timestamp
  isPvpDeck: true;
}

export async function exportPvpDeck(
  draftId: string,
  playerId: string,
  deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>;
    sideboard: Array<{ scryfallId: string; quantity: number }>;
    basics: Record<string, number>;
  },
  pvpRegion: Region
) {
  // Auto-cleanup: Delete oldest PVP deck if at limit
  try {
    const { decks } = await getUserDecks(playerId);
    const draftDecks = decks.filter((d: any) => d.format === 'draft');

    if (draftDecks.length >= 10) {
      // Find oldest PVP deck to delete
      const pvpDecks = draftDecks
        .filter((d: any) => d.pvpMetadata?.isPvpDeck)
        .sort((a: any, b: any) => a.createdAt - b.createdAt);

      if (pvpDecks.length > 0) {
        const oldestPvpDeck = pvpDecks[0];
        console.log('🧹 Auto-deleting oldest PVP deck:', oldestPvpDeck.name);
        await deleteDeck(playerId, oldestPvpDeck.id);
      } else {
        // No PVP decks to delete, find oldest regular draft deck
        const regularDrafts = draftDecks
          .filter((d: any) => !d.pvpMetadata?.isPvpDeck)
          .sort((a: any, b: any) => a.createdAt - b.createdAt);

        if (regularDrafts.length > 0) {
          const oldestDraft = regularDrafts[0];
          console.log('🧹 Auto-deleting oldest draft deck:', oldestDraft.name);
          await deleteDeck(playerId, oldestDraft.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to auto-cleanup old decks:', error);
    // Continue anyway - exportDraftDeck will handle the limit error
  }

  // Use existing export logic
  const result = await exportDraftDeck(draftId, playerId, deckConfig);

  if (!result.success || !result.deckId) {
    return result;
  }

  // Add PVP metadata to the deck in KV
  try {
    const deckKey = `deck:${playerId}:${result.deckId}`;
    const existingDeckStr = await env.DECKS_KV.get(deckKey);

    if (!existingDeckStr) {
      return {
        success: false,
        error: 'Deck not found after export'
      };
    }

    const deck = JSON.parse(existingDeckStr);

    // Add PVP metadata
    const pvpMetadata: PvpDeckMetadata = {
      pvpRegion,
      exportedForPvp: Date.now(),
      isPvpDeck: true
    };

    deck.pvpMetadata = pvpMetadata;

    // Update deck in KV with same TTL and metadata
    const originalMetadata = await env.DECKS_KV.getWithMetadata(deckKey);
    await env.DECKS_KV.put(deckKey, JSON.stringify(deck), {
      expirationTtl: 90 * 24 * 60 * 60, // 90 days
      metadata: {
        ...originalMetadata.metadata,
        pvpRegion,
        exportedForPvp: pvpMetadata.exportedForPvp,
        isPvpDeck: true
      }
    });

    return {
      success: true,
      deckId: result.deckId,
      pvpMetadata
    };
  } catch (error) {
    console.error('Error adding PVP metadata to deck:', error);
    return {
      success: false,
      error: 'Failed to add PVP metadata'
    };
  }
}
