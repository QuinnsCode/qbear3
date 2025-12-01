"use client";

import { useState } from "react";
import { FriendsModal } from "@/app/components/Game/Social/FriendsModal";
import { AddFriendModal } from "@/app/components/Game/Social/AddFriendModal";
import { GameInvitesModal } from "../Social/GameInvitesModal";

type SanctumClientActionsProps = {
  userId: string;
  mainActions: Array<{
    id: string;
    label: string;
    action: string;
    icon: string;
  }>;
};

export function SanctumClientActions({ userId, mainActions }: SanctumClientActionsProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showGameInvitesModal, setShowGameInvitesModal] = useState(false);

  const handleActionClick = (actionId: string) => {
    if (actionId === 'friends') {
      setShowFriendsModal(true);
    } else if (actionId === 'add-friend') {
      setShowAddFriendModal(true);
    } else if (actionId === 'game-invites') {
      setShowGameInvitesModal(true);
    }
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Active social buttons */}
        {mainActions.slice(0, 3).map(action => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action.id)}
            className="action-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              background: 'rgba(251, 191, 36, 0.15)',
              border: '2px solid rgba(180, 83, 9, 0.4)',
              borderRadius: '8px',
              color: '#92400e',
              fontWeight: '500',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '24px', marginRight: '12px' }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Modals */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={userId}
      />
      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        userId={userId}
      />
      <GameInvitesModal
        isOpen={showGameInvitesModal}
        onClose={() => setShowGameInvitesModal(false)}
        userId={userId}
      />
    </>
  );
}