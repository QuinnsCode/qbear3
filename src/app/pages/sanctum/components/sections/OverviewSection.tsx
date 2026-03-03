// app/pages/sanctum/components/sections/OverviewSection.tsx
'use client'

import { Home, Package, Gamepad2, Users, Swords } from 'lucide-react'

interface Props {
  stats: {
    deckCount: number
    gameCount: number
    friendCount: number
  }
  currentTier: string
  organizationName?: string
  userName?: string
}

export function OverviewSection({ stats, currentTier, organizationName, userName }: Props) {
  const tierConfig: Record<string, { icon: string; name: string; color: string }> = {
    free: { icon: '🏕️', name: 'Free', color: '#78716c' },
    starter: { icon: '⚔️', name: 'Starter', color: '#f59e0b' },
    pro: { icon: '👑', name: 'Pro', color: '#eab308' }
  }

  const tier = tierConfig[currentTier] || tierConfig.free

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <Home className="w-8 h-8 md:w-12 md:h-12 text-white flex-shrink-0" />
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white">Welcome Back!</h1>
            <p className="text-sm md:text-base text-blue-100 mt-1">{organizationName || 'Your Dashboard'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-4 md:mt-6">
          <div
            className="px-3 md:px-4 py-2 rounded-lg border-2 bg-black/20"
            style={{ borderColor: tier.color }}
          >
            <span className="text-lg md:text-xl mr-2">{tier.icon}</span>
            <span className="text-sm md:text-base font-semibold text-white">{tier.name} Tier</span>
          </div>
          {currentTier === 'free' && (
            <a
              href="/pricing"
              className="px-3 md:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm md:text-base font-semibold transition-colors"
            >
              Upgrade
            </a>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Package className="w-10 h-10 text-blue-400" />
            <div>
              <div className="text-3xl font-bold text-white">{stats.deckCount}</div>
              <div className="text-sm text-gray-400">Decks</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Gamepad2 className="w-10 h-10 text-purple-400" />
            <div>
              <div className="text-3xl font-bold text-white">{stats.gameCount}</div>
              <div className="text-sm text-gray-400">Games</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Users className="w-10 h-10 text-green-400" />
            <div>
              <div className="text-3xl font-bold text-white">{stats.friendCount}</div>
              <div className="text-sm text-gray-400">Friends</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/deckBuilder"
            className="flex flex-col items-center gap-3 p-6 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-all hover:scale-105 shadow-md"
          >
            <Package className="w-8 h-8" />
            <span>Build Deck</span>
          </a>

          <a
            href="/cardGame"
            className="flex flex-col items-center gap-3 p-6 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-all hover:scale-105 shadow-md"
          >
            <Gamepad2 className="w-8 h-8" />
            <span>New Game</span>
          </a>

          <a
            href="/pvp"
            className="flex flex-col items-center gap-3 p-6 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold transition-all hover:scale-105 shadow-md"
          >
            <Swords className="w-8 h-8" />
            <span>PVP Arena</span>
          </a>

          <a
            href="/draft"
            className="flex flex-col items-center gap-3 p-6 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-semibold transition-all hover:scale-105 shadow-md"
          >
            <span className="text-3xl">📦</span>
            <span>Draft</span>
          </a>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Account Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/50 rounded border border-slate-600">
            <div className="text-sm text-gray-400 mb-1">Player Name</div>
            <div className="text-lg font-semibold text-white">{userName || 'Guest'}</div>
          </div>
          <div className="p-4 bg-slate-700/50 rounded border border-slate-600">
            <div className="text-sm text-gray-400 mb-1">Organization</div>
            <div className="text-lg font-semibold text-white">{organizationName || 'None'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
