"use client";

import { useState } from "react";
import { InviteFriendsModal } from "../Social/InviteFriendsModal";

type GameSocialPanelProps = {
  userId: string;
  cardGameId?: string;
  gameId?: string;
  gameName: string;
  gameType?: 'card' | 'main';
};

export function GameSocialPanel({ 
  userId, 
  cardGameId, 
  gameId,
  gameName,
  gameType 
}: GameSocialPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const gameUrl = typeof window !== 'undefined' ? window.location.href : '';
  const actualGameType: 'card' | 'main' = gameType || (cardGameId ? 'card' : 'main');
  const actualGameId = cardGameId || gameId || '';

  if (!gameUrl || !actualGameId) return null;

  const handleCopyGameName = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <>
      {/* Sticky Header Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)',
          borderBottom: '2px solid #334155',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          // ✅ Prevent touch highlighting
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            color: '#e2e8f0',
            fontSize: '14px',
            fontWeight: '600',
            // ✅ Mobile touch improvements
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎮</span>
            <span>{gameName}</span>
          </div>
          <span style={{ 
            fontSize: '20px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}>
            ▼
          </span>
        </button>

        {/* Drawer Content */}
        {isOpen && (
          <div
            style={{
              padding: '16px',
              background: '#1e293b',
              borderTop: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Copy Game Link */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopyGameName}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleCopyGameName();
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px', // ✅ Larger touch target
                  background: copied ? '#059669' : '#475569',
                  border: '1px solid #64748b',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  // ✅ Mobile touch improvements
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                  minHeight: '44px', // ✅ iOS minimum touch target
                }}
              >
                <span>{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'Copied!' : 'Copy Game Link'}</span>
              </button>
            </div>

            {/* Invite Friends */}
            <button
              onClick={() => setShowInviteModal(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setShowInviteModal(true);
              }}
              style={{
                padding: '12px 16px', // ✅ Larger touch target
                background: '#475569',
                border: '1px solid #64748b',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                // ✅ Mobile touch improvements
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                minHeight: '44px', // ✅ iOS minimum touch target
              }}
            >
              <span>📨</span>
              <span>Invite Friends</span>
            </button>

            {/* Close Drawer Button */}
            <button
              onClick={() => setIsOpen(false)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
              style={{
                padding: '10px', // ✅ Larger touch target
                background: 'transparent',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                // ✅ Mobile touch improvements
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                minHeight: '44px', // ✅ iOS minimum touch target
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userId={userId}
        gameId={actualGameId}
        gameType={actualGameType}
        gameName={gameName}
        gameUrl={gameUrl}
      />
    </>
  );
}