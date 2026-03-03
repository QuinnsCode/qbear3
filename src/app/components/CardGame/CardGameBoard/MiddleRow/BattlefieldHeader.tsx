// app/components/CardGame/CardGameBoard/MiddleRow/BattlefieldHeader.tsx
'use client'

import { Heart, Maximize2, Minimize2 } from 'lucide-react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface BattlefieldHeaderProps {
  player: MTGPlayer
  isCurrentPlayer: boolean
  spectatorMode: boolean
  isLargeBattlefieldView: boolean
  onToggleLargeView?: () => void
  onOpenLifeTracker?: () => void
  onOpenMinimap?: () => void
}

export default function BattlefieldHeader({
  player,
  isCurrentPlayer,
  spectatorMode,
  isLargeBattlefieldView,
  onToggleLargeView,
  onOpenLifeTracker,
  onOpenMinimap
}: BattlefieldHeaderProps) {
  return (
    <div className={`flex items-center justify-between transition-all ${
      isLargeBattlefieldView ? 'mb-2' : 'mb-4'
    }`}>
      {/* Left: Player name & color */}
      <div className="flex items-center gap-2">
        <div 
          className={`rounded-full border-2 border-white ${
            isLargeBattlefieldView ? 'w-3 h-3' : 'w-4 h-4'
          }`}
          style={{ backgroundColor: player.cursorColor }}
        />
        <h2 className={`text-white font-bold ${
          isLargeBattlefieldView ? 'text-sm' : 'text-base'
        }`}>
          {player.name}'s Battlefield
          {isCurrentPlayer && !spectatorMode && <span className="text-blue-400 ml-2">👤</span>}
          {spectatorMode && <span className="text-purple-400 ml-2">👁️</span>}
        </h2>
      </div>
      
      {/* Center: Controls */}
      <div className="flex items-center gap-2">
        {/* Minimap Button */}
        {onOpenMinimap && !spectatorMode && (
          <button
            onClick={onOpenMinimap}
            className="px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 group bg-blue-700 hover:bg-blue-600 text-white border-blue-600 shadow-lg"
            title="Battlefield Overview (Knights of the Round Table)"
          >
            <span className="text-lg">🗺️</span>
          </button>
        )}
        
        {/* Large View Toggle */}
        {onToggleLargeView && !spectatorMode && (
          <button
            onClick={onToggleLargeView}
            className="px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 group bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
            title={isLargeBattlefieldView ? "Exit Large View" : "Large Battlefield View"}
          >
            {isLargeBattlefieldView ? (
              <Minimize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            ) : (
              <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
          </button>
        )}
      </div>
      
      {/* Right: Life Display/Button */}
      {isCurrentPlayer && !spectatorMode && onOpenLifeTracker ? (
        <button
          onClick={onOpenLifeTracker}
          className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg border border-slate-600 transition-colors"
        >
          <Heart className="w-5 h-5 text-green-500" />
          <span className="text-white text-lg font-bold">{player.life}</span>
        </button>
      ) : (
        <div className={`text-white flex items-center gap-2 ${
          isLargeBattlefieldView ? 'text-sm' : 'text-base'
        }`}>
          <Heart className="w-5 h-5 text-green-500" />
          <span className="font-bold">{player.life}</span>
        </div>
      )}
    </div>
  )
}