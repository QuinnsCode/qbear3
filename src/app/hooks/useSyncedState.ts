// src/app/hooks/useSyncedState.ts
'use client';

import { useSyncedState as useRWSyncedState } from "rwsdk/use-synced-state/client";
import type { GameState } from '@/app/lib/GameState';

/**
 * Game state sync - room encoded in key
 */
export function useGameState(gameId: string) {
  const [gameState] = useRWSyncedState<GameState | null>(
    null,
    `game:${gameId}:state`  // ✅ Room in key (2-param API)
  );
  return gameState;
}

/**
 * Deck builder sync
 */
export function useDeckBuilder(userId: string) {
  const [decksData] = useRWSyncedState<{ timestamp: number } | null>(
    null,
    `deck-builder:${userId}:decks`
  );
  return decksData;
}

/**
 * User events/notifications sync
 */
export function useUserEvents(userId: string) {
  const [eventsData] = useRWSyncedState<{ timestamp: number } | null>(
    null,
    `user-events:${userId}:events`
  );
  return eventsData;
}
