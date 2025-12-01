//src/app/serverActions/social/friends.ts
"use server";

import { db } from "@/db";
import { env } from "cloudflare:workers";
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

// Cache keys helpers
const CACHE_PREFIX = {
  friends: (userId: string) => `friends:${userId}`,
  friendRequests: (requestId: string) => `friend_request:${requestId}`,
  incomingRequests: (userId: string) => `incoming_requests:${userId}`,
  outgoingRequests: (userId: string) => `outgoing_requests:${userId}`,
};

/**
 * Get user's friends list
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    const cacheKey = CACHE_PREFIX.friends(userId);
    
    // Get friend IDs from cache/storage
    const friendIdsJson = await env.GAME_REGISTRY_KV.get(cacheKey);
    const friendIds: string[] = friendIdsJson ? JSON.parse(friendIdsJson) : [];
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Fetch friend user data
    const friends: Friend[] = [];
    for (const friendId of friendIds) {
      const friendData = await db.user.findFirst({
        where: {
          id: friendId
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
      
      if (friendData) {
        friends.push({
          id: `${userId}-${friendId}`,
          userId,
          friendId: friendData.id,
          friendName: friendData.name || 'Unknown',
          friendEmail: friendData.email || '',
          friendImage: friendData.image || undefined,
          createdAt: Date.now(),
        });
      }
    }
    
    return friends;
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
    const incomingKey = CACHE_PREFIX.incomingRequests(userId);
    const outgoingKey = CACHE_PREFIX.outgoingRequests(userId);
    
    // Get request IDs
    const incomingIdsJson = await env.GAME_REGISTRY_KV.get(incomingKey);
    const outgoingIdsJson = await env.GAME_REGISTRY_KV.get(outgoingKey);
    
    const incomingIds: string[] = incomingIdsJson ? JSON.parse(incomingIdsJson) : [];
    const outgoingIds: string[] = outgoingIdsJson ? JSON.parse(outgoingIdsJson) : [];
    
    // Fetch full request data
    const incoming: FriendRequest[] = [];
    const outgoing: FriendRequest[] = [];
    
    for (const requestId of incomingIds) {
      const requestJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.friendRequests(requestId));
      if (requestJson) {
        const request = JSON.parse(requestJson);
        if (request.status === 'pending') {
          incoming.push(request);
        }
      }
    }
    
    for (const requestId of outgoingIds) {
      const requestJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.friendRequests(requestId));
      if (requestJson) {
        const request = JSON.parse(requestJson);
        if (request.status === 'pending') {
          outgoing.push(request);
        }
      }
    }
    
    return { incoming, outgoing };
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
    
    // Can't friend yourself
    if (fromUserId === toUserId) {
      return { success: false, message: 'Cannot send friend request to yourself' };
    }
    
    // Check if already friends
    const friendsKey = CACHE_PREFIX.friends(fromUserId);
    const friendsJson = await env.GAME_REGISTRY_KV.get(friendsKey);
    const friends: string[] = friendsJson ? JSON.parse(friendsJson) : [];
    
    if (friends.includes(toUserId)) {
      return { success: false, message: 'Already friends with this user' };
    }
    
    // Check if request already exists
    const outgoingKey = CACHE_PREFIX.outgoingRequests(fromUserId);
    const outgoingJson = await env.GAME_REGISTRY_KV.get(outgoingKey);
    const outgoingRequests: string[] = outgoingJson ? JSON.parse(outgoingJson) : [];
    
    // Check for existing pending request
    for (const requestId of outgoingRequests) {
      const existingRequestJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.friendRequests(requestId));
      if (existingRequestJson) {
        const existingRequest = JSON.parse(existingRequestJson);
        if (existingRequest.receiverId === toUserId && existingRequest.status === 'pending') {
          return { success: false, message: 'Friend request already sent' };
        }
      }
    }
    
    // Get sender info
    const senderData = await db.user.findFirst({
      where: {
        id: fromUserId
      },
      select: {
        name: true,
        email: true,
        image: true,
      },
    });
    
    // Create request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const friendRequest: FriendRequest = {
      id: requestId,
      senderId: fromUserId,
      senderName: senderData?.name || 'Unknown',
      senderEmail: senderData?.email || '',
      senderImage: senderData?.image || undefined,
      receiverId: toUserId,
      status: 'pending',
      createdAt: Date.now(),
    };
    
    // Store request
    await env.GAME_REGISTRY_KV.put(
      CACHE_PREFIX.friendRequests(requestId),
      JSON.stringify(friendRequest)
    );
    
    // Update outgoing list for sender
    outgoingRequests.push(requestId);
    await env.GAME_REGISTRY_KV.put(outgoingKey, JSON.stringify(outgoingRequests));
    
    // Update incoming list for receiver
    const incomingKey = CACHE_PREFIX.incomingRequests(toUserId);
    const incomingJson = await env.GAME_REGISTRY_KV.get(incomingKey);
    const incomingRequests: string[] = incomingJson ? JSON.parse(incomingJson) : [];
    incomingRequests.push(requestId);
    await env.GAME_REGISTRY_KV.put(incomingKey, JSON.stringify(incomingRequests));
    
    await publishEvent({
      type: 'friend_request_received',
      userId: toUserId,
      fromUserId: fromUserId,
      data: {
        requestId,
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
    
    // Get request data
    const requestJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.friendRequests(requestId));
    if (!requestJson) {
      return { success: false, message: 'Friend request not found' };
    }
    
    const friendRequest: FriendRequest = JSON.parse(requestJson);
    
    // Verify this user is the receiver
    if (friendRequest.receiverId !== userId) {
      return { success: false, message: 'Not authorized to accept this request' };
    }
    
    // Update request status
    friendRequest.status = 'accepted';
    await env.GAME_REGISTRY_KV.put(
      CACHE_PREFIX.friendRequests(requestId),
      JSON.stringify(friendRequest)
    );
    
    // Add to both users' friends lists
    const receiverFriendsKey = CACHE_PREFIX.friends(friendRequest.receiverId);
    const senderFriendsKey = CACHE_PREFIX.friends(friendRequest.senderId);
    
    // Receiver's friends
    const receiverFriendsJson = await env.GAME_REGISTRY_KV.get(receiverFriendsKey);
    const receiverFriends: string[] = receiverFriendsJson ? JSON.parse(receiverFriendsJson) : [];
    if (!receiverFriends.includes(friendRequest.senderId)) {
      receiverFriends.push(friendRequest.senderId);
      await env.GAME_REGISTRY_KV.put(receiverFriendsKey, JSON.stringify(receiverFriends));
    }
    
    // Sender's friends
    const senderFriendsJson = await env.GAME_REGISTRY_KV.get(senderFriendsKey);
    const senderFriends: string[] = senderFriendsJson ? JSON.parse(senderFriendsJson) : [];
    if (!senderFriends.includes(friendRequest.receiverId)) {
      senderFriends.push(friendRequest.receiverId);
      await env.GAME_REGISTRY_KV.put(senderFriendsKey, JSON.stringify(senderFriends));
    }
    
    // Remove from incoming requests
    const incomingKey = CACHE_PREFIX.incomingRequests(userId);
    const incomingJson = await env.GAME_REGISTRY_KV.get(incomingKey);
    const incomingRequests: string[] = incomingJson ? JSON.parse(incomingJson) : [];
    const updatedIncoming = incomingRequests.filter(id => id !== requestId);
    await env.GAME_REGISTRY_KV.put(incomingKey, JSON.stringify(updatedIncoming));
    
    // ✅ NEW: Notify the sender that their request was accepted
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
    
    // Get request data
    const requestJson = await env.GAME_REGISTRY_KV.get(CACHE_PREFIX.friendRequests(requestId));
    if (!requestJson) {
      return { success: false, message: 'Friend request not found' };
    }
    
    const friendRequest: FriendRequest = JSON.parse(requestJson);
    
    // Verify this user is the receiver
    if (friendRequest.receiverId !== userId) {
      return { success: false, message: 'Not authorized to reject this request' };
    }
    
    // Update request status
    friendRequest.status = 'rejected';
    await env.GAME_REGISTRY_KV.put(
      CACHE_PREFIX.friendRequests(requestId),
      JSON.stringify(friendRequest)
    );
    
    // Remove from incoming requests
    const incomingKey = CACHE_PREFIX.incomingRequests(userId);
    const incomingJson = await env.GAME_REGISTRY_KV.get(incomingKey);
    const incomingRequests: string[] = incomingJson ? JSON.parse(incomingJson) : [];
    const updatedIncoming = incomingRequests.filter(id => id !== requestId);
    await env.GAME_REGISTRY_KV.put(incomingKey, JSON.stringify(updatedIncoming));
    
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
    
    // Remove from user's friends list
    const userFriendsKey = CACHE_PREFIX.friends(userId);
    const userFriendsJson = await env.GAME_REGISTRY_KV.get(userFriendsKey);
    const userFriends: string[] = userFriendsJson ? JSON.parse(userFriendsJson) : [];
    const updatedUserFriends = userFriends.filter(id => id !== friendId);
    await env.GAME_REGISTRY_KV.put(userFriendsKey, JSON.stringify(updatedUserFriends));
    
    // Remove from friend's friends list
    const friendFriendsKey = CACHE_PREFIX.friends(friendId);
    const friendFriendsJson = await env.GAME_REGISTRY_KV.get(friendFriendsKey);
    const friendFriends: string[] = friendFriendsJson ? JSON.parse(friendFriendsJson) : [];
    const updatedFriendFriends = friendFriends.filter(id => id !== userId);
    await env.GAME_REGISTRY_KV.put(friendFriendsKey, JSON.stringify(updatedFriendFriends));
    
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
  query: string
): Promise<Array<{
  id: string;
  name: string;
  email: string;
  image?: string;
}>> {
  try {
    if (!query || query.length < 2) {
      return [];
    }
    
    const searchQuery = query.toLowerCase();
    
    // Search in database
    const users = await db.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchQuery,
              // Remove mode: 'insensitive'
            }
          },
          {
            email: {
              contains: searchQuery,
              // Remove mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: 10,
    });
    
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