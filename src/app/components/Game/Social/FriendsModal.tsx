"use client";

import { useState, useEffect } from "react";
import { 
  getFriends, 
  getFriendRequests, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  removeFriend,
  type Friend,
  type FriendRequest
} from "@/app/serverActions/social/friends";

type FriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

export function FriendsModal({ isOpen, onClose, userId }: FriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const friendsData = await getFriends(userId);
      setFriends(friendsData);

      const requestsData = await getFriendRequests(userId);
      setIncomingRequests(requestsData.incoming);
      setOutgoingRequests(requestsData.outgoing);
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const result = await acceptFriendRequest(userId, requestId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const result = await rejectFriendRequest(userId, requestId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }
    
    try {
      const result = await removeFriend(userId, friendId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        overflowY: 'auto', // ✅ Allow backdrop to scroll
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #f4e4bc 0%, #e8d5a8 50%, #dcc794 100%)',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh', // ✅ Changed to 90vh
          display: 'flex', // ✅ Flexbox
          flexDirection: 'column', // ✅ Column layout
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '4px solid #3c2415',
          position: 'relative',
          margin: 'auto', // ✅ Center in scrollable backdrop
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid rgba(146, 64, 14, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0, // ✅ Keep header visible
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
            👥 Friends
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(146, 64, 14, 0.2)',
              border: '2px solid rgba(146, 64, 14, 0.4)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#92400e',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs - Fixed */}
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid rgba(146, 64, 14, 0.3)',
            background: 'rgba(139, 69, 19, 0.05)',
            flexShrink: 0, // ✅ Keep tabs visible
          }}
        >
          <button
            onClick={() => setActiveTab('friends')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'friends' ? 'rgba(146, 64, 14, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'friends' ? '3px solid #92400e' : '3px solid transparent',
              color: '#92400e',
              fontWeight: activeTab === 'friends' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'incoming' ? 'rgba(146, 64, 14, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'incoming' ? '3px solid #92400e' : '3px solid transparent',
              color: '#92400e',
              fontWeight: activeTab === 'incoming' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Requests ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'outgoing' ? 'rgba(146, 64, 14, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'outgoing' ? '3px solid #92400e' : '3px solid transparent',
              color: '#92400e',
              fontWeight: activeTab === 'outgoing' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Sent ({outgoingRequests.length})
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          style={{ 
            flex: 1, // ✅ Take remaining space
            overflowY: 'auto', // ✅ Scroll only this section
            padding: '24px',
            minHeight: 0, // ✅ Important for flex scrolling
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Friends Tab */}
              {activeTab === 'friends' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {friends.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                        No friends yet
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Start adding friends to see them here!
                      </div>
                    </div>
                  ) : (
                    friends?.map((friend) => (
                      <div
                        key={friend.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '2px solid rgba(180, 83, 9, 0.4)',
                          borderRadius: '8px',
                        }}
                      >
                        {friend.friendImage ? (
                          <img
                            src={friend.friendImage}
                            alt={friend.friendName}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              marginRight: '16px',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: 'rgba(146, 64, 14, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '16px',
                              fontSize: '24px',
                            }}
                          >
                            👤
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                            {friend.friendName}
                          </div>
                          <div style={{ fontSize: '14px', color: '#a16207' }}>
                            {friend.friendEmail}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.friendId)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            borderRadius: '4px',
                            color: '#dc2626',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Incoming Requests Tab */}
              {activeTab === 'incoming' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {incomingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                        No pending requests
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Friend requests will appear here
                      </div>
                    </div>
                  ) : (
                    incomingRequests?.map((request) => (
                      <div
                        key={request.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '2px solid rgba(180, 83, 9, 0.4)',
                          borderRadius: '8px',
                        }}
                      >
                        {request.senderImage ? (
                          <img
                            src={request.senderImage}
                            alt={request.senderName}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              marginRight: '16px',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: 'rgba(146, 64, 14, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '16px',
                              fontSize: '24px',
                            }}
                          >
                            👤
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                            {request.senderName}
                          </div>
                          <div style={{ fontSize: '14px', color: '#a16207' }}>
                            {request.senderEmail}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              borderRadius: '4px',
                              color: '#16a34a',
                              fontSize: '14px',
                              cursor: 'pointer',
                              fontWeight: '500',
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(220, 38, 38, 0.1)',
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                              borderRadius: '4px',
                              color: '#dc2626',
                              fontSize: '14px',
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Outgoing Requests Tab */}
              {activeTab === 'outgoing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {outgoingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                        No sent requests
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Requests you send will appear here
                      </div>
                    </div>
                  ) : (
                    outgoingRequests?.map((request) => (
                      <div
                        key={request.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '2px solid rgba(180, 83, 9, 0.4)',
                          borderRadius: '8px',
                          opacity: 0.7,
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(146, 64, 14, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '16px',
                            fontSize: '24px',
                          }}
                        >
                          ⏳
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                            Request Pending
                          </div>
                          <div style={{ fontSize: '14px', color: '#a16207' }}>
                            Waiting for response...
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}