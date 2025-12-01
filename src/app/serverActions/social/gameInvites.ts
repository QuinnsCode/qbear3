'use server'

import { env } from "cloudflare:workers";
import { db } from "@/db";
import { publishEvent } from "@/app/serverActions/events/publishEvent";

// Types
export type GameType = 'main' | 'card';

export type GameInvite = {
  id: string;
  gameType: GameType;
  gameId: string; // e.g., "alive-purple-goat"
  gameName: string; // e.g., "Alive Purple Goat"
  gameUrl: string; // e.g., "https://alice.yourdomain.com/game/alive-purple-goat"
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  expiresAt: number;
};

const CACHE_PREFIX = {
  gameInvite: (inviteId: string) => `game:invite:${inviteId}`,
  receivedInvites: (userId: string) => `game:invites:received:${userId}`,
  sentInvites: (userId: string) => `game:invites:sent:${userId}`,
};

const INVITE_EXPIRY_DAYS = 7;

/**
 * Get all game invites for a user
 */
export async function getGameInvites(userId: string): Promise<{
  received: GameInvite[];
  sent: GameInvite[];
}> {
  try {
    const receivedKey = CACHE_PREFIX.receivedInvites(userId);
    const sentKey = CACHE_PREFIX.sentInvites(userId);
    
    const receivedIdsJson = await env.GAME_REGISTRY_KV.get(receivedKey);
    const sentIdsJson = await env.GAME_REGISTRY_KV.get(sentKey);
    
    const receivedIds: string[] = receivedIdsJson ? JSON.parse(receivedIdsJson) : [];
    const sentIds: string[] = sentIdsJson ? JSON.parse(sentIdsJson) : [];
    
    const received: GameInvite[] = [];
    const sent: GameInvite[] = [];
    
    for (const inviteId of receivedIds) {
      const inviteJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.gameInvite(inviteId));
      if (inviteJson) {
        const invite = JSON.parse(inviteJson);
        if (invite.status === 'pending' && invite.expiresAt > Date.now()) {
          received.push(invite);
        }
      }
    }
    
    for (const inviteId of sentIds) {
      const inviteJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.gameInvite(inviteId));
      if (inviteJson) {
        const invite = JSON.parse(inviteJson);
        if (invite.status === 'pending' && invite.expiresAt > Date.now()) {
          sent.push(invite);
        }
      }
    }
    
    return { received, sent };
  } catch (error) {
    console.error('Error getting game invites:', error);
    return { received: [], sent: [] };
  }
}

/**
 * Send game invite to a friend
 */
export async function sendGameInvite(
  fromUserId: string,
  toUserId: string,
  gameId: string,
  gameType: GameType,
  gameUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!fromUserId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    if (fromUserId === toUserId) {
      return { success: false, message: 'Cannot invite yourself' };
    }
    
    // Check if they're friends
    const friendsKey = `friends:${fromUserId}`;
    const friendsJson = await env.GAME_REGISTRY_KV.get(friendsKey);
    const friends: string[] = friendsJson ? JSON.parse(friendsJson) : [];
    
    if (!friends.includes(toUserId)) {
      return { success: false, message: 'You can only invite friends to games' };
    }
    
    // Check for duplicate invite
    const sentKey = CACHE_PREFIX.sentInvites(fromUserId);
    const sentJson = await env.GAME_REGISTRY_KV.get(sentKey);
    const sentInvites: string[] = sentJson ? JSON.parse(sentJson) : [];
    
    for (const inviteId of sentInvites) {
      const existingInviteJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.gameInvite(inviteId));
      if (existingInviteJson) {
        const existingInvite = JSON.parse(existingInviteJson);
        if (
          existingInvite.toUserId === toUserId && 
          existingInvite.gameId === gameId &&
          existingInvite.gameType === gameType &&
          existingInvite.status === 'pending'
        ) {
          return { success: false, message: 'Invite already sent to this user' };
        }
      }
    }
    
    // Get sender info
    const senderData = await db.user.findFirst({
      where: { id: fromUserId },
      select: { name: true, email: true, image: true },
    });
    
    // Generate pretty name from gameId
    const gameName = gameId.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
    
    // Create invite
    const inviteId = `ginv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const expiresAt = now + (INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const gameInvite: GameInvite = {
      id: inviteId,
      gameType,
      gameId,
      gameName,
      gameUrl,
      fromUserId,
      fromUserName: senderData?.name || 'Unknown',
      fromUserImage: senderData?.image || undefined,
      toUserId,
      status: 'pending',
      createdAt: now,
      expiresAt,
    };
    
    // Store invite
    await env.GAME_REGISTRY_KV.put(
      CACHE_PREFIX.gameInvite(inviteId),
      JSON.stringify(gameInvite)
    );
    
    // Update sent list
    sentInvites.push(inviteId);
    await env.GAME_REGISTRY_KV.put(sentKey, JSON.stringify(sentInvites));
    
    // Update received list
    const receivedKey = CACHE_PREFIX.receivedInvites(toUserId);
    const receivedJson = await env.GAME_REGISTRY_KV.get(receivedKey);
    const receivedInvites: string[] = receivedJson ? JSON.parse(receivedJson) : [];
    receivedInvites.push(inviteId);
    await env.GAME_REGISTRY_KV.put(receivedKey, JSON.stringify(receivedInvites));
    
    // After successfully creating invite:
    await publishEvent({
        type: 'game_invite_received',
        userId: toUserId,
        fromUserId: fromUserId,
        data: {
        gameId,
        gameName,
        gameUrl,
        gameType,
        inviteId,
        },
    });
    return { success: true, message: 'Game invite sent!' };
  } catch (error) {
    console.error('Error sending game invite:', error);
    return { success: false, message: 'Failed to send game invite' };
  }
}

/**
 * Accept a game invite
 */
export async function acceptGameInvite(
  userId: string,
  inviteId: string
): Promise<{ 
  success: boolean; 
  message: string;
  gameUrl?: string;
}> {
  try {
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    const inviteJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.gameInvite(inviteId));
    if (!inviteJson) {
      return { success: false, message: 'Invite not found' };
    }
    
    const invite: GameInvite = JSON.parse(inviteJson);
    
    if (invite.toUserId !== userId) {
      return { success: false, message: 'Not authorized to accept this invite' };
    }
    
    if (invite.expiresAt < Date.now()) {
      return { success: false, message: 'Invite has expired' };
    }
    
    // Update invite status
    invite.status = 'accepted';
    await env.GAME_REGISTRY_KV.put(
      CACHE_PREFIX.gameInvite(inviteId),
      JSON.stringify(invite)
    );

    await publishEvent({
        type: 'game_invite_accepted',
        userId: invite.fromUserId, // Notify the sender
        fromUserId: userId,
        data: {
          gameId: invite.gameId,
          gameName: invite.gameName,
          gameUrl: invite.gameUrl,
        },
    });
    
    return { 
      success: true, 
      message: 'Invite accepted! Joining game...', 
      gameUrl: invite.gameUrl
    };
  } catch (error) {
    console.error('Error accepting game invite:', error);
    return { success: false, message: 'Failed to accept invite' };
  }
}

/**
 * Decline a game invite
 */
export async function declineGameInvite(
  userId: string,
  inviteId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    const inviteJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.gameInvite(inviteId));
    if (!inviteJson) {
      return { success: false, message: 'Invite not found' };
    }
    
    const invite: GameInvite = JSON.parse(inviteJson);
    
    if (invite.toUserId !== userId) {
      return { success: false, message: 'Not authorized' };
    }
    
    invite.status = 'declined';
    await env.GAME_REGISTRY_KV.put(
      CACHE_PREFIX.gameInvite(inviteId),
      JSON.stringify(invite)
    );
    
    // Remove from received list
    const receivedKey = CACHE_PREFIX.receivedInvites(userId);
    const receivedJson = await env.GAME_REGISTRY_KV.get(receivedKey);
    const receivedInvites: string[] = receivedJson ? JSON.parse(receivedJson) : [];
    const updated = receivedInvites.filter(id => id !== inviteId);
    await env.GAME_REGISTRY_KV.put(receivedKey, JSON.stringify(updated));
    
    return { success: true, message: 'Invite declined' };
  } catch (error) {
    console.error('Error declining invite:', error);
    return { success: false, message: 'Failed to decline invite' };
  }
}