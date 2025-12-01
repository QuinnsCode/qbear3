"use client";

import { useState, useEffect } from "react";
import { getGameInvites, acceptGameInvite, declineGameInvite, type GameInvite } from "@/app/serverActions/social/gameInvites";

type GameInvitesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

export function GameInvitesModal({ isOpen, onClose, userId }: GameInvitesModalProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedInvites, setReceivedInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      loadInvites();
    }
  }, [isOpen, userId]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const invites = await getGameInvites(userId);
      setReceivedInvites(invites.received);
      setSentInvites(invites.sent);
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    try {
      const result = await acceptGameInvite(userId, inviteId);
      if (result.success && result.gameUrl) {
        window.location.href = result.gameUrl;
      } else {
        alert('Failed to accept invite');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invite');
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      const result = await declineGameInvite(userId, inviteId);
      if (result.success) {
        await loadInvites();
      } else {
        alert('Failed to decline invite');
      }
    } catch (error) {
      console.error('Error declining invite:', error);
      alert('Failed to decline invite');
    }
  };

  if (!isOpen) return null;

  const currentInvites = activeTab === 'received' ? receivedInvites : sentInvites;

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
          maxHeight: '90vh', // ✅ Viewport height
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
            flexShrink: 0, // ✅ Keep header visible
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
              🎮 Game Invites
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

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('received')}
              style={{
                flex: 1,
                padding: '10px',
                background: activeTab === 'received' ? 'rgba(146, 64, 14, 0.3)' : 'rgba(146, 64, 14, 0.1)',
                border: '2px solid rgba(146, 64, 14, 0.4)',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Received ({receivedInvites.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              style={{
                flex: 1,
                padding: '10px',
                background: activeTab === 'sent' ? 'rgba(146, 64, 14, 0.3)' : 'rgba(146, 64, 14, 0.1)',
                border: '2px solid rgba(146, 64, 14, 0.4)',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Sent ({sentInvites.length})
            </button>
          </div>
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
          ) : currentInvites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                No {activeTab === 'received' ? 'invites received' : 'invites sent'}
              </div>
              <div style={{ fontSize: '14px' }}>
                {activeTab === 'received' 
                  ? 'When friends invite you to games, they\'ll appear here' 
                  : 'Invite friends to play games together!'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentInvites.map((invite) => (
                <div
                  key={invite.id}
                  style={{
                    padding: '16px',
                    background: 'rgba(251, 191, 36, 0.15)',
                    border: '2px solid rgba(180, 83, 9, 0.4)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', marginBottom: '12px' }}>
                    {invite.fromUserImage ? (
                      <img
                        src={invite.fromUserImage}
                        alt={invite.fromUserName}
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
                        {invite.gameName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#a16207', marginBottom: '4px' }}>
                        {activeTab === 'received' ? 'From' : 'To'}: {invite.fromUserName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a16207' }}>
                        {new Date(invite.createdAt).toLocaleDateString()} • {invite.gameType === 'main' ? 'Strategy Game' : 'Card Game'}
                      </div>
                    </div>
                  </div>

                  {activeTab === 'received' && invite.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAccept(invite.id)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          border: '2px solid rgba(34, 197, 94, 0.4)',
                          borderRadius: '8px',
                          color: '#16a34a',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Join Game
                      </button>
                      <button
                        onClick={() => handleDecline(invite.id)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: 'rgba(220, 38, 38, 0.2)',
                          border: '2px solid rgba(220, 38, 38, 0.4)',
                          borderRadius: '8px',
                          color: '#dc2626',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {invite.status !== 'pending' && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: invite.status === 'accepted' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        border: `1px solid ${invite.status === 'accepted' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: invite.status === 'accepted' ? '#16a34a' : '#dc2626',
                        textAlign: 'center',
                      }}
                    >
                      {invite.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}