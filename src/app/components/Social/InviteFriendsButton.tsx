// app/components/Social/InviteFriendsButton.tsx
"use client";

import { useState } from "react";
import { InviteFriendsModal } from "./InviteFriendsModal";
import type { GameType } from "@/app/serverActions/social/gameInvites";

type InviteFriendsButtonProps = {
  userId: string;
  gameId: string;
  gameType: GameType;
  gameName: string;
  gameUrl: string;
};

export function InviteFriendsButton(props: InviteFriendsButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '12px 24px',
          background: 'rgba(146, 64, 14, 0.2)',
          border: '2px solid rgba(146, 64, 14, 0.4)',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>📨</span>
        Invite Friends
      </button>

      <InviteFriendsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...props}
      />
    </>
  );
}