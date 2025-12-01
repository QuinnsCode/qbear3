// app/components/CardGame/Mobile/MobileOpponentBubble.tsx
'use client'

import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface Props {
  player: MTGPlayer
  onClick: () => void
  isActive?: boolean // Add this
}

export default function MobileOpponentBubble({ player, onClick, isActive = false }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border-2 transition-all ${
        isActive 
          ? 'border-yellow-400 shadow-lg shadow-yellow-500/50' 
          : 'border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Color indicator */}
        <div 
          className="w-3 h-3 rounded-full border border-white flex-shrink-0"
          style={{ backgroundColor: player.cursorColor }}
        />
        
        {/* Name */}
        <div className="text-white text-xs font-semibold truncate flex-1 text-left">
          {player.name}
        </div>
        
        {/* Life */}
        <div className="text-green-400 text-xs font-bold flex-shrink-0">
          💚{player.life}
        </div>
      </div>
      
      {/* Quick stats */}
      <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
        <span>🃏 {player.zones.hand.length}</span>
        <span>⚔️ {player.zones.battlefield.length}</span>
        <span>📜 {player.zones.library.length}</span>
      </div>
    </button>
  )
}