"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus } from "lucide-react";
import { getFriends, type Friend } from "@/app/serverActions/social/friends";
import { sendGameInvite, type GameType } from "@/app/serverActions/social/gameInvites";
import { FriendsModal } from "./FriendsModal";

type InviteFriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  gameId: string;
  gameType: GameType;
  gameName: string;
  gameUrl: string;
};

export function InviteFriendsModal({
  isOpen,
  onClose,
  userId,
  gameId,
  gameType,
  gameName,
  gameUrl,
}: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [showAddFriends, setShowAddFriends] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadFriends();
    }
  }, [isOpen, userId]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsData = await getFriends(userId);
      setFriends(friendsData);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (friendId: string) => {
    try {
      const result = await sendGameInvite(userId, friendId, gameId, gameType, gameUrl);
      if (result.success) {
        setInvitedFriends((prev) => new Set(prev).add(friendId));
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Failed to send invite");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-800 border border-slate-600 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Invite Friends</h2>
            <p className="text-xs text-slate-400 mt-0.5">{gameName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddFriends(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs rounded-lg transition-colors"
              title="Add new friends"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Friends
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              Loading...
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-3">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-white font-medium mb-1">No friends yet</p>
              <p className="text-slate-400 text-sm mb-4">Add friends to invite them to games!</p>
              <button
                onClick={() => setShowAddFriends(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Friends
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map((friend) => {
                const alreadyInvited = invitedFriends.has(friend.friendId);
                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 bg-slate-700/50 border border-slate-600 rounded-lg"
                  >
                    {friend.friendImage ? (
                      <img
                        src={friend.friendImage}
                        alt={friend.friendName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center shrink-0 text-xl">
                        👤
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{friend.friendName}</p>
                      <p className="text-slate-400 text-xs truncate">{friend.friendEmail}</p>
                    </div>
                    <button
                      onClick={() => handleInvite(friend.friendId)}
                      disabled={alreadyInvited}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                        alreadyInvited
                          ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                      }`}
                    >
                      {alreadyInvited ? "Invited" : "Invite"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    <FriendsModal
      isOpen={showAddFriends}
      onClose={() => {
        setShowAddFriends(false);
        loadFriends(); // refresh list after adding friends
      }}
      userId={userId}
    />
    </>,
    document.body
  );
}
