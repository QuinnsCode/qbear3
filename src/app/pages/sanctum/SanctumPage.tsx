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
import { getPresenceForUsers, type UserPresence } from "@/app/serverActions/social/presence";
import type { ReactNode } from "react";
import { BrandMark } from "@qntbr/ui";
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
      <Gate title="🚫 No Access" body="You don't have permission to access this organization.">
        <a href="/" className="q-btn q-primary">Return Home</a>
      </Gate>
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
      <Gate title="🚫 Not a Member" body={`You must be a member of ${ctx.organization?.name ?? 'this lair'} to access this page.`}>
        <a href="/" className="q-btn q-primary">Return Home</a>
      </Gate>
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
        const tierConfig = getTierConfig(currentTier as any, user.email ?? undefined);

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
          email: user.email ?? '',
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

  // Live presence for the friends list (never cached: it changes by the minute).
  // When friends came from cache their ids are already known, so the lookup
  // runs inside the parallel batch; on a cache miss it waits for getFriends.
  const lookupPresence = async (list: any[]): Promise<Record<string, UserPresence>> => {
    if (list.length === 0) return {};
    try {
      return await getPresenceForUsers(list.map((f: any) => f.friendId));
    } catch (e) {
      console.warn('[SanctumPage] presence lookup failed:', e);
      return {};
    }
  };

  const [activeGames, activeCardGames, userDecksResult, freshFriends, freshFriendRequests, freshGameInvites, cachedPresence] = await Promise.all([
    orgSlug ? getOrgGames(orgSlug) : Promise.resolve([]),
    orgSlug ? getOrgCardGames(orgSlug) : Promise.resolve([]),
    ctx.user?.id ? getUserDecks(ctx.user.id) : Promise.resolve({ success: true, decks: [] }),
    needsSocialData && ctx.user?.id ? getFriends(ctx.user.id) : Promise.resolve(friends),
    needsSocialData && ctx.user?.id ? getFriendRequests(ctx.user.id) : Promise.resolve(friendRequests),
    needsSocialData && ctx.user?.id ? getGameInvites(ctx.user.id) : Promise.resolve(gameInvites),
    needsSocialData && ctx.user?.id ? Promise.resolve<Record<string, UserPresence>>({}) : lookupPresence(friends),
  ]);

  const userDecks = userDecksResult.decks || [];

  const friendPresence: Record<string, UserPresence> =
    needsSocialData && ctx.user?.id ? await lookupPresence(freshFriends) : cachedPresence;

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

  if (!orgSlug) {
    return <NoOrgSelected firstOrgSlug={usersFirstOrgSlugFound} isLoggedIn={!!ctx.user} />;
  }

  return (
    <SanctumClient
      userDecks={userDecks}
      activeGames={activeCardGames}
      friends={friends}
      friendRequests={friendRequests}
      gameInvites={gameInvites}
      friendPresence={friendPresence}
      currentTier={currentTier}
      tierLimits={tierLimits}
      userId={ctx.user!.id}
      userName={ctx.user?.name || undefined}
      organizationName={ctx.organization?.name || undefined}
      orgSlug={orgSlug}
    />
  );
}

/** A single paper card in the middle of the dotted canvas: the Sanctum's doors that stay shut. */
function Gate({ title, body, children }: { title: string; body: ReactNode; children: ReactNode }) {
  return (
    <div className="q-gate">
      <div className="q-sheet">
        <a href="/" className="q-brand"><BrandMark /> Sanctum</a>
        <h1>{title}</h1>
        <div className="q-muted">{body}</div>
        <div className="q-gate-actions">{children}</div>
      </div>
    </div>
  );
}

function NoOrgSelected({ firstOrgSlug, isLoggedIn }: { firstOrgSlug: string | null; isLoggedIn: boolean }) {
  return (
    <Gate
      title="No Organization Selected"
      body={<>
        <p style={{ margin: 0 }}>Please select an organization or add your subdomain.</p>
        {firstOrgSlug && <p style={{ margin: '10px 0 0' }}>Your org: <span className="q-badge">{firstOrgSlug}</span></p>}
      </>}
    >
      {!isLoggedIn && <a href="/user/login" className="q-btn q-primary">Login</a>}
      {isLoggedIn && (
        <LogoutButton className="q-btn" redirectTo="/user/login">
          Logout
        </LogoutButton>
      )}
      <a href="/" className="q-btn">Return Home</a>
    </Gate>
  );
}
