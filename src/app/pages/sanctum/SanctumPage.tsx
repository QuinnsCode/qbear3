// app/pages/sanctum/SanctumPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { getOrgGames } from "@/app/serverActions/gameRegistry";
import { getFirstOrgSlugOfUser } from "@/app/serverActions/admin/getFirstOrgSlugOfUser";
import { getOrgCardGames } from "@/app/serverActions/cardGame/cardGameRegistry";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { SanctumDeleteGameButton } from "@/app/components/Sanctum/SanctumDeleteGameButton";
import { SanctumClientActions } from "@/app/pages/sanctum/SanctumClientActions";
import { DiscordConnect } from "@/app/components/Sanctum/DiscordConnect";
import { DeckSection } from "@/app/pages/sanctum/DeckSection";
import { getUserDecks } from "@/app/serverActions/deckBuilder/deckActions";
import { getEffectiveTier, getTierConfig } from "@/app/lib/subscriptions/tiers";
import { db } from "@/db";

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
  
  if (ctx.user?.id) {
    const user = await db.user.findUnique({
      where: { id: ctx.user.id },
      include: { 
        squeezeSubscription: true,
        stripeSubscription: true
      }
    });
    
    if (user) {
      currentTier = getEffectiveTier(user);
      const tierConfig = getTierConfig(currentTier as any);
      
      tierLimits = {
        maxGames: tierConfig.features.maxGamesPerOrg,
        maxPlayers: tierConfig.features.maxPlayersPerGame,
        maxDecks: tierConfig.features.maxDecksPerUser,
      };
    }
  }

  let hasDiscord = false;
  if (ctx.user?.id) {
    const discordAccount = await db.account.findFirst({
      where: {
        userId: ctx.user.id,
        providerId: "discord"
      }
    });
    hasDiscord = !!discordAccount;
  }
  
  if (!orgSlug && ctx?.user?.id) {
    usersFirstOrgSlugFound = await getFirstOrgSlugOfUser(ctx.user.id);
    if (usersFirstOrgSlugFound) {
      const protocol = new URL(request.url).protocol;
      const fullUrl = `${protocol}//${usersFirstOrgSlugFound}.qntbr.com/sanctum`;
      
      return new Response(null, {
        status: 302,
        headers: { Location: fullUrl }
      });
    }
  }

  const activeGames = orgSlug ? await getOrgGames(orgSlug) : [];
  const activeCardGames = orgSlug ? await getOrgCardGames(orgSlug) : [];
  
  let userDecks: any[] = [];
  if (ctx.user?.id) {
    const { decks } = await getUserDecks(ctx.user.id);
    userDecks = decks;
  }

  const mainActions = [
    { id: 'friends', label: 'Friends', action: '#', icon: '👥' },
    { id: 'add-friend', label: 'Add a Friend', action: '#', icon: '➕' },
    { id: 'game-invites', label: 'Game Invites', action: '#', icon: '🎮' },
    { id: 'invite-pvp', label: 'Invite Friend to PVP', action: '#', icon: '⚔️' },
    { id: 'watch-games', label: 'Watch Games', action: '#', icon: '👁️' },
    { id: 'play-game', label: 'Play Game', action: '/game', icon: '🎮' }
  ];

  return (
    <div className="min-h-screen bg-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!orgSlug ? (
          <NoOrgSelected firstOrgSlug={usersFirstOrgSlugFound} />
        ) : (
          <>
            <Header ctx={ctx} currentTier={currentTier} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <DeckSection
                decks={userDecks}
                currentTier={currentTier}
                maxDecks={tierLimits.maxDecks}
                atLimit={userDecks.length >= tierLimits.maxDecks}
              />
              <GameSection 
                games={activeCardGames} 
                type="cardGame" 
                orgSlug={orgSlug}
                currentTier={currentTier}
                tierLimits={tierLimits}
                atLimit={activeCardGames.length >= tierLimits.maxGames}
              />
            </div>
            <StatusCard ctx={ctx} currentTier={currentTier} hasDiscord={hasDiscord} />
          </>
        )}
      </div>
    </div>
  );
}

function NoOrgSelected({ firstOrgSlug }: { firstOrgSlug: string | null }) {
  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-8 text-center shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">No Organization Selected</h2>
      <p className="text-gray-300 mb-4">
        Please select an organization or add your subdomain.
      </p>
      {firstOrgSlug && (
        <div className="mt-4 p-4 bg-slate-700/70 rounded-lg border border-slate-600">
          <p className="text-gray-200">
            Your first org: <strong className="text-blue-400">{firstOrgSlug}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

function Header({ ctx, currentTier }: any) {
  const tierConfig: Record<string, { icon: string; name: string; color: string }> = {
    free: { icon: '🏕️', name: 'Free', color: '#78716c' },
    starter: { icon: '⚔️', name: 'Starter', color: '#f59e0b' },
    pro: { icon: '👑', name: 'Pro', color: '#eab308' }
  };
  
  const tier = tierConfig[currentTier] || tierConfig.free;
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 shadow-xl">
      <h1 className="text-4xl font-bold text-white mb-2">Sanctum</h1>
      <div className="text-blue-100 mb-4 text-lg">
        {ctx.organization?.name || 'Your Dashboard'} • {ctx.user?.name || 'Player'}
      </div>
      
      <div 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 bg-black/20"
        style={{ borderColor: tier.color }}
      >
        <span className="text-2xl">{tier.icon}</span>
        <span className="font-semibold text-white">{tier.name} Tier</span>
        {currentTier === 'free' && (
          <a 
            href="/pricing" 
            className="ml-2 px-3 py-1 rounded text-white text-sm font-bold transition-all hover:scale-105"
            style={{ background: tier.color }}
          >
            Upgrade
          </a>
        )}
      </div>
    </div>
  );
}

function StatusCard({ ctx, currentTier, hasDiscord }: any) {
  const tierConfig: Record<string, { icon: string; name: string; color: string }> = {
    free: { icon: '🏕️', name: 'Free', color: '#78716c' },
    starter: { icon: '⚔️', name: 'Starter', color: '#f59e0b' },
    pro: { icon: '👑', name: 'Pro', color: '#eab308' }
  };
  
  const tier = tierConfig[currentTier] || tierConfig.free;
  
  return (
    <div className="mt-6 bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">Account Info</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-slate-700/70 rounded border border-slate-600">
          <span className="text-gray-300">Role:</span>
          <span className="font-medium text-white">
            {ctx.userRole === 'admin' ? 'Admin' : ctx.userRole === 'owner' ? 'Owner' : 'Member'}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-slate-700/70 rounded border border-slate-600">
          <span className="text-gray-300">Organization:</span>
          <span className="font-medium text-white">{ctx.organization?.name || 'None'}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-slate-700/70 rounded border border-slate-600">
          <span className="text-gray-300">Tier:</span>
          <span className="font-medium flex items-center gap-2" style={{ color: tier.color }}>
            <span>{tier.icon}</span>
            <span>{tier.name}</span>
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-slate-700/70 rounded border border-slate-600">
          <span className="text-gray-300">Discord:</span>
          <span className="font-medium text-white">
            {hasDiscord ? '✅ Connected' : '❌ Not Connected'}
          </span>
        </div>
      </div>
      <div className="mt-6">
        <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
          ← Return Home
        </a>
      </div>
    </div>
  );
}

function GameSection({ games, type, orgSlug, currentTier, tierLimits, atLimit }: any) {
  const isCardGame = type === 'cardGame';
  const title = isCardGame ? 'Card Games' : 'Active Games';
  const icon = isCardGame ? '🎮' : '🎲';
  const route = isCardGame ? '/cardGame' : '/game';
  const idField = isCardGame ? 'cardGameId' : 'gameId';

  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
        <span className="ml-auto text-sm bg-slate-700 text-gray-300 px-3 py-1 rounded-full border border-slate-600">
          {games.length}/{tierLimits.maxGames}
        </span>
      </h2>
      
      {atLimit && currentTier !== 'pro' && (
        <div className="mb-4 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg">
          <div className="font-bold text-red-400 mb-2">
            🚨 Game Limit Reached
          </div>
          <div className="text-sm text-red-300 mb-3">
            You've reached your limit. 
            {currentTier === 'free' && ' Upgrade to Starter for 5 games ($1/mo)'}
            {currentTier === 'starter' && ' Upgrade to Pro for 10 games ($5/mo)'}
          </div>
          <a 
            href="/pricing"
            className="inline-block px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Upgrade Now
          </a>
        </div>
      )}
      
      {games.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">{icon}</div>
          <div className="text-xl font-semibold text-gray-200 mb-2">No Games Yet</div>
          <a 
            href={route} 
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg"
          >
            Create Your First Game
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game: any) => (
            <div 
              key={game[idField]} 
              className="bg-slate-700/70 rounded-lg border border-slate-600 p-4 hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="font-bold text-white text-lg mb-2">{game.name}</div>
              <div className="text-sm text-gray-300 mb-3">
                Created {new Date(game.createdAt).toLocaleDateString()}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">
                  Players: {game.playerCount}/{tierLimits.maxPlayers}
                </span>
                <a 
                  href={`${route}/${game[idField]}`} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                >
                  Enter Game →
                </a>
              </div>
            </div>
          ))}
          
          {!atLimit && (
            <a 
              href={route} 
              className="flex items-center justify-center gap-2 mt-4 p-4 bg-slate-700/50 hover:bg-slate-700/70 text-white rounded-lg font-semibold border-2 border-dashed border-slate-600 hover:border-blue-500 transition-all"
            >
              <span className="text-2xl">➕</span>
              <span>Create New Game</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}