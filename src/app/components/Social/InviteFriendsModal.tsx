"use client";

import { useState, useEffect } from "react";
import { getFriends, type Friend } from "@/app/serverActions/social/friends";
import { sendGameInvite, type GameType } from "@/app/serverActions/social/gameInvites";

type InviteFriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  gameId: string;
  gameType: GameType;
  gameName: string;
  gameUrl: string;
};

export function InviteFriendsModal({ 
  isOpen, 
  onClose, 
  userId, 
  gameId, 
  gameType,
  gameName,
  gameUrl 
}: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && userId) {
      loadFriends();
    }
  }, [isOpen, userId]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsData = await getFriends(userId);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (friendId: string) => {
    try {
      const result = await sendGameInvite(userId, friendId, gameId, gameType, gameUrl);
      if (result.success) {
        setInvitedFriends(prev => new Set(prev).add(friendId));
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invite');
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
        overflowY: 'auto', // ✅ Allow backdrop to scroll if needed
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #f4e4bc 0%, #e8d5a8 50%, #dcc794 100%)',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh', // ✅ Changed from 80vh to 90vh and added to outer container
          display: 'flex',
          flexDirection: 'column', // ✅ Make it flex column
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '4px solid #3c2415',
          position: 'relative', // ✅ Changed from implicit to explicit
          margin: 'auto', // ✅ Center in scrollable backdrop if tall
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
            flexShrink: 0, // ✅ Prevent header from shrinking
          }}
        >
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
              📨 Invite Friends
            </h2>
            <p style={{ fontSize: '14px', color: '#a16207', margin: '4px 0 0 0' }}>
              {gameName}
            </p>
          </div>
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

        {/* Friends List - Scrollable */}
        <div 
          style={{ 
            flex: 1, // ✅ Take remaining space
            overflowY: 'auto', // ✅ Scroll only this section
            padding: '24px',
            minHeight: 0, // ✅ Important for flex child to scroll properly
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
              Loading...
            </div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                No friends yet
              </div>
              <div style={{ fontSize: '14px' }}>
                Add friends to invite them to games!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {friends.map((friend) => {
                const alreadyInvited = invitedFriends.has(friend.friendId);
                
                return (
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
                      onClick={() => handleInvite(friend.friendId)}
                      disabled={alreadyInvited}
                      style={{
                        padding: '8px 16px',
                        background: alreadyInvited 
                          ? 'rgba(146, 64, 14, 0.1)' 
                          : 'rgba(146, 64, 14, 0.2)',
                        border: '2px solid rgba(146, 64, 14, 0.4)',
                        borderRadius: '8px',
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: alreadyInvited ? 'not-allowed' : 'pointer',
                        opacity: alreadyInvited ? 0.6 : 1,
                      }}
                    >
                      {alreadyInvited ? '✓ Invited' : 'Invite'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}