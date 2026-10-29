"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Users, Send, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { getFriends, type Friend } from "@/app/serverActions/social/friends";
import { sendGameInvite, type GameType } from "@/app/serverActions/social/gameInvites";
import { FriendsModal } from "./FriendsModal";
import { Avatar } from "./Avatar";

type InviteFriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  gameId: string;
  gameType: GameType;
  gameName: string;
  gameUrl: string;
};

type StatusBanner = { type: "success" | "error"; text: string };

const TAP_STYLE = {
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
} as const;

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
  const [status, setStatus] = useState<StatusBanner | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadFriends();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const showStatus = (type: StatusBanner["type"], text: string) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ type, text });
    statusTimer.current = setTimeout(() => {
      setStatus(null);
      statusTimer.current = null;
    }, 3000);
  };

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
        showStatus("error", result.message);
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      showStatus("error", "Failed to send invite");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">Invite Friends</h2>
              <p className="text-xs text-slate-400 truncate">{gameName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddFriends(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg font-medium transition-colors"
                title="Add new friends"
                style={TAP_STYLE}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Friends
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                style={TAP_STYLE}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status banner */}
          {status && (
            <div className="px-4 pt-3 shrink-0">
              <div
                role="status"
                className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 border animate-in fade-in duration-200 ${
                  status.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="min-w-0 truncate">{status.text}</span>
              </div>
            </div>
          )}

          {/* Friends list */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                Loading...
              </div>
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-white font-medium">No friends yet</p>
                <p className="text-slate-400 text-sm mt-1 mb-4">
                  Add friends to invite them to games
                </p>
                <button
                  onClick={() => setShowAddFriends(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                  style={TAP_STYLE}
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
                      className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 transition-colors"
                    >
                      <Avatar name={friend.friendName} image={friend.friendImage} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{friend.friendName}</p>
                        <p className="text-slate-400 text-xs truncate">{friend.friendEmail}</p>
                      </div>
                      <button
                        onClick={() => handleInvite(friend.friendId)}
                        disabled={alreadyInvited}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                          alreadyInvited
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                        }`}
                        style={TAP_STYLE}
                      >
                        {alreadyInvited ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Invited
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Invite
                          </>
                        )}
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
