"use client";

import { useState } from "react";

type ShareGameLinkProps = {
  gameUrl: string; // Full URL like: https://alice.yourdomain.com/game/alive-purple-goat
};

export function ShareGameLink({ gameUrl }: ShareGameLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy link');
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        background: 'rgba(251, 191, 36, 0.15)',
        border: '2px solid rgba(180, 83, 9, 0.4)',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>
        🔗 Share Game Link
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={gameUrl}
          readOnly
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '2px solid rgba(146, 64, 14, 0.3)',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#92400e',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 16px',
            background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(146, 64, 14, 0.2)',
            border: '2px solid rgba(146, 64, 14, 0.4)',
            borderRadius: '4px',
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}