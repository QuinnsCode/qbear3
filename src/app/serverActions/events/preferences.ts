'use server'

import { env } from "cloudflare:workers";
import type { EventType, UserEventPreferences } from "./types";

const DEFAULT_PREFERENCES: Omit<UserEventPreferences, 'userId'> = {
  enabled: {
    // Social - default ON
    friend_request_received: true,
    friend_request_accepted: true,
    friend_request_declined: true,
    game_invite_received: true,
    game_invite_accepted: true,
    game_invite_declined: true,
    
    // Game - default ON
    game_started: true,
    game_turn_ready: true,
    game_ended: true,
    player_joined: true,
    player_left: true,
  },
  channels: {
    realtime: true,   // On by default
    discord: false,   // Off by default (user must opt-in)
  },
};

/**
 * Get user's event notification preferences
 * KV Key: preferences:events:{userId}
 */
export async function getUserEventPreferences(userId: string): Promise<UserEventPreferences> {
  if (!env.GAME_REGISTRY_KV) {
    console.error('GAME_REGISTRY_KV not available');
    return { userId, ...DEFAULT_PREFERENCES };
  }

  try {
    const key = `preferences:events:${userId}`;
    const prefsJson = await env.GAME_REGISTRY_KV.get(key);
    
    if (prefsJson) {
      return JSON.parse(prefsJson);
    }
    
    // Return defaults for new users
    return {
      userId,
      ...DEFAULT_PREFERENCES,
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { userId, ...DEFAULT_PREFERENCES };
  }
}

/**
 * Update user's event notification preferences
 */
export async function updateEventPreferences(
  userId: string,
  updates: Partial<Omit<UserEventPreferences, 'userId'>>
): Promise<{ success: boolean; preferences?: UserEventPreferences; error?: string }> {
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV not available' };
  }

  try {
    const current = await getUserEventPreferences(userId);
    
    const updated: UserEventPreferences = {
      userId,
      enabled: { ...current.enabled, ...updates.enabled },
      channels: { ...current.channels, ...updates.channels },
    };
    
    const key = `preferences:events:${userId}`;
    await env.GAME_REGISTRY_KV.put(key, JSON.stringify(updated));
    
    return { success: true, preferences: updated };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return { success: false, error: 'Failed to update preferences' };
  }
}

/**
 * Check if a specific event type is enabled for a user
 */
export async function isEventEnabled(userId: string, eventType: EventType): Promise<boolean> {
  const preferences = await getUserEventPreferences(userId);
  return preferences.enabled[eventType] ?? true; // Default to enabled
}