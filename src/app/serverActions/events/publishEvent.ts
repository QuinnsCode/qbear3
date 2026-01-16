'use server'

import { env } from "cloudflare:workers";
import { syncUserEvents } from "@/lib/syncedState";
import { db } from "@/db";
import type { EventType, UserEvent } from "./types";
import { getUserEventPreferences } from "./preferences";

/**
 * Get event category from event type
 */
function getEventCategory(type: EventType): 'social' | 'game' | 'system' {
  if (type.includes('friend') || type.includes('invite')) return 'social';
  if (type.includes('game') || type.includes('player')) return 'game';
  return 'system';
}

/**
 * Publish an event to a user's event stream
 */
export async function publishEvent(params: {
  type: EventType;
  userId: string;
  data: Record<string, any>;
  fromUserId?: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const { type, userId, data, fromUserId } = params;
  
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV not available' };
  }

  try {
    // 1. Check if user has this event type enabled
    const preferences = await getUserEventPreferences(userId);
    if (preferences.enabled[type] === false) {
      console.log(`Event ${type} skipped - user has it disabled`);
      return { success: true, eventId: 'skipped' }; // Not an error, just disabled
    }
    
    // 2. Get sender info if applicable
    let fromUserName: string | undefined;
    let fromUserImage: string | undefined;
    
    if (fromUserId) {
      try {
        const sender = await db.user.findFirst({
          where: { id: fromUserId },
          select: { name: true, image: true },
        });
        fromUserName = sender?.name || undefined;
        fromUserImage = sender?.image || undefined;
      } catch (error) {
        console.error('Error fetching sender info:', error);
      }
    }
    
    // 3. Create event
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event: UserEvent = {
      id: eventId,
      type,
      category: getEventCategory(type),
      userId,
      data,
      fromUserId,
      fromUserName,
      fromUserImage,
      createdAt: Date.now(),
      read: false,
      dismissed: false,
    };
    
    // 4. Store event in KV
    const eventKey = `events:${userId}:${eventId}`;
    await env.GAME_REGISTRY_KV.put(eventKey, JSON.stringify(event), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });
    
    // 5. Update user's event index
    const indexKey = `events:${userId}:index`;
    const indexJson = await env.GAME_REGISTRY_KV.get(indexKey);
    const eventIds: string[] = indexJson ? JSON.parse(indexJson) : [];
    
    // Add new event to front (newest first)
    eventIds.unshift(eventId);
    
    // Keep only last 100 events in index
    const trimmedIds = eventIds.slice(0, 100);
    await env.GAME_REGISTRY_KV.put(indexKey, JSON.stringify(trimmedIds));
    
    // 6. Trigger realtime update if user has realtime enabled
    if (preferences.channels.realtime) {
      await syncUserEvents(userId, event);
    }
    
    console.log(`✅ Published event ${type} to user ${userId}`);
    
    return { success: true, eventId };
  } catch (error) {
    console.error('Error publishing event:', error);
    return { success: false, error: 'Failed to publish event' };
  }
}

/**
 * Batch publish events to multiple users
 */
export async function publishEventBatch(
  events: Array<{
    type: EventType;
    userId: string;
    data: Record<string, any>;
    fromUserId?: string;
  }>
): Promise<{ success: boolean; published: number; failed: number }> {
  let published = 0;
  let failed = 0;
  
  const promises = events.map(async (event) => {
    const result = await publishEvent(event);
    if (result.success) {
      published++;
    } else {
      failed++;
    }
  });
  
  await Promise.allSettled(promises);
  
  return { success: failed === 0, published, failed };
}