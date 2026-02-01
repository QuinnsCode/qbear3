"use client";

import { useState } from "react";
import { FriendsModal } from "@/app/components/Game/Social/FriendsModal";
import { AddFriendModal } from "@/app/components/Game/Social/AddFriendModal";
import type { LucideIcon } from "lucide-react";

type SanctumClientActionsProps = {
  userId: string;
  mainActions: Array<{
    id: string;
    label: string;
    action: string;
    icon: LucideIcon;
  }>;
};

export function SanctumClientActions({ userId, mainActions }: SanctumClientActionsProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const handleActionClick = (actionId: string) => {
    if (actionId === 'friends') {
      setShowFriendsModal(true);
    } else if (actionId === 'add-friend') {
      setShowAddFriendModal(true);
    }
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px'
      }}>
        {mainActions.slice(0, 2).map(action => {
          const Icon = action.icon;
          return (
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
              <Icon size={24} style={{ marginRight: '12px' }} />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Blurred coming soon buttons */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        marginTop: '12px',
        filter: 'blur(2px)',
        opacity: 0.5,
        pointerEvents: 'none'
      }}>
        {mainActions.slice(2, 4).map(action => {
          const Icon = action.icon;
          return (
            <div
              key={action.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(251, 191, 36, 0.15)',
                border: '2px solid rgba(180, 83, 9, 0.4)',
                borderRadius: '8px',
                color: '#92400e',
                fontWeight: '500',
                fontSize: '16px'
              }}
            >
              <Icon size={24} style={{ marginRight: '12px' }} />
              {action.label}
            </div>
          );
        })}
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
    </>
  );
}