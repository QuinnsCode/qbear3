"use client";

import { useState } from "react";
import { FriendsModal } from "@/app/components/Social/FriendsModal";
import { GameInvitesModal } from "@/app/components/Social/GameInvitesModal";
import { Avatar } from "@/app/components/Social/Avatar";
import type { Friend, FriendRequest } from "@/app/serverActions/social/friends";
import type { GameInvite } from "@/app/serverActions/social/gameInvites";
import type { Presence, UserPresence } from "@/app/serverActions/social/presence";
import { Users, Mail, Sparkles, UserPlus, ChevronRight, Gamepad2, Clock } from "lucide-react";

type SocialSectionProps = {
  userId: string;
  friends: Friend[];
  friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  gameInvites: { received: GameInvite[]; sent: GameInvite[] };
  presence?: Record<string, UserPresence>;
};

const PRESENCE_ORDER: Record<Presence, number> = { online: 0, away: 1, offline: 2 };

function lastSeen(ts: number) {
  if (!ts) return 'Never online';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SocialSection({ userId, friends, friendRequests, gameInvites, presence = {} }: SocialSectionProps) {
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);

  const totalIncomingRequests = friendRequests.incoming.length;
  const totalGameInvites = gameInvites.received.length;

  const presenceByUserId = Object.fromEntries(
    Object.entries(presence).map(([id, p]) => [id, p.presence])
  ) as Record<string, Presence>;

  const sortedFriends = [...friends].sort((a, b) => {
    const pa = presenceByUserId[a.friendId] || 'offline';
    const pb = presenceByUserId[b.friendId] || 'offline';
    if (PRESENCE_ORDER[pa] !== PRESENCE_ORDER[pb]) return PRESENCE_ORDER[pa] - PRESENCE_ORDER[pb];
    return a.friendName.localeCompare(b.friendName);
  });
  const onlineCount = friends.filter(f => presenceByUserId[f.friendId] === 'online').length;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Friends list */}
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/30">
                <Users className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Friends</h2>
                <p className="text-xs text-slate-400">
                  {friends.length === 0
                    ? 'Nobody yet'
                    : `${onlineCount} online · ${friends.length} total`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalIncomingRequests > 0 && (
                <button
                  onClick={() => setShowFriendsModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition-colors hover:bg-amber-500/25"
                >
                  <Mail className="h-3.5 w-3.5" /> {totalIncomingRequests} request{totalIncomingRequests === 1 ? '' : 's'}
                </button>
              )}
              <button
                onClick={() => setShowFriendsModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          {sortedFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
                <Users className="h-6 w-6 text-slate-500" />
              </div>
              <p className="font-medium text-white">No friends yet</p>
              <p className="mt-1 text-sm text-slate-400">Add friends to invite them to games and see when they are online.</p>
              <button
                onClick={() => setShowFriendsModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
              >
                <UserPlus className="h-4 w-4" /> Find friends
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {sortedFriends.slice(0, 8).map((friend) => {
                const p = presence[friend.friendId];
                const state = p?.presence || 'offline';
                const inGame = (p?.activeGames?.length || 0) > 0;
                return (
                  <li key={friend.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={friend.friendName} image={friend.friendImage} size="md" presence={state} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{friend.friendName}</div>
                      <div className="truncate text-xs text-slate-400">
                        {state === 'online'
                          ? inGame ? <span className="inline-flex items-center gap-1 text-emerald-300"><Gamepad2 className="h-3 w-3" /> In a game</span> : <span className="text-emerald-300">Online</span>
                          : state === 'away'
                            ? <span className="text-amber-300">Away</span>
                            : <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {lastSeen(p?.lastActive || 0)}</span>}
                      </div>
                    </div>
                    {state === 'online' && inGame && p?.activeGames?.[0] && (
                      <a
                        href={`/cardGame/${p.activeGames[0]}`}
                        className="rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-600/30"
                      >
                        Watch
                      </a>
                    )}
                  </li>
                );
              })}
              {sortedFriends.length > 8 && (
                <li>
                  <button onClick={() => setShowFriendsModal(true)} className="flex w-full items-center justify-center gap-1 px-5 py-3 text-xs font-medium text-slate-400 transition-colors hover:text-white">
                    See all {sortedFriends.length} friends <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowInvitesModal(true)}
            className="group rounded-2xl border border-slate-700/80 bg-slate-900 p-5 text-left shadow-xl transition-colors hover:border-violet-500/50"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 ring-1 ring-fuchsia-400/30">
                <Gamepad2 className="h-5 w-5 text-fuchsia-300" />
              </div>
              {totalGameInvites > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{totalGameInvites}</span>
              )}
            </div>
            <div className="mt-3 text-lg font-bold text-white">Game invites</div>
            <div className="text-sm text-slate-400">
              {totalGameInvites === 0 ? 'No pending invites' : `${totalGameInvites} friend${totalGameInvites === 1 ? '' : 's'} waiting on you`}
            </div>
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-fuchsia-300 group-hover:text-fuchsia-200">
              View invites <ChevronRight className="h-4 w-4" />
            </div>
          </button>

          <a
            href="/community"
            className="group rounded-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-xl transition-colors hover:border-indigo-500/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/30">
              <Sparkles className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="mt-3 text-lg font-bold text-white">Community decks</div>
            <div className="text-sm text-slate-400">Browse what everyone else is brewing.</div>
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-300 group-hover:text-indigo-200">
              Explore <ChevronRight className="h-4 w-4" />
            </div>
          </a>
        </div>
      </div>

      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={userId}
        initialFriends={friends}
        initialRequests={friendRequests}
        presenceByUserId={presenceByUserId}
      />

      <GameInvitesModal
        isOpen={showInvitesModal}
        onClose={() => setShowInvitesModal(false)}
        userId={userId}
      />
    </>
  );
}
