'use server'

import { env } from "cloudflare:workers";
import type { UserEvent } from "./types";

/**
 * Get user's events (notifications)
 */
export async function getUserEvents(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
  } = {}
): Promise<UserEvent[]> {
  const { unreadOnly = false, limit = 50 } = options;
  
  if (!env.GAME_REGISTRY_KV) {
    console.error('GAME_REGISTRY_KV not available');
    return [];
  }

  try {
    // Get user's event index
    const indexKey = `events:${userId}:index`;
    const indexJson = await env.GAME_REGISTRY_KV.get(indexKey);
    
    if (!indexJson) {
      return []; // No events yet
    }
    
    const eventIds: string[] = JSON.parse(indexJson);
    
    // Fetch events
    const events: UserEvent[] = [];
    for (const eventId of eventIds.slice(0, limit * 2)) { // Fetch extra in case of filtering
      const eventKey = `events:${userId}:${eventId}`;
      const eventJson = await env.GAME_REGISTRY_KV.get(eventKey);
      
      if (eventJson) {
        const event: UserEvent = JSON.parse(eventJson);
        
        // Filter by read status if needed
        if (!unreadOnly || !event.read) {
          events.push(event);
        }
        
        // Stop if we have enough
        if (events.length >= limit) {
          break;
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error getting user events:', error);
    return [];
  }
}

/**
 * Mark an event as read
 */
export async function markEventRead(
  userId: string, 
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV not available' };
  }

  try {
    const eventKey = `events:${userId}:${eventId}`;
    const eventJson = await env.GAME_REGISTRY_KV.get(eventKey);
    
    if (!eventJson) {
      return { success: false, error: 'Event not found' };
    }
    
    const event: UserEvent = JSON.parse(eventJson);
    event.read = true;
    
    await env.GAME_REGISTRY_KV.put(eventKey, JSON.stringify(event));
    
    return { success: true };
  } catch (error) {
    console.error('Error marking event as read:', error);
    return { success: false, error: 'Failed to mark event as read' };
  }
}

/**
 * Mark all events as read
 */
export async function markAllEventsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV not available' };
  }

  try {
    const events = await getUserEvents(userId, { unreadOnly: true });
    
    const promises = events.map(event => 
      markEventRead(userId, event.id)
    );
    
    await Promise.all(promises);
    
    return { success: true };
  } catch (error) {
    console.error('Error marking all events as read:', error);
    return { success: false, error: 'Failed to mark all events as read' };
  }
}

/**
 * Dismiss an event (hide it from the list)
 */
export async function dismissEvent(
  userId: string, 
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV not available' };
  }

  try {
    const eventKey = `events:${userId}:${eventId}`;
    const eventJson = await env.GAME_REGISTRY_KV.get(eventKey);
    
    if (!eventJson) {
      return { success: false, error: 'Event not found' };
    }
    
    const event: UserEvent = JSON.parse(eventJson);
    event.dismissed = true;
    event.read = true; // Auto-mark as read when dismissed
    
    await env.GAME_REGISTRY_KV.put(eventKey, JSON.stringify(event));
    
    return { success: true };
  } catch (error) {
    console.error('Error dismissing event:', error);
    return { success: false, error: 'Failed to dismiss event' };
  }
}

/**
 * Get count of unread events
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const events = await getUserEvents(userId, { unreadOnly: true });
  return events.filter(e => !e.dismissed).length;
}

/**
 * Delete old events (cleanup utility)
 */
export async function cleanupOldEvents(userId: string, daysToKeep: number = 30): Promise<void> {
  if (!env.GAME_REGISTRY_KV) return;

  try {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const indexKey = `events:${userId}:index`;
    const indexJson = await env.GAME_REGISTRY_KV.get(indexKey);
    
    if (!indexJson) return;
    
    const eventIds: string[] = JSON.parse(indexJson);
    const remainingIds: string[] = [];
    
    for (const eventId of eventIds) {
      const eventKey = `events:${userId}:${eventId}`;
      const eventJson = await env.GAME_REGISTRY_KV.get(eventKey);
      
      if (eventJson) {
        const event: UserEvent = JSON.parse(eventJson);
        
        if (event.createdAt > cutoffTime) {
          remainingIds.push(eventId);
        } else {
          // Delete old event
          await env.GAME_REGISTRY_KV.delete(eventKey);
        }
      }
    }
    
    // Update index with remaining events
    await env.GAME_REGISTRY_KV.put(indexKey, JSON.stringify(remainingIds));
  } catch (error) {
    console.error('Error cleaning up old events:', error);
  }
}