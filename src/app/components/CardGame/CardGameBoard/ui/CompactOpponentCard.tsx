// app/components/CardGame/CardGameBoard//ui/CompactOpponentCard.tsx
'use client'

import { useState } from 'react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface CompactOpponentCardProps {
  player: MTGPlayer
  isCollapsed: boolean
  isSelected: boolean
  onClick: () => void
  onViewZone: (zone: string) => void
}

export default function CompactOpponentCard({
  player,
  isCollapsed,
  isSelected,
  onClick,
  onViewZone
}: CompactOpponentCardProps) {
  const [showHover, setShowHover] = useState(false)

  if (isCollapsed) {
    // Collapsed state: Just name (truncated) + colored dot
    return (
      <div
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
        className="relative"
      >
        <button
          onClick={onClick}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: player.cursorColor }}
          />
          <span className="text-sm font-medium truncate max-w-[100px]">
            {player.name}
          </span>
          <span className="text-xs opacity-75">❤️ {player.life}</span>
        </button>

        {/* Hover card with zone info */}
        {showHover && (
          <div className="absolute top-full left-0 mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-3 z-50 min-w-[200px]">
            <div className="text-sm font-semibold text-white mb-2">{player.name}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Life:</span>
                <span className="text-green-400 font-bold">{player.life}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Hand:</span>
                <span>{player.zones.hand.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Library:</span>
                <span>{player.zones.library.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Graveyard:</span>
                <span>{player.zones.graveyard.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Battlefield:</span>
                <span>{player.zones.battlefield.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Expanded state: Full OpponentPanel
  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-lg p-3 transition-all ${
        isSelected
          ? 'bg-blue-900/50 border-2 border-blue-500'
          : 'bg-slate-800 border-2 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: player.cursorColor }}
          />
          <span className="text-white font-semibold text-sm">{player.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xl">❤️</span>
          <span className="text-green-400 font-bold text-lg">{player.life}</span>
        </div>
      </div>

      {/* Zone counts */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between text-slate-300">
          <span>🃏 Hand</span>
          <span className="font-semibold">{player.zones.hand.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>📚 Library</span>
          <span className="font-semibold">{player.zones.library.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>⚰️ Graveyard</span>
          <span className="font-semibold">{player.zones.graveyard.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>⚔️ Board</span>
          <span className="font-semibold">{player.zones.battlefield.length}</span>
        </div>
      </div>
    </button>
  )
}