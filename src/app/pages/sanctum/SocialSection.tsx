"use client";

import { useState } from "react";
import { FriendsModal } from "@/app/components/Social/FriendsModal";
import { GameInvitesModal } from "@/app/components/Social/GameInvitesModal";
import type { Friend, FriendRequest } from "@/app/serverActions/social/friends";
import type { GameInvite } from "@/app/serverActions/social/gameInvites";

type SocialSectionProps = {
  userId: string;
  friends: Friend[];
  friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  gameInvites: { received: GameInvite[]; sent: GameInvite[] };
};

export function SocialSection({ 
  userId, 
  friends, 
  friendRequests, 
  gameInvites 
}: SocialSectionProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);

  const totalIncomingRequests = friendRequests.incoming.length;
  const totalGameInvites = gameInvites.received.length;
  const hasNotifications = totalIncomingRequests > 0 || totalGameInvites > 0;

  return (
    <>
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <span>👥</span>
          <span>Social</span>
          {hasNotifications && (
            <span className="ml-auto px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-full animate-pulse">
              {totalIncomingRequests + totalGameInvites}
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Friends Card */}
          <button
            onClick={() => setShowFriendsModal(true)}
            className="group relative bg-slate-700/70 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-blue-500 p-6 transition-all shadow-md hover:shadow-lg text-left"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">👥</div>
              {totalIncomingRequests > 0 && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                  {totalIncomingRequests}
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-white mb-2">Friends</div>
            <div className="text-sm text-gray-300 mb-3">
              {friends.length === 0 ? (
                "No friends yet"
              ) : (
                `${friends.length} friend${friends.length !== 1 ? 's' : ''}`
              )}
            </div>
            {totalIncomingRequests > 0 && (
              <div className="text-sm font-semibold text-blue-400">
                {totalIncomingRequests} pending request{totalIncomingRequests !== 1 ? 's' : ''}
              </div>
            )}
            <div className="mt-3 text-blue-400 group-hover:text-blue-300 font-medium text-sm">
              Manage Friends →
            </div>
          </button>

          {/* Game Invites Card */}
          <button
            onClick={() => setShowInvitesModal(true)}
            className="group relative bg-slate-700/70 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-purple-500 p-6 transition-all shadow-md hover:shadow-lg text-left"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">🎮</div>
              {totalGameInvites > 0 && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                  {totalGameInvites}
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-white mb-2">Game Invites</div>
            <div className="text-sm text-gray-300 mb-3">
              {totalGameInvites === 0 ? (
                "No pending invites"
              ) : (
                `${totalGameInvites} invite${totalGameInvites !== 1 ? 's' : ''} waiting`
              )}
            </div>
            <div className="mt-3 text-purple-400 group-hover:text-purple-300 font-medium text-sm">
              View Invites →
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={userId}
        initialFriends={friends}
        initialRequests={friendRequests}
      />

      <GameInvitesModal
        isOpen={showInvitesModal}
        onClose={() => setShowInvitesModal(false)}
        userId={userId}
      />
    </>
  );
}