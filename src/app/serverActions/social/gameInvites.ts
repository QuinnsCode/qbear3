'use server'

import { db } from "@/db";
import { publishEvent } from "@/app/serverActions/events/publishEvent";

// Types
export type GameType = 'main' | 'card';

export type GameInvite = {
  id: string;
  gameType: GameType;
  gameId: string;
  gameName: string;
  gameUrl: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  expiresAt: number;
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
    const now = new Date();
    
    const [received, sent] = await Promise.all([
      db.gameInvite.findMany({
        where: {
          toUserId: userId,
          status: 'pending',
          expiresAt: {
            gte: now
          }
        },
        include: {
          fromUser: {
            select: {
              name: true,
              image: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      db.gameInvite.findMany({
        where: {
          fromUserId: userId,
          status: 'pending',
          expiresAt: {
            gte: now
          }
        },
        include: {
          toUser: {
            select: {
              name: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);
    
    return {
      received: received.map(inv => ({
        id: inv.id,
        gameType: inv.gameType as GameType,
        gameId: inv.gameId,
        gameName: inv.gameName,
        gameUrl: inv.gameUrl,
        fromUserId: inv.fromUserId,
        fromUserName: inv.fromUser.name || 'Unknown',
        fromUserImage: inv.fromUser.image || undefined,
        toUserId: inv.toUserId,
        status: inv.status as 'pending',
        createdAt: inv.createdAt.getTime(),
        expiresAt: inv.expiresAt.getTime(),
      })),
      sent: sent.map(inv => ({
        id: inv.id,
        gameType: inv.gameType as GameType,
        gameId: inv.gameId,
        gameName: inv.gameName,
        gameUrl: inv.gameUrl,
        fromUserId: inv.fromUserId,
        fromUserName: 'You',
        toUserId: inv.toUserId,
        status: inv.status as 'pending',
        createdAt: inv.createdAt.getTime(),
        expiresAt: inv.expiresAt.getTime(),
      }))
    };
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
    const friendship = await db.friendship.findFirst({
      where: {
        userId: fromUserId,
        friendId: toUserId
      }
    });
    
    if (!friendship) {
      return { success: false, message: 'You can only invite friends to games' };
    }
    
    // Check for duplicate invite
    const existingInvite = await db.gameInvite.findFirst({
      where: {
        fromUserId,
        toUserId,
        gameId,
        gameType,
        status: 'pending',
        expiresAt: {
          gte: new Date()
        }
      }
    });
    
    if (existingInvite) {
      return { success: false, message: 'Invite already sent to this user' };
    }
    
    // Generate pretty name from gameId
    const gameName = gameId.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    
    const gameInvite = await db.gameInvite.create({
      data: {
        gameType,
        gameId,
        gameName,
        gameUrl,
        fromUserId,
        toUserId,
        status: 'pending',
        expiresAt,
      }
    });
    
    await publishEvent({
      type: 'game_invite_received',
      userId: toUserId,
      fromUserId: fromUserId,
      data: {
        gameId,
        gameName,
        gameUrl,
        gameType,
        inviteId: gameInvite.id,
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
    
    const invite = await db.gameInvite.findUnique({
      where: { id: inviteId }
    });
    
    if (!invite) {
      return { success: false, message: 'Invite not found' };
    }
    
    if (invite.toUserId !== userId) {
      return { success: false, message: 'Not authorized to accept this invite' };
    }
    
    if (invite.expiresAt < new Date()) {
      await db.gameInvite.update({
        where: { id: inviteId },
        data: { status: 'expired' }
      });
      return { success: false, message: 'Invite has expired' };
    }
    
    await db.gameInvite.update({
      where: { id: inviteId },
      data: { status: 'accepted' }
    });

    await publishEvent({
      type: 'game_invite_accepted',
      userId: invite.fromUserId,
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
    
    const invite = await db.gameInvite.findUnique({
      where: { id: inviteId }
    });
    
    if (!invite) {
      return { success: false, message: 'Invite not found' };
    }
    
    if (invite.toUserId !== userId) {
      return { success: false, message: 'Not authorized' };
    }
    
    await db.gameInvite.update({
      where: { id: inviteId },
      data: { status: 'declined' }
    });
    
    return { success: true, message: 'Invite declined' };
  } catch (error) {
    console.error('Error declining invite:', error);
    return { success: false, message: 'Failed to decline invite' };
  }
}

/**
 * Cleanup expired invites (run periodically)
 */
export async function cleanupExpiredInvites(): Promise<void> {
  try {
    await db.gameInvite.updateMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: 'expired'
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired invites:', error);
  }
}