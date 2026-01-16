// hooks/useSyncedState.ts
'use client';

import { useSyncedState as useRWSyncedState } from "rwsdk/use-synced-state/client";
import type { GameState } from '@/app/lib/GameState';

/**
 * Game state sync
 * Key includes gameId for scoping
 */
export function useGameState(gameId: string) {
  const [gameState] = useRWSyncedState<GameState | null>(
    null,
    `game:${gameId}:state`  // ✅ Include room in the key
  );
  return gameState;
}

/**
 * Deck builder sync
 */
export function useDeckBuilder(userId: string) {
  const [decksData] = useRWSyncedState<{ timestamp: number } | null>(
    null,
    `deck-builder:${userId}:decks`  // ✅ Include user in the key
  );
  return decksData;
}

/**
 * Activity feed sync (for Sanctum)
 */
export function useActivityFeed(orgId: string) {
  const [activity] = useRWSyncedState<{ timestamp: number } | null>(
    null,
    `sanctum:${orgId}:activity`  // ✅ Include org in the key
  );
  return activity;
}

/**
 * User events/notifications sync
 */
export function useUserEvents(userId: string) {
  const [eventsData] = useRWSyncedState<{ timestamp: number } | null>(
    null,
    `user-events:${userId}:events`  // ✅ Include user in the key
  );
  return eventsData;
}

/**
 * Order notes sync
 */
export function useOrderNotes(orderNumber: string) {
  const [notesData] = useRWSyncedState<{ timestamp: number } | null>(
    null,
    `order:${orderNumber}:notes`  // ✅ Include order in the key
  );
  return notesData;
}