// app/components/CardGame/CardGameBoard/BattlefieldMinimap/PlayerSector.tsx
'use client'

import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface PlayerSectorProps {
  player: MTGPlayer
  angle: number
  isActive: boolean
  totalPlayers: number
  onClick: () => void
}

export function PlayerSector({ 
  player, 
  angle, 
  isActive, 
  totalPlayers,
  onClick 
}: PlayerSectorProps) {
  // Calculate position on circle (radius from center)
  const radius = 180
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  
  return (
    <div
      className={`
        absolute transition-all duration-300 cursor-pointer
        ${isActive ? 'z-20' : 'z-10'}
      `}
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) ${isActive ? 'scale(1.2)' : 'scale(1)'}`,
      }}
      onClick={onClick}
    >
      {/* Player Card/Badge */}
      <div
        className={`
          w-24 h-24 rounded-full flex flex-col items-center justify-center
          transition-all duration-300 border-4
          ${isActive 
            ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50' 
            : 'bg-slate-700 border-slate-500 hover:border-slate-400'
          }
        `}
      >
        {/* Player Name */}
        <div className="text-white font-bold text-sm text-center px-2 truncate w-full">
          {player.name}
        </div>
        
        {/* Life Total */}
        <div className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-green-400'}`}>
          {player.life}
        </div>
        
        {/* Card Counts */}
        <div className="text-xs text-gray-300 flex gap-2">
          <span>🃏 {player.zones.hand.length}</span>
          <span>⚔️ {player.zones.battlefield.length}</span>
        </div>
      </div>
    </div>
  )
}