// lib/syncedState.ts
'use server'

import { env } from "cloudflare:workers";

/**
 * Sync state to a specific key
 * The key should include all scoping info (e.g., "game:abc123:state")
 */
async function syncState(key: string, state: any): Promise<void> {
  if (!env.SYNCED_STATE_SERVER) {
    console.warn('⚠️ SYNCED_STATE_SERVER not configured, skipping sync');
    return;
  }

  try {
    // Extract room ID from key (e.g., "game:abc123:state" -> use "game:abc123")
    const roomId = key.split(':').slice(0, 2).join(':') || 'default';
    
    const id = env.SYNCED_STATE_SERVER.idFromName(roomId);
    const stub = env.SYNCED_STATE_SERVER.get(id);
    
    await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: state })
    }));
  } catch (error) {
    console.error(`Failed to sync state for key ${key}:`, error);
  }
}

/**
 * Sync game state
 */
export async function syncGameState(gameId: string, state: any): Promise<void> {
  await syncState(`game:${gameId}:state`, state);
}

/**
 * Sync deck builder updates for a user
 */
export async function syncDeckBuilder(userId: string, decks?: any): Promise<void> {
  await syncState(`deck-builder:${userId}:decks`, decks || { timestamp: Date.now() });
}

/**
 * Sync activity feed for org
 */
export async function syncActivity(orgId: string): Promise<void> {
  await syncState(`sanctum:${orgId}:activity`, { timestamp: Date.now() });
}

/**
 * Sync user events/notifications
 */
export async function syncUserEvents(userId: string, events?: any): Promise<void> {
  await syncState(`user-events:${userId}:events`, events || { timestamp: Date.now() });
}

/**
 * Sync order notes
 */
export async function syncOrderNotes(orderNumber: string, notes?: any): Promise<void> {
  await syncState(`order:${orderNumber}:notes`, notes || { timestamp: Date.now() });
}