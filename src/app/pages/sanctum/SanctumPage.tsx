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
import { SanctumStyles } from "@/app/styles/SanctumStyles";

export default async function SanctumPage({ ctx, request }: RequestInfo) {
  const orgSlug = extractOrgFromSubdomain(request);
  let usersFirstOrgSlugFound = null;

  // ✅ Check subscription tier
  let currentTier = 'free';
  let subscriptionStatus = null;
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
        stripeSubscription: true // ✅ NEW - also check Stripe
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

  // Check Discord status
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
  
  // Redirect to first org if no subdomain
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

  // Fetch active games
  const activeGames = orgSlug ? await getOrgGames(orgSlug) : [];
  const activeCardGames = orgSlug ? await getOrgCardGames(orgSlug) : [];
  
  // ✅ NEW: Fetch user's decks
  let userDecks: any[] = [];
  if (ctx.user?.id) {
    const { decks } = await getUserDecks(ctx.user.id);
    userDecks = decks;
  }

  // Main actions for left sidebar
  const mainActions = [
    { id: 'friends', label: 'Friends', action: '#', icon: '👥' },
    { id: 'add-friend', label: 'Add a Friend', action: '#', icon: '➕' },
    { id: 'game-invites', label: 'Game Invites', action: '#', icon: '🎮' },
    { id: 'invite-pvp', label: 'Invite Friend to PVP', action: '#', icon: '⚔️' },
    { id: 'watch-games', label: 'Watch Games', action: '#', icon: '👁️' },
    { id: 'play-game', label: 'Play Game', action: '/game', icon: '🎮' }
  ];

  return (
    <>
      <SanctumStyles />
      <div className="sanctum-container">
        <div className="ambient-glow" />

        <div className="main-wrapper">
          <div className="content-wrapper">
            <div className="book-frame-placeholder">
              <div className="corner-decoration top-left" />
              <div className="corner-decoration top-right" />
              <div className="corner-decoration bottom-left" />
              <div className="corner-decoration bottom-right" />
            </div>

            <div className="parchment-background">
              <div className="book-binding">
                {[20, 35, 65, 80].map((percent, i) => (
                  <div key={i} className="binding-stud" style={{ top: `${percent}%` }} />
                ))}
              </div>

              {!orgSlug ? (
                <NoOrgSelected firstOrgSlug={usersFirstOrgSlugFound} />
              ) : (
                <div className="page-grid">
                  <LeftPage 
                    ctx={ctx}
                    mainActions={mainActions}
                    hasDiscord={hasDiscord}
                    currentTier={currentTier}
                    subscriptionStatus={subscriptionStatus}
                  />
                  <RightPage
                    orgSlug={orgSlug}
                    activeGames={activeGames}
                    activeCardGames={activeCardGames}
                    userDecks={userDecks} 
                    currentTier={currentTier}
                    tierLimits={tierLimits}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Subcomponents
function NoOrgSelected({ firstOrgSlug }: { firstOrgSlug: string | null }) {
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <h2 className="section-title">No org selected!</h2>
      <p className="sanctum-subtitle">
        We need to list your orgs or you can add in your subdomain from creation!
      </p>
      {firstOrgSlug && (
        <div className="status-box" style={{ marginTop: '16px' }}>
          Your first org slug: <strong>{firstOrgSlug}</strong>
        </div>
      )}
    </div>
  );
}

function LeftPage({ ctx, mainActions, hasDiscord, currentTier, subscriptionStatus }: any) {
  // Tier display config
  const tierConfig: Record<string, { icon: string; name: string; color: string }> = {
    free: { icon: '🏕️', name: 'Free', color: '#78716c' },
    starter: { icon: '⚔️', name: 'Starter', color: '#f59e0b' },
    pro: { icon: '👑', name: 'Pro', color: '#eab308' }
  };
  
  const tier = tierConfig[currentTier] || tierConfig.free;
  
  return (
    <div className="left-page">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="sanctum-title">Sanctum</h1>
        <div className="sanctum-subtitle">
          {ctx.organization?.name || 'Your Lair'} • {ctx.user?.name?.split(' ')[0] || 'Adventurer'}
        </div>
        <div className="sanctum-divider" />
      </div>

      {/* ✅ Subscription Tier Badge */}
      <div style={{ 
        marginBottom: '20px',
        padding: '12px',
        background: 'rgba(251, 191, 36, 0.1)',
        border: `2px solid ${tier.color}`,
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>{tier.icon}</span>
          <div>
            <div style={{ fontWeight: 'bold', color: tier.color }}>{tier.name} Tier</div>
            {currentTier === 'free' && (
              <div style={{ fontSize: '11px', color: '#92400e' }}>
                Limited features
              </div>
            )}
          </div>
        </div>
        {currentTier === 'free' && (
          <a 
            href="/pricing" 
            style={{ 
              padding: '6px 12px',
              background: tier.color,
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              textDecoration: 'none'
            }}
          >
            Upgrade
          </a>
        )}
      </div>

      {/* Social Actions */}
      <SanctumClientActions userId={ctx.user?.id} mainActions={mainActions} />
      
      {/* Coming Soon Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Quick Actions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="coming-soon">
          {mainActions.slice(3, 5).map((action: any) => (
            <div key={action.id} className="action-button">
              <span className="action-button-icon">{action.icon}</span>
              {action.label}
            </div>
          ))}
        </div>
      </div>

      {/* Player Status */}
      <div className="status-box">
        <h3 className="status-title">Your Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="status-item">
            <span>Role:</span>
            <span style={{ fontWeight: '500' }}>
              {ctx.userRole === 'admin' ? 'Lair Master' : ctx.userRole === 'owner' ? 'Grand Master' : 'Adventurer'}
            </span>
          </div>
          <div className="status-item">
            <span>Lair:</span>
            <span style={{ fontWeight: '500' }}>{ctx.organization?.name || 'None'}</span>
          </div>
          <div className="status-item">
            <span>Subscription:</span>
            <span style={{ fontWeight: '500', color: tier.color }}>
              {tier.icon} {tier.name}
            </span>
          </div>
        </div>
      </div>

      <DiscordConnect isConnected={hasDiscord} />

      {/* Footer */}
      <div className="footer-nav">
        <a href="/" className="footer-link">← Return Home</a>
      </div>
    </div>
  );
}

function RightPage({ orgSlug, activeGames, activeCardGames, userDecks, currentTier, tierLimits }: any) {
  const atGameLimit = activeCardGames.length >= tierLimits.maxGames;
  const atDeckLimit = userDecks.length >= tierLimits.maxDecks; // ✅ NEW
  
  return (
    <div className="right-page">
      {/* ✅ NEW: Deck Section FIRST (above games) */}
      <DeckSection
        decks={userDecks}
        currentTier={currentTier}
        maxDecks={tierLimits.maxDecks}
        atLimit={atDeckLimit}
      />
      
      {/* Games Section */}
      <GameSection 
        games={activeCardGames} 
        type="cardGame" 
        orgSlug={orgSlug}
        currentTier={currentTier}
        tierLimits={tierLimits}
        atLimit={atGameLimit}
      />
      
      {/* Placeholder activity */}
      <div className="placeholder-blur">
        <h3 className="status-title">Recent Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', marginBottom: '20px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: '8px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '4px', border: '1px solid rgba(180, 83, 9, 0.2)' }}>
              <div style={{ color: '#a16207', fontWeight: '500' }}>Activity placeholder</div>
              <div style={{ color: '#92400e' }}>Details coming soon...</div>
            </div>
          ))}
        </div>
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
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 className="section-title">
          {title} ({games.length}/{tierLimits.maxGames})
        </h2>
      </div>
      
      {/* ✅ Upgrade prompt if at limit */}
      {atLimit && currentTier !== 'pro' && (
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #dc2626',
          borderRadius: '8px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '4px' }}>
            🚨 Game Limit Reached
          </div>
          <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '8px' }}>
            You've reached your limit of {tierLimits.maxGames} {tierLimits.maxGames === 1 ? 'game' : 'games'}.
            {currentTier === 'free' && ' Upgrade to Starter for 5 games ($1/mo)'}
            {currentTier === 'starter' && ' Upgrade to Pro for 10 games ($5/mo)'}
          </div>
          <a 
            href="/pricing"
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              textDecoration: 'none'
            }}
          >
            Upgrade Now →
          </a>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <div className="empty-state-title">No Active {title}</div>
            <div className="empty-state-text">Start a new {isCardGame ? 'card game' : 'game'} to begin</div>
            <a href={route} className="empty-state-button">
              Create {isCardGame ? 'Card Game' : 'Game'}
            </a>
          </div>
        ) : (
          <>
            {games.map((game: any) => (
              <div key={game[idField]} className="game-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="game-card-title">{game.name}</span>
                  <span className="game-card-badge">{isCardGame ? 'Card Game' : 'Strategy'}</span>
                </div>
                <div className="game-card-date">
                  Created {new Date(game.createdAt).toLocaleDateString()}
                </div>
                <div className="game-card-footer">
                  <span style={{ color: '#d97706' }}>Players: {game.playerCount}/{tierLimits.maxPlayers}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <a href={`${route}/${game[idField]}`} className="game-link">
                      Enter →
                    </a>
                    {!isCardGame && (
                      <SanctumDeleteGameButton
                        gameId={game[idField]}
                        gameName={game.name}
                        orgSlug={orgSlug}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* ✅ Only show create button if under limit */}
            {!atLimit && (
              <a href={route} className="create-game-button">
                <span className="create-game-icon">➕</span>
                Create New {isCardGame ? 'Card Game' : 'Game'}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}