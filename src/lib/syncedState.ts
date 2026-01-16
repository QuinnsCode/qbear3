// @/lib/syncedState.ts
'use server'

import { env } from "cloudflare:workers";

/**
 * Generic sync helper - works for any room/key combination
 */
async function syncState(roomId: string, key: string, state: any): Promise<void> {
  if (!env.SYNCED_STATE_SERVER) {
    console.warn('⚠️ SYNCED_STATE_SERVER not configured, skipping sync');
    return;
  }

  try {
    const id = env.SYNCED_STATE_SERVER.idFromName(roomId);
    const stub = env.SYNCED_STATE_SERVER.get(id);
    
    await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: state })
    }));
  } catch (error) {
    console.error(`Failed to sync state for room ${roomId}:`, error);
  }
}

/**
 * Sync game state
 */
export async function syncGameState(gameId: string, state: any): Promise<void> {
  await syncState(gameId, 'state', state);
}

/**
 * Sync deck builder updates for a user
 */
export async function syncDeckBuilder(userId: string, decks?: any): Promise<void> {
  await syncState(`deck-builder-${userId}`, 'decks', decks || { timestamp: Date.now() });
}

/**
 * Sync activity feed for org
 */
export async function syncActivity(orgId: string): Promise<void> {
  await syncState(`sanctum-${orgId}`, 'activity', { timestamp: Date.now() });
}

/**
 * Sync user events/notifications
 */
export async function syncUserEvents(userId: string, events?: any): Promise<void> {
  await syncState(`user-events-${userId}`, 'events', events || { timestamp: Date.now() });
}

/**
 * Sync order notes
 */
export async function syncOrderNotes(orderNumber: string, notes?: any): Promise<void> {
  await syncState(`order-${orderNumber}`, 'notes', notes || { timestamp: Date.now() });
}