// src/app/components/Social/FriendsModal.tsx
"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UserPlus,
  Users,
  Search,
  Hourglass,
  Check,
  Inbox,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  type Friend,
  type FriendRequest,
} from "@/app/serverActions/social/friends";
import { Avatar } from "./Avatar";

type Presence = "online" | "away" | "offline";

type FriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialFriends?: Friend[];
  initialRequests?: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  presenceByUserId?: Record<string, Presence>;
};

type TabType = "friends" | "requests" | "add";

type StatusBanner = { type: "success" | "error"; text: string };

const TAP_STYLE = {
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
} as const;

const PRESENCE_ORDER: Record<Presence, number> = { online: 0, away: 1, offline: 2 };

export function FriendsModal({
  isOpen,
  onClose,
  userId,
  initialFriends = [],
  initialRequests = { incoming: [], outgoing: [] },
  presenceByUserId,
}: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusBanner | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Clean up any pending status timeout on unmount
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

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(userId),
        getFriendRequests(userId),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch (error) {
      console.error("Error loading friends data:", error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;

    setLoading(true);
    try {
      const results = await searchUsers(searchQuery, userId);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error("Error searching users:", error);
      showStatus("error", "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (toUserId: string) => {
    const result = await sendFriendRequest(userId, toUserId);
    if (result.success) {
      await loadData();
      setSearchResults([]);
      setSearchQuery("");
      setHasSearched(false);
    }
    showStatus(result.success ? "success" : "error", result.message);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptFriendRequest(userId, requestId);
    if (result.success) {
      await loadData();
    }
    showStatus(result.success ? "success" : "error", result.message);
  };

  const handleRejectRequest = async (requestId: string) => {
    const result = await rejectFriendRequest(userId, requestId);
    if (result.success) {
      await loadData();
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Remove this friend?")) return;

    const result = await removeFriend(userId, friendId);
    if (result.success) {
      await loadData();
    }
  };

  if (!isOpen) return null;

  // Online friends first when presence data is available; otherwise keep server order.
  const sortedFriends = presenceByUserId
    ? [...friends].sort((a, b) => {
        const pa = PRESENCE_ORDER[presenceByUserId[a.friendId] ?? "offline"];
        const pb = PRESENCE_ORDER[presenceByUserId[b.friendId] ?? "offline"];
        return pa - pb;
      })
    : friends;

  const tabClass = (tab: TabType) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-violet-600 text-white shadow"
        : "text-slate-400 hover:text-white"
    }`;

  const countBadge = (n: number) => (
    <span className="bg-black/30 rounded-full px-1.5 text-[10px] leading-4">{n}</span>
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1100]"
        onClick={onClose}
        style={{ WebkitTapHighlightColor: "transparent" }}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-[1200] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">Friends</h2>
              <p className="text-xs text-slate-400">
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
                {requests.incoming.length > 0 &&
                  ` · ${requests.incoming.length} pending`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
            style={TAP_STYLE}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("friends")}
              className={tabClass("friends")}
              style={TAP_STYLE}
            >
              Friends {countBadge(friends.length)}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`${tabClass("requests")} relative`}
              style={TAP_STYLE}
            >
              Requests {countBadge(requests.incoming.length)}
              {requests.incoming.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={tabClass("add")}
              style={TAP_STYLE}
            >
              <UserPlus className="w-4 h-4" />
              Add Friend
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="space-y-2">
              {sortedFriends.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-6 h-6" />}
                  title="No friends yet"
                  subtitle="Add friends to play together"
                  action={
                    <button
                      onClick={() => setActiveTab("add")}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                      style={TAP_STYLE}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  }
                />
              ) : (
                sortedFriends.map((friend) => {
                  const presence = presenceByUserId?.[friend.friendId];
                  return (
                    <div
                      key={friend.id}
                      className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 transition-colors"
                    >
                      <Avatar
                        name={friend.friendName}
                        image={friend.friendImage}
                        size="md"
                        presence={presence}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {friend.friendName}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {presence === "online"
                            ? "Online"
                            : presence === "away"
                            ? "Away"
                            : friend.friendEmail}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.friendId)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-sm font-medium transition-colors shrink-0"
                        style={TAP_STYLE}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Incoming */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Incoming ({requests.incoming.length})
                </h3>
                {requests.incoming.length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="w-6 h-6" />}
                    title="No pending requests"
                    subtitle="Friend requests you receive will show up here"
                  />
                ) : (
                  <div className="space-y-2">
                    {requests.incoming.map((req) => (
                      <div
                        key={req.id}
                        className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 transition-colors"
                      >
                        <Avatar name={req.senderName} image={req.senderImage} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">
                            {req.senderName}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {req.senderEmail}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                            style={TAP_STYLE}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-sm font-medium transition-colors"
                            style={TAP_STYLE}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing */}
              {requests.outgoing.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Sent ({requests.outgoing.length})
                  </h3>
                  <div className="space-y-2">
                    {requests.outgoing.map((req) => (
                      <div
                        key={req.id}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 opacity-70"
                      >
                        {req.receiverName ? (
                          <Avatar name={req.receiverName} image={req.receiverImage} size="md" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                            <Hourglass className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">
                            {req.receiverName ? `Sent to ${req.receiverName}` : "Request sent"}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Hourglass className="w-3 h-3" />
                            Waiting for response
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Friend Tab */}
          {activeTab === "add" && (
            <div>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading || searchQuery.length < 2}
                  aria-label="Search"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  style={TAP_STYLE}
                >
                  {loading ? "..." : "Search"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Type at least 2 characters and press Enter to search by name or email.
              </p>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 transition-colors"
                    >
                      <Avatar name={user.name ?? ""} image={user.image} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>
                      {user.isFriend ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-500/10 text-emerald-300 rounded-lg border border-emerald-500/30 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          Friends
                        </span>
                      ) : user.hasPendingRequest ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/30 shrink-0">
                          <Hourglass className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
                          style={TAP_STYLE}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : hasSearched && !loading ? (
                <EmptyState
                  icon={<Search className="w-6 h-6" />}
                  title="No users found"
                  subtitle="Try a different name or email"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
        {icon}
      </div>
      <p className="text-white font-medium">{title}</p>
      <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
      {action}
    </div>
  );
}
