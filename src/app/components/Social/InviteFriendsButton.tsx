// app/components/Social/InviteFriendsButton.tsx
"use client";

import { useState } from "react";
import { Send } from "lucide-react";
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
        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      >
        <Send className="w-4 h-4" />
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
