"use server";

import { db } from "@/db";
import { publishEvent } from "@/app/serverActions/events/publishEvent";

// Types
export type FriendRequest = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderImage?: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
};

export type Friend = {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendImage?: string;
  createdAt: number;
};

/**
 * Get user's friends list
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    const friendships = await db.friendship.findMany({
      where: {
        userId: userId
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    });
    
    return friendships.map(f => ({
      id: f.id,
      userId: f.userId,
      friendId: f.friendId,
      friendName: f.friend.name || 'Unknown',
      friendEmail: f.friend.email || '',
      friendImage: f.friend.image || undefined,
      createdAt: f.createdAt.getTime(),
    }));
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
}

/**
 * Get pending friend requests for a user
 */
export async function getFriendRequests(userId: string): Promise<{
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  try {
    const [incoming, outgoing] = await Promise.all([
      // Incoming requests
      db.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: 'pending'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // Outgoing requests
      db.friendRequest.findMany({
        where: {
          senderId: userId,
          status: 'pending'
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);
    
    return {
      incoming: incoming.map(req => ({
        id: req.id,
        senderId: req.senderId,
        senderName: req.sender.name || 'Unknown',
        senderEmail: req.sender.email || '',
        senderImage: req.sender.image || undefined,
        receiverId: req.receiverId,
        status: req.status as 'pending',
        createdAt: req.createdAt.getTime(),
      })),
      outgoing: outgoing.map(req => ({
        id: req.id,
        senderId: req.senderId,
        senderName: 'You',
        senderEmail: '',
        receiverId: req.receiverId,
        status: req.status as 'pending',
        createdAt: req.createdAt.getTime(),
      }))
    };
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return { incoming: [], outgoing: [] };
  }
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!fromUserId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    if (fromUserId === toUserId) {
      return { success: false, message: 'Cannot send friend request to yourself' };
    }
    
    // Check if already friends
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: fromUserId, friendId: toUserId },
          { userId: toUserId, friendId: fromUserId }
        ]
      }
    });
    
    if (existingFriendship) {
      return { success: false, message: 'Already friends with this user' };
    }
    
    // Check if request already exists
    const existingRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: fromUserId, receiverId: toUserId, status: 'pending' },
          { senderId: toUserId, receiverId: fromUserId, status: 'pending' }
        ]
      }
    });
    
    if (existingRequest) {
      if (existingRequest.senderId === fromUserId) {
        return { success: false, message: 'Friend request already sent' };
      } else {
        return { success: false, message: 'This user has already sent you a friend request' };
      }
    }
    
    // Create friend request
    const friendRequest = await db.friendRequest.create({
      data: {
        senderId: fromUserId,
        receiverId: toUserId,
        status: 'pending'
      }
    });
    
    // Publish event
    await publishEvent({
      type: 'friend_request_received',
      userId: toUserId,
      fromUserId: fromUserId,
      data: {
        requestId: friendRequest.id,
      },
    });

    return { success: true, message: 'Friend request sent!' };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, message: 'Failed to send friend request' };
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    // Get the request
    const friendRequest = await db.friendRequest.findUnique({
      where: { id: requestId }
    });
    
    if (!friendRequest) {
      return { success: false, message: 'Friend request not found' };
    }
    
    if (friendRequest.receiverId !== userId) {
      return { success: false, message: 'Not authorized to accept this request' };
    }
    
    if (friendRequest.status !== 'pending') {
      return { success: false, message: 'Friend request already processed' };
    }
    
    // Use a transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Update request status
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' }
      });
      
      // Create bidirectional friendship
      await tx.friendship.createMany({
        data: [
          {
            userId: friendRequest.senderId,
            friendId: friendRequest.receiverId,
          },
          {
            userId: friendRequest.receiverId,
            friendId: friendRequest.senderId,
          }
        ]
      });
    });
    
    // Notify sender
    await publishEvent({
      type: 'friend_request_accepted',
      userId: friendRequest.senderId,
      fromUserId: userId,
      data: {
        requestId,
      },
    });

    return { success: true, message: 'Friend request accepted!' };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, message: 'Failed to accept friend request' };
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    const friendRequest = await db.friendRequest.findUnique({
      where: { id: requestId }
    });
    
    if (!friendRequest) {
      return { success: false, message: 'Friend request not found' };
    }
    
    if (friendRequest.receiverId !== userId) {
      return { success: false, message: 'Not authorized to reject this request' };
    }
    
    await db.friendRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' }
    });
    
    return { success: true, message: 'Friend request rejected' };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false, message: 'Failed to reject friend request' };
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }
    
    // Delete both sides of the friendship
    await db.friendship.deleteMany({
      where: {
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });
    
    return { success: true, message: 'Friend removed' };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, message: 'Failed to remove friend' };
  }
}

/**
 * Search for users by name or email
 */
export async function searchUsers(
  query: string,
  currentUserId?: string
): Promise<Array<{
  id: string;
  name: string;
  email: string;
  image?: string;
  isFriend?: boolean;
  hasPendingRequest?: boolean;
}>> {
  try {
    if (!query || query.length < 2) {
      return [];
    }
    
    const searchQuery = query.toLowerCase();
    
    const users = await db.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchQuery,
            }
          },
          {
            email: {
              contains: searchQuery,
            }
          }
        ],
        // Don't show current user in search
        ...(currentUserId ? { id: { not: currentUserId } } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: 10,
    });
    
    // If we have a current user, check friendship status
    if (currentUserId) {
      const [friendships, requests] = await Promise.all([
        db.friendship.findMany({
          where: {
            userId: currentUserId,
            friendId: { in: users.map(u => u.id) }
          },
          select: { friendId: true }
        }),
        db.friendRequest.findMany({
          where: {
            OR: [
              {
                senderId: currentUserId,
                receiverId: { in: users.map(u => u.id) },
                status: 'pending'
              },
              {
                senderId: { in: users.map(u => u.id) },
                receiverId: currentUserId,
                status: 'pending'
              }
            ]
          },
          select: { senderId: true, receiverId: true }
        })
      ]);
      
      const friendIds = new Set(friendships.map(f => f.friendId));
      const pendingRequestIds = new Set(
        requests.map(r => r.senderId === currentUserId ? r.receiverId : r.senderId)
      );
      
      return users.map(user => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
        image: user.image || undefined,
        isFriend: friendIds.has(user.id),
        hasPendingRequest: pendingRequestIds.has(user.id),
      }));
    }
    
    return users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      image: user.image || undefined,
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId: string, friendId: string): Promise<boolean> {
  try {
    const friendship = await db.friendship.findFirst({
      where: {
        userId: userId,
        friendId: friendId
      }
    });
    
    return !!friendship;
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
}