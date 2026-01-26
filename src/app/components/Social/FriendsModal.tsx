"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Users, Search } from "lucide-react";
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

type FriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialFriends?: Friend[];
  initialRequests?: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
};

type TabType = "friends" | "requests" | "add";

export function FriendsModal({
  isOpen,
  onClose,
  userId,
  initialFriends = [],
  initialRequests = { incoming: [], outgoing: [] },
}: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

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
    } catch (error) {
      console.error("Error searching users:", error);
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
    }
    alert(result.message);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptFriendRequest(userId, requestId);
    if (result.success) {
      await loadData();
    }
    alert(result.message);
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
        style={{ WebkitTapHighlightColor: "transparent" }}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-slate-800 rounded-lg border-2 border-slate-600 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Friends
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            style={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-600 bg-slate-700/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === "friends"
                ? "bg-slate-800 text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-3 px-4 font-medium transition-colors relative ${
              activeTab === "requests"
                ? "bg-slate-800 text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Requests ({requests.incoming.length})
            {requests.incoming.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === "add"
                ? "bg-slate-800 text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Add Friend
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No friends yet</p>
                  <p className="text-sm mt-2">Add friends to play together!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    {friend.friendImage ? (
                      <img
                        src={friend.friendImage}
                        alt={friend.friendName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-2xl">
                        👤
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {friend.friendName}
                      </div>
                      <div className="text-sm text-slate-400 truncate">
                        {friend.friendEmail}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.friendId)}
                      className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded border border-red-500/50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Incoming */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">
                  Incoming ({requests.incoming.length})
                </h3>
                {requests.incoming.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No pending requests
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.incoming.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        {req.senderImage ? (
                          <img
                            src={req.senderImage}
                            alt={req.senderName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-2xl">
                            👤
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">
                            {req.senderName}
                          </div>
                          <div className="text-sm text-slate-400 truncate">
                            {req.senderEmail}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
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
                  <h3 className="text-lg font-bold text-white mb-3">
                    Sent ({requests.outgoing.length})
                  </h3>
                  <div className="space-y-3">
                    {requests.outgoing.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600 opacity-60"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-2xl">
                          ⏳
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            Request sent
                          </div>
                          <div className="text-sm text-slate-400">
                            Waiting for response...
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
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name or email..."
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || searchQuery.length < 2}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                    >
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-2xl">
                          👤
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-sm text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>
                      {user.isFriend ? (
                        <span className="px-3 py-1.5 text-sm bg-green-600/20 text-green-400 rounded border border-green-500/50">
                          ✓ Friends
                        </span>
                      ) : user.hasPendingRequest ? (
                        <span className="px-3 py-1.5 text-sm bg-yellow-600/20 text-yellow-400 rounded border border-yellow-500/50">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}