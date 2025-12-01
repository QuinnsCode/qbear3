// @/app/components/game/SanctumDeleteGameButton.tsx
"use client";

import { useState } from "react";

interface SanctumDeleteGameButtonProps {
  gameId: string;
  gameName: string;
  orgSlug: string;
}

export function SanctumDeleteGameButton({ gameId, gameName, orgSlug }: SanctumDeleteGameButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Destroy ${gameName}? This cannot be undone. All players will be kicked.`)) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const { deleteGameCompletely } = await import('@/app/serverActions/gameRegistry');
      const result = await deleteGameCompletely(orgSlug, gameId);
      
      if (result.success) {
        window.location.reload();
      } else {
        alert(`Failed to destroy game: ${result.error}`);
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to destroy game');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      style={{
        color: '#dc2626',
        fontWeight: '500',
        padding: '6px 12px',
        background: 'rgba(220, 38, 38, 0.1)',
        borderRadius: '4px',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        opacity: isDeleting ? 0.5 : 1,
        fontSize: '14px'
      }}
    >
      {isDeleting ? '🔥 Destroying...' : '🗑️ Destroy'}
    </button>
  );
}