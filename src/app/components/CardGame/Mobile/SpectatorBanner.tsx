// app/components/CardGame/Mobile/SpectatorBanner.tsx
'use client'

import { useState, useEffect } from 'react'
import { Eye, ChevronDown, ChevronUp } from 'lucide-react'

interface SpectatorBannerProps {
  onSelectPlayer: (playerId: string) => void
  players: Array<{ id: string; name: string; cursorColor: string; life: number }>
}

export default function SpectatorBanner({ onSelectPlayer, players }: SpectatorBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [lastMinimizedTime, setLastMinimizedTime] = useState<number | null>(null)

  // Auto-expand after 3 minutes if minimized
  useEffect(() => {
    if (!isExpanded && lastMinimizedTime) {
      const timer = setTimeout(() => {
        setIsExpanded(true)
      }, 3 * 60 * 1000) // 3 minutes

      return () => clearTimeout(timer)
    }
  }, [isExpanded, lastMinimizedTime])

  const handleToggle = () => {
    if (isExpanded) {
      setLastMinimizedTime(Date.now())
    }
    setIsExpanded(!isExpanded)
  }

  if (!isExpanded) {
    // Minimized button at bottom middle
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-purple-400/50 flex items-center gap-2 transition-all"
      >
        <Eye className="w-5 h-5" />
        <span className="font-semibold">Spectator Mode</span>
        <ChevronUp className="w-4 h-4" />
      </button>
    )
  }

  // Expanded banner at bottom
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-800/95 backdrop-blur-sm border-t-2 border-purple-500/50 shadow-2xl">
      <div className="p-4 max-w-2xl mx-auto">
        {/* Header with minimize button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            <span className="text-white font-bold">Spectator Mode</span>
          </div>
          <button
            onClick={handleToggle}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Player selection */}
        <div className="mb-4">
          <p className="text-slate-300 text-sm mb-3">Choose a player to watch:</p>
          <div className="grid grid-cols-1 gap-2">
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-3"
              >
                <div
                  className="w-3 h-3 rounded-full border border-white"
                  style={{ backgroundColor: p.cursorColor }}
                />
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  💚 {p.life}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Auth buttons */}
        <div className="flex gap-3">
          <a
            href="/user/login"
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-colors text-center text-sm"
          >
            Log In
          </a>
          <a
            href="/user/signup"
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-semibold rounded-lg transition-colors text-center text-sm"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}
