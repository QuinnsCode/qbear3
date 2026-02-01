"use client";

import { useState, useEffect } from "react";
import { 
  getGameInvites, 
  acceptGameInvite, 
  declineGameInvite,
  type GameInvite 
} from "@/app/serverActions/social/gameInvites";
import { Gamepad2 } from "lucide-react";

type GameInvitesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

export function GameInvitesModal({ isOpen, onClose, userId }: GameInvitesModalProps) {
  const [receivedInvites, setReceivedInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      loadInvites();
    }
  }, [isOpen, userId]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { received, sent } = await getGameInvites(userId);
      setReceivedInvites(received);
      setSentInvites(sent);
    } catch (error) {
      console.error('Error loading game invites:', error);
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
        alert(result.message);
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
          await loadInvites(); // Reload
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error('Error declining invite:', error);
        alert('Failed to decline invite');
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
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #f4e4bc 0%, #e8d5a8 50%, #dcc794 100%)',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '4px solid #3c2415',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid rgba(146, 64, 14, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
            <Gamepad2/> Game Invites
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
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid rgba(146, 64, 14, 0.3)',
            background: 'rgba(139, 69, 19, 0.05)',
          }}
        >
          <button
            onClick={() => setActiveTab('received')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'received' ? 'rgba(146, 64, 14, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'received' ? '3px solid #92400e' : '3px solid transparent',
              color: '#92400e',
              fontWeight: activeTab === 'received' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Received ({receivedInvites.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'sent' ? 'rgba(146, 64, 14, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sent' ? '3px solid #92400e' : '3px solid transparent',
              color: '#92400e',
              fontWeight: activeTab === 'sent' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Sent ({sentInvites.length})
          </button>
        </div>

        {/* Content */}
        <div style={{ maxHeight: 'calc(80vh - 200px)', overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Received Tab */}
              {activeTab === 'received' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {receivedInvites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
                      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                        <Gamepad2 size={48} strokeWidth={1.5} />
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                        No game invites
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Friends can invite you to join their games
                      </div>
                    </div>
                  ) : (
                    receivedInvites.map((invite) => (
                      <div
                        key={invite.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '2px solid rgba(180, 83, 9, 0.4)',
                          borderRadius: '8px',
                        }}
                      >
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
                            }}
                          >
                            <Gamepad2 size={24} />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                            {invite.fromUserName} invited you
                          </div>
                          <div style={{ fontSize: '14px', color: '#a16207', marginBottom: '4px' }}>
                            {invite.gameName} ({invite.gameType === 'card' ? 'Card Game' : 'Strategy Game'})
                          </div>
                          <div style={{ fontSize: '12px', color: '#a16207' }}>
                            Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAccept(invite.id)}
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
                            Join
                          </button>
                          <button
                            onClick={() => handleDecline(invite.id)}
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
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sent Tab */}
              {activeTab === 'sent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sentInvites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                        No sent invites
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Invite friends to join your games
                      </div>
                    </div>
                  ) : (
                    sentInvites.map((invite) => (
                      <div
                        key={invite.id}
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
                            {invite.gameName}
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