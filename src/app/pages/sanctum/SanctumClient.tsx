// app/pages/sanctum/SanctumClient.tsx
'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar, type Section } from './components/Sidebar'
import { OverviewSection } from './components/sections/OverviewSection'
import { DecksSectionClient } from './components/sections/DecksSectionClient'
import { AnnouncementsSectionClient } from './components/sections/AnnouncementsSectionClient'
import { SocialSection } from './SocialSection'
import type { Deck } from '@/app/types/Deck'

interface Props {
  userDecks: Deck[]
  activeGames: any[]
  friends: any[]
  friendRequests: { incoming: any[]; outgoing: any[] }
  gameInvites: { received: any[]; sent: any[] }
  currentTier: string
  tierLimits: {
    maxGames: number
    maxPlayers: number
    maxDecks: number
  }
  userId: string
  userName?: string
  organizationName?: string
  orgSlug: string
}

export function SanctumClient({
  userDecks,
  activeGames,
  friends,
  friendRequests,
  gameInvites,
  currentTier,
  tierLimits,
  userId,
  userName,
  organizationName,
  orgSlug
}: Props) {
  const [activeSection, setActiveSection] = useState<Section>('announcements')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const renderSection = () => {
    // Features data for announcements
    const features = [
      {
        id: '1',
        category: 'Deck Building',
        items: [
          '🃏 Create unlimited Commander decks (testing account)',
          '🔍 Search for cards by name, type, or ability',
          '📝 Import decks from text lists',
          '🎨 View deck color distribution and mana curve',
          '💾 Save and manage multiple deck versions',
        ]
      },
      {
        id: '2',
        category: 'Card Games',
        items: [
          '🎮 Create multiplayer Commander games',
          '👥 Invite friends to your games',
          '🎲 Sandbox mode for testing without login',
          '♻️ Undo/redo system for mistakes',
          '🔄 Real-time sync across all players',
          '🎯 Track life totals, commander damage, and poison counters',
        ]
      },
      {
        id: '3',
        category: 'Draft System',
        items: [
          '📦 Draft from Vintage Cube',
          '🤖 AI-powered drafting opponents',
          '⚔️ PVP matchmaking after draft',
          '💾 Save drafted decks for later play',
          '🎪 Track active drafts (max 3 concurrent)',
        ]
      },
      {
        id: '4',
        category: 'Social Features',
        items: [
          '👥 Add friends and see their online status',
          '📨 Send and receive game invites',
          '🔔 Friend request notifications',
          '🎮 Join friends\' games directly',
        ]
      },
      {
        id: '5',
        category: 'Organization Features',
        items: [
          '🏰 Create your own lair (organization)',
          '👑 Manage members and roles',
          '🎯 Track games and activity',
          '📊 View organization statistics',
        ]
      },
      {
        id: '6',
        category: 'Coming Soon',
        items: [
          '🎥 Spectator mode improvements',
          '📱 Mobile app',
          '🎨 Custom card skins',
          '🏆 Tournaments and leagues',
          '📈 Player statistics and rankings',
        ]
      }
    ]

    switch (activeSection) {
      case 'announcements':
        return <AnnouncementsSectionClient features={features} />

      case 'overview':
        return (
          <OverviewSection
            stats={{
              deckCount: userDecks.length,
              gameCount: activeGames.length,
              friendCount: friends.length
            }}
            currentTier={currentTier}
            organizationName={organizationName}
            userName={userName}
          />
        )

      case 'decks':
        return (
          <DecksSectionClient
            decks={userDecks}
            userId={userId}
            currentTier={currentTier}
            maxDecks={tierLimits.maxDecks}
            atLimit={userDecks.length >= tierLimits.maxDecks}
          />
        )

      case 'cardGames':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 md:p-6 shadow-xl">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Card Games</h1>
              <p className="text-sm md:text-base text-purple-100 mt-1">Manage your Commander games</p>
            </div>
            <GameSection
              games={activeGames}
              type="cardGame"
              orgSlug={orgSlug}
              currentTier={currentTier}
              tierLimits={tierLimits}
              atLimit={activeGames.length >= tierLimits.maxGames}
            />
          </div>
        )

      case 'social':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4 md:p-6 shadow-xl">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Social</h1>
              <p className="text-sm md:text-base text-green-100 mt-1">Friends and invites</p>
            </div>
            <SocialSection
              userId={userId}
              friends={friends}
              friendRequests={friendRequests}
              gameInvites={gameInvites}
            />
          </div>
        )

      case 'pvp':
        return (
          <div className="space-y-6">
            <a
              href="/pvp"
              className="block bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg p-4 md:p-8 shadow-xl transition-all hover:scale-[1.02]"
            >
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-4">PVP Draft Arena</h1>
              <p className="text-sm md:text-lg text-red-100 mb-4 md:mb-6">
                Draft vs AI, then battle other players in competitive 1v1 matches
              </p>
              <div className="inline-block px-4 md:px-6 py-2 md:py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-base md:text-lg">
                Enter Arena →
              </div>
            </a>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg p-4 md:p-6 shadow-xl">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
              <p className="text-sm md:text-base text-slate-200 mt-1">Account and preferences</p>
            </div>
            <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 md:p-8 text-center">
              <div className="text-5xl md:text-6xl mb-4">⚙️</div>
              <div className="text-lg md:text-xl font-semibold text-gray-200 mb-2">Coming Soon</div>
              <div className="text-sm md:text-base text-gray-400">Settings page under construction</div>
            </div>
          </div>
        )

      default:
        return (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="text-xl text-gray-400">Section not found</div>
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-700">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-800 border-b-2 border-slate-600 z-30 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-white hover:text-blue-400 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Sanctum</h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        organizationName={organizationName}
        userName={userName}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 md:pt-0 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderSection()}
        </div>
      </div>
    </div>
  )
}

// Extracted GameSection component
function GameSection({ games, type, orgSlug, currentTier, tierLimits, atLimit }: any) {
  const isCardGame = type === 'cardGame'
  const route = isCardGame ? '/cardGame' : '/game'
  const idField = isCardGame ? 'cardGameId' : 'gameId'

  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
      {atLimit && currentTier !== 'pro' && (
        <div className="mb-4 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg">
          <div className="font-bold text-red-400 mb-2">🚨 Game Limit Reached</div>
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
          <div className="text-6xl mb-4">🎮</div>
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
  )
}
