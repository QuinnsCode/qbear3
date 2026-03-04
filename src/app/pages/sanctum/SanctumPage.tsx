// app/pages/sanctum/SanctumPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { getOrgGames } from "@/app/serverActions/gameRegistry";
import { getFirstOrgSlugOfUser } from "@/app/serverActions/admin/getFirstOrgSlugOfUser";
import { getOrgCardGames } from "@/app/serverActions/cardGame/cardGameRegistry";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { getUserDecks } from "@/app/serverActions/deckBuilder/deckActions";
import { getEffectiveTier, getTierConfig } from "@/app/lib/subscriptions/tiers";
import { db } from "@/db";
import { getFriends, getFriendRequests } from "@/app/serverActions/social/friends";
import { getGameInvites } from "@/app/serverActions/social/gameInvites";
import { SanctumClient } from "./SanctumClient";
import { LogoutButton } from "@/app/pages/user/LoginButton";
import {
  getCachedUserProfile,
  setCachedUserProfile,
  getCachedSocialData,
  setCachedSocialData
} from "@/app/lib/cache/userDataCache";

/**
 * ⚠️⚠️⚠️ SANCTUM PAGE - MAIN LANDING PAGE AFTER LOGIN ⚠️⚠️⚠️
 *
 * This is THE most important page - users land here after login
 *
 * CRITICAL DEPENDENCIES:
 * - extractOrgFromSubdomain(request) MUST return org slug from URL
 * - ctx.user MUST be set by middleware
 * - Lines 124-135: Redirect logic if no orgSlug (sends main domain -> org subdomain)
 *
 * THE REDIRECT LOGIC (lines 124-135) IS CRITICAL:
 * - If user is on qntbr.com/sanctum (no org), lookup their org and redirect
 * - Redirect to ryan.qntbr.com/sanctum (with org)
 * - DO NOT REMOVE THIS LOGIC - it's how login flow completes
 *
 * WHAT BREAKS THIS:
 * ❌ Removing the conditional render (!orgSlug ? <NoOrgSelected> : <SanctumClient>)
 * ❌ Changing extractOrgFromSubdomain to use ctx.organization (might be null)
 * ❌ Removing the redirect logic (lines 124-135)
 * ❌ Passing empty userId (causes "Cannot read properties of undefined")
 *
 * TESTED WORKING: March 2, 2026 @ 6:46 PM PST (commit b4d443e)
 * LAST BROKEN: March 3, 2026 (removed conditional render, crashed with Error 1101)
 */
export default async function SanctumPage({ ctx, request }: RequestInfo) {
  const orgSlug = extractOrgFromSubdomain(request);
  
  if (ctx.orgError === 'NO_ACCESS') {
    return (
      <div className="min-h-screen bg-slate-700 flex items-center justify-center p-8">
        <div className="bg-slate-800 rounded-lg border-2 border-red-500 p-8 text-center max-w-md shadow-xl">
          <h1 className="text-3xl font-bold text-red-400 mb-4">🚫 No Access</h1>
          <p className="text-gray-200 mb-6">You don't have permission to access this organization.</p>
          <a href="/" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors">
            Return Home
          </a>
        </div>
      </div>
    );
  }
  
  if (orgSlug && !ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }
  
  if (orgSlug && !ctx.userRole) {
    return (
      <div className="min-h-screen bg-slate-700 flex items-center justify-center p-8">
        <div className="bg-slate-800 rounded-lg border-2 border-yellow-500 p-8 text-center max-w-md shadow-xl">
          <h1 className="text-3xl font-bold text-yellow-400 mb-4">🚫 Not a Member</h1>
          <p className="text-gray-200 mb-6">You must be a member of {ctx.organization?.name} to access this page.</p>
          <a href="/" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  let usersFirstOrgSlugFound = null;
  let currentTier = 'free';
  let tierLimits = {
    maxGames: 1,
    maxPlayers: 4,
    maxDecks: 2,
  };
  let hasDiscord = false;

  // Try to get cached user profile first
  if (ctx.user?.id) {
    const cachedProfile = await getCachedUserProfile(ctx.user.id);

    if (cachedProfile) {
      // Use cached data
      console.log(`[Cache] Using cached user profile for ${ctx.user.id}`);
      currentTier = cachedProfile.tier;
      tierLimits = cachedProfile.tierLimits;
      hasDiscord = cachedProfile.hasDiscord;
    } else {
      // Cache miss - fetch from database
      console.log(`[Cache] Cache miss - fetching user profile from DB for ${ctx.user.id}`);

      const [user, discordAccount] = await Promise.all([
        db.user.findUnique({
          where: { id: ctx.user.id },
          include: {
            squeezeSubscription: true,
            stripeSubscription: true
          }
        }),
        db.account.findFirst({
          where: {
            userId: ctx.user.id,
            providerId: "discord"
          }
        })
      ]);

      if (user) {
        currentTier = getEffectiveTier(user);
        const tierConfig = getTierConfig(currentTier as any, user.email);

        tierLimits = {
          maxGames: tierConfig.features.maxGamesPerOrg,
          maxPlayers: tierConfig.features.maxPlayersPerGame,
          maxDecks: tierConfig.features.maxCommanderDecks + tierConfig.features.maxDraftDecks,  // Total for display
        };

        hasDiscord = !!discordAccount;

        // Cache the profile for next time
        await setCachedUserProfile({
          id: ctx.user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          tier: currentTier,
          hasDiscord,
          tierLimits,
          cachedAt: Date.now()
        });
      }
    }
  }
  
  if (!orgSlug && ctx?.user?.id) {
    try {
      usersFirstOrgSlugFound = await getFirstOrgSlugOfUser(ctx.user.id);
    } catch (e) {
      console.warn('[SanctumPage] getFirstOrgSlugOfUser failed:', e);
    }
    if (usersFirstOrgSlugFound) {
      const url = new URL(request.url);
      const hostname = url.hostname;
      let redirectHost: string;
      if (hostname.includes('localhost')) {
        const port = url.port || '5173';
        redirectHost = `${usersFirstOrgSlugFound}.localhost:${port}`;
      } else {
        redirectHost = `${usersFirstOrgSlugFound}.qntbr.com`;
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `${url.protocol}//${redirectHost}/sanctum` }
      });
    }
  }

  // Try to get cached social data first
  let friends: any[] = [];
  let friendRequests: { incoming: any[]; outgoing: any[] } = { incoming: [], outgoing: [] };
  let gameInvites: { received: any[]; sent: any[] } = { received: [], sent: [] };

  if (ctx.user?.id) {
    const cachedSocial = await getCachedSocialData(ctx.user.id);

    if (cachedSocial) {
      console.log(`[Cache] Using cached social data for ${ctx.user.id}`);
      friends = cachedSocial.friends;
      friendRequests = cachedSocial.friendRequests;
      gameInvites = cachedSocial.gameInvites;
    } else {
      console.log(`[Cache] Cache miss - fetching social data from DB for ${ctx.user.id}`);
      // Will be fetched below with other data
    }
  }

  // Fetch remaining data in parallel (skip social if cached)
  const needsSocialData = ctx.user?.id && friends.length === 0 && friendRequests.incoming.length === 0 && gameInvites.received.length === 0;

  const [activeGames, activeCardGames, userDecksResult, freshFriends, freshFriendRequests, freshGameInvites] = await Promise.all([
    orgSlug ? getOrgGames(orgSlug) : Promise.resolve([]),
    orgSlug ? getOrgCardGames(orgSlug) : Promise.resolve([]),
    ctx.user?.id ? getUserDecks(ctx.user.id) : Promise.resolve({ success: true, decks: [] }),
    needsSocialData && ctx.user?.id ? getFriends(ctx.user.id) : Promise.resolve(friends),
    needsSocialData && ctx.user?.id ? getFriendRequests(ctx.user.id) : Promise.resolve(friendRequests),
    needsSocialData && ctx.user?.id ? getGameInvites(ctx.user.id) : Promise.resolve(gameInvites),
  ]);

  const userDecks = userDecksResult.decks || [];

  // Use fresh data if we fetched it, otherwise keep cached
  if (needsSocialData && ctx.user?.id) {
    friends = freshFriends;
    friendRequests = freshFriendRequests;
    gameInvites = freshGameInvites;

    // Cache the social data for next time
    await setCachedSocialData(ctx.user.id, {
      friends,
      friendRequests,
      gameInvites
    });
  }

  return (
    <div className="min-h-screen bg-slate-700">
      {!orgSlug ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <NoOrgSelected firstOrgSlug={usersFirstOrgSlugFound} isLoggedIn={!!ctx.user} />
        </div>
      ) : (
        <SanctumClient
          userDecks={userDecks}
          activeGames={activeCardGames}
          friends={friends}
          friendRequests={friendRequests}
          gameInvites={gameInvites}
          currentTier={currentTier}
          tierLimits={tierLimits}
          userId={ctx.user!.id}
          userName={ctx.user?.name || undefined}
          organizationName={ctx.organization?.name || undefined}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

function NoOrgSelected({ firstOrgSlug, isLoggedIn }: { firstOrgSlug: string | null; isLoggedIn: boolean }) {
  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-8 text-center shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">No Organization Selected</h2>
      <p className="text-gray-300 mb-6">
        Please select an organization or add your subdomain.
      </p>
      {firstOrgSlug && (
        <div className="mb-6 p-4 bg-slate-700/70 rounded-lg border border-slate-600">
          <p className="text-gray-200">
            Your org: <strong className="text-blue-400">{firstOrgSlug}</strong>
          </p>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {!isLoggedIn && (
          <a
            href="/user/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
          >
            Login
          </a>
        )}
        {isLoggedIn && (
          <LogoutButton
            className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            redirectTo="/user/login"
          >
            Logout
          </LogoutButton>
        )}
        <a
          href="/"
          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

// Old components removed - now using SanctumClient