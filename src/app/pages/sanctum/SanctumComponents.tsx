// app/pages/sanctum/SanctumComponents.tsx
import { SanctumDeleteGameButton } from "@/app/components/Sanctum/SanctumDeleteGameButton";
import { SanctumClientActions } from "@/app/pages/sanctum/SanctumClientActions";
import { DiscordConnect } from "@/app/components/Sanctum/DiscordConnect";
import { DeckSection } from "@/app/pages/sanctum/DeckSection";

// ========================================
// LAYOUT COMPONENTS
// ========================================

export function SanctumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-700 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-purple-900/5 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <div className="relative">
          <CornerDecorations />
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl border-2 border-slate-600 shadow-2xl p-8">
            <BookBinding />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerDecorations() {
  return (
    <>
      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-amber-400/40 rounded-tl-lg" />
      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-amber-400/40 rounded-tr-lg" />
      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-amber-400/40 rounded-bl-lg" />
      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-amber-400/40 rounded-br-lg" />
    </>
  );
}

function BookBinding() {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-900/10 to-transparent border-r border-amber-700/20">
      {[20, 35, 65, 80].map((percent, i) => (
        <div 
          key={i} 
          className="absolute left-2 w-2 h-2 bg-amber-500/30 rounded-full shadow-lg"
          style={{ top: `${percent}%` }}
        />
      ))}
    </div>
  );
}

// ========================================
// NO ORG SELECTED
// ========================================

export function NoOrgSelected({ firstOrgSlug }: { firstOrgSlug: string | null }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-3xl font-bold text-white mb-4">No org selected!</h2>
      <p className="text-gray-300 mb-6">
        We need to list your orgs or you can add in your subdomain from creation!
      </p>
      {firstOrgSlug && (
        <div className="inline-block p-4 bg-slate-700/70 rounded-lg border border-slate-600">
          <p className="text-gray-200">
            Your first org slug: <strong className="text-blue-400">{firstOrgSlug}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

// ========================================
// LEFT PAGE
// ========================================

const TIER_CONFIG = {
  free: { icon: '🏕️', name: 'Free', color: '#78716c' },
  starter: { icon: '⚔️', name: 'Starter', color: '#f59e0b' },
  pro: { icon: '👑', name: 'Pro', color: '#eab308' }
} as const;

const MAIN_ACTIONS = [
  { id: 'friends', label: 'Friends', action: '#', icon: '👥' },
  { id: 'add-friend', label: 'Add a Friend', action: '#', icon: '➕' },
  { id: 'game-invites', label: 'Game Invites', action: '#', icon: '🎮' },
  { id: 'invite-pvp', label: 'Invite Friend to PVP', action: '#', icon: '⚔️' },
  { id: 'watch-games', label: 'Watch Games', action: '#', icon: '👁️' },
  { id: 'play-game', label: 'Play Game', action: '/game', icon: '🎮' }
];

interface LeftPageProps {
  ctx: any;
  hasDiscord: boolean;
  currentTier: string;
}

export function LeftPage({ ctx, hasDiscord, currentTier }: LeftPageProps) {
  const tier = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG] || TIER_CONFIG.free;

  return (
    <div className="space-y-6">
      <PageHeader ctx={ctx} />
      <TierBadge tier={tier} currentTier={currentTier} />
      <SanctumClientActions userId={ctx.user?.id} mainActions={MAIN_ACTIONS} />
      <QuickActions actions={MAIN_ACTIONS.slice(3, 5)} />
      <PlayerStatus ctx={ctx} tier={tier} />
      <DiscordConnect isConnected={hasDiscord} />
      <Footer />
    </div>
  );
}

function PageHeader({ ctx }: { ctx: any }) {
  return (
    <div className="mb-6">
      <h1 className="text-4xl font-bold text-white mb-2">Sanctum</h1>
      <div className="text-gray-300 text-lg mb-4">
        {ctx.organization?.name || 'Your Lair'} • {ctx.user?.name?.split(' ')[0] || 'Adventurer'}
      </div>
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-transparent rounded-full" />
    </div>
  );
}

interface TierBadgeProps {
  tier: { icon: string; name: string; color: string };
  currentTier: string;
}

function TierBadge({ tier, currentTier }: TierBadgeProps) {
  return (
    <div 
      className="p-4 rounded-lg border-2 flex justify-between items-center bg-black/10"
      style={{ borderColor: tier.color }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{tier.icon}</span>
        <div>
          <div className="font-bold text-lg text-white">
            {tier.name} Tier
          </div>
          {currentTier === 'free' && (
            <div className="text-xs text-gray-400">
              Limited features
            </div>
          )}
        </div>
      </div>
      {currentTier === 'free' && (
        <a 
          href="/pricing" 
          className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all hover:opacity-90 hover:scale-105"
          style={{ background: tier.color }}
        >
          Upgrade
        </a>
      )}
    </div>
  );
}

function QuickActions({ actions }: { actions: typeof MAIN_ACTIONS }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
      <div className="flex flex-col gap-2 opacity-50 pointer-events-none">
        {actions.map((action) => (
          <div 
            key={action.id} 
            className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600 text-gray-300"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="font-medium">{action.label}</span>
            <span className="ml-auto text-xs bg-slate-600 px-2 py-1 rounded">Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerStatus({ ctx, tier }: { ctx: any; tier: { icon: string; name: string; color: string } }) {
  const roleDisplay = ctx.userRole === 'admin' 
    ? 'Lair Master' 
    : ctx.userRole === 'owner' 
    ? 'Grand Master' 
    : 'Adventurer';

  return (
    <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-4">Your Status</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 bg-slate-700/40 rounded border border-slate-600">
          <span className="text-gray-300 text-sm">Role:</span>
          <span className="font-medium text-white">{roleDisplay}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-slate-700/40 rounded border border-slate-600">
          <span className="text-gray-300 text-sm">Lair:</span>
          <span className="font-medium text-white">{ctx.organization?.name || 'None'}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-slate-700/40 rounded border border-slate-600">
          <span className="text-gray-300 text-sm">Subscription:</span>
          <span className="font-medium flex items-center gap-1 text-white">
            <span>{tier.icon}</span>
            <span>{tier.name}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="pt-4 border-t border-slate-600">
      <a 
        href="/" 
        className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-2"
      >
        <span>←</span>
        <span>Return Home</span>
      </a>
    </div>
  );
}

// ========================================
// RIGHT PAGE
// ========================================

interface RightPageProps {
  orgSlug: string;
  activeCardGames: any[];
  userDecks: any[];
  currentTier: string;
  tierLimits: {
    maxGames: number;
    maxPlayers: number;
    maxDecks: number;
  };
}

export function RightPage({ orgSlug, activeCardGames, userDecks, currentTier, tierLimits }: RightPageProps) {
  const atGameLimit = activeCardGames.length >= tierLimits.maxGames;
  const atDeckLimit = userDecks.length >= tierLimits.maxDecks;

  return (
    <div className="space-y-6">
      <DeckSection
        decks={userDecks}
        currentTier={currentTier}
        maxDecks={tierLimits.maxDecks}
        atLimit={atDeckLimit}
      />
      
      <GameSection 
        games={activeCardGames}
        orgSlug={orgSlug}
        currentTier={currentTier}
        tierLimits={tierLimits}
        atLimit={atGameLimit}
      />
      
      <RecentActivity />
    </div>
  );
}

interface GameSectionProps {
  games: any[];
  orgSlug: string;
  currentTier: string;
  tierLimits: { maxGames: number; maxPlayers: number };
  atLimit: boolean;
}

function GameSection({ games, orgSlug, currentTier, tierLimits, atLimit }: GameSectionProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🎮</span>
          <span>Card Games</span>
        </h2>
        <span className="text-sm bg-slate-700 text-gray-200 px-3 py-1 rounded-full font-medium border border-slate-600">
          {games.length}/{tierLimits.maxGames}
        </span>
      </div>
      
      {atLimit && currentTier !== 'pro' && <GameLimitWarning currentTier={currentTier} tierLimits={tierLimits} />}
      
      <div className="space-y-3">
        {games.length === 0 ? (
          <EmptyGameState />
        ) : (
          <>
            {games.map((game) => (
              <GameCard key={game.cardGameId} game={game} orgSlug={orgSlug} tierLimits={tierLimits} />
            ))}
            {!atLimit && <CreateGameButton />}
          </>
        )}
      </div>
    </div>
  );
}

function GameLimitWarning({ currentTier, tierLimits }: { currentTier: string; tierLimits: { maxGames: number } }) {
  const upgradeMessage = currentTier === 'free' 
    ? 'Upgrade to Starter for 5 games ($1/mo)'
    : 'Upgrade to Pro for 10 games ($5/mo)';

  return (
    <div className="mb-4 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg">
      <div className="font-bold text-red-400 mb-2 flex items-center gap-2">
        <span>🚨</span>
        <span>Game Limit Reached</span>
      </div>
      <div className="text-sm text-red-300 mb-3">
        You've reached your limit of {tierLimits.maxGames} {tierLimits.maxGames === 1 ? 'game' : 'games'}.
        {' '}{upgradeMessage}
      </div>
      <a 
        href="/pricing"
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors"
      >
        <span>Upgrade Now</span>
        <span>→</span>
      </a>
    </div>
  );
}

function EmptyGameState() {
  return (
    <div className="text-center py-12 bg-slate-800/30 rounded-lg border-2 border-dashed border-slate-600">
      <div className="text-6xl mb-4">🎮</div>
      <div className="text-xl font-semibold text-gray-200 mb-2">No Active Card Games</div>
      <div className="text-gray-400 mb-6">Start a new card game to begin</div>
      <a 
        href="/cardGame" 
        className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg"
      >
        Create Card Game
      </a>
    </div>
  );
}

interface GameCardProps {
  game: any;
  orgSlug: string;
  tierLimits: { maxPlayers: number };
}

function GameCard({ game, orgSlug, tierLimits }: GameCardProps) {
  return (
    <div className="bg-slate-700/70 rounded-lg border border-slate-600 p-4 hover:border-blue-500 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
        <span className="text-lg font-bold text-white">{game.name}</span>
        <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 text-purple-300 rounded-full text-xs font-semibold">
          Card Game
        </span>
      </div>
      <div className="text-sm text-gray-300 mb-3">
        Created {new Date(game.createdAt).toLocaleDateString()}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-amber-400 text-sm font-medium">
          Players: {game.playerCount}/{tierLimits.maxPlayers}
        </span>
        <a 
          href={`/cardGame/${game.cardGameId}`} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          Enter →
        </a>
      </div>
    </div>
  );
}

function CreateGameButton() {
  return (
    <a 
      href="/cardGame" 
      className="flex items-center justify-center gap-3 p-4 bg-slate-700/40 hover:bg-slate-700/60 text-white rounded-lg font-semibold border-2 border-dashed border-slate-600 hover:border-blue-500 transition-all group"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
      <span>Create New Card Game</span>
    </a>
  );
}

function RecentActivity() {
  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-600 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 to-transparent pointer-events-none" />
      <h3 className="text-lg font-bold text-white mb-4 relative z-10">Recent Activity</h3>
      <div className="space-y-2 relative z-10">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className="p-3 bg-amber-900/10 border border-amber-700/20 rounded-lg"
          >
            <div className="text-amber-500 font-medium text-sm">Activity placeholder</div>
            <div className="text-amber-700 text-xs">Details coming soon...</div>
          </div>
        ))}
      </div>
    </div>
  );
}