// app/components/CardGame/OpponentPanel.tsx
'use client'

import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface Props {
  player: MTGPlayer
  position: 'north' | 'west' | 'east'
  isSelected: boolean
  onClick: () => void
  onViewZone: (zone: string) => void
}

export default function OpponentPanel({ player, position, isSelected, onClick, onViewZone }: Props) {
  return (
    <div 
      className={`h-full p-2 cursor-pointer transition-all ${
        isSelected ? 'bg-blue-900/50 ring-2 ring-blue-500' : 'hover:bg-slate-700'
      }`}
      onClick={onClick}
    >
      {/* Player header */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
          style={{ backgroundColor: player.cursorColor }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">{player.name}</p>
          <p className="text-xs text-gray-400">{position}</p>
        </div>
        <div className="text-red-400 font-bold text-sm">
          💚 {player.life}
        </div>
      </div>
      
      {/* Zone counts - compact */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <button
          onClick={(e) => { e.stopPropagation(); onViewZone('library'); }}
          className="bg-slate-700 hover:bg-slate-600 rounded p-1 text-center transition-colors"
        >
          <p className="text-gray-400">📚</p>
          <p className="text-blue-400 font-bold">{player.zones.library.length}</p>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewZone('hand'); }}
          className="bg-slate-700 hover:bg-slate-600 rounded p-1 text-center transition-colors"
        >
          <p className="text-gray-400">🃏</p>
          <p className="text-green-400 font-bold">{player.zones.hand.length}</p>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewZone('graveyard'); }}
          className="bg-slate-700 hover:bg-slate-600 rounded p-1 text-center transition-colors"
        >
          <p className="text-gray-400">🪦</p>
          <p className="text-purple-400 font-bold">{player.zones.graveyard.length}</p>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewZone('exile'); }}
          className="bg-slate-700 hover:bg-slate-600 rounded p-1 text-center transition-colors"
        >
          <p className="text-gray-400">💫</p>
          <p className="text-red-400 font-bold">{player.zones.exile.length}</p>
        </button>
      </div>
      
      {/* Deck status */}
      <div className="mt-2 text-center">
        {player.deckList ? (
          <span className="text-xs text-green-400">✅ Deck</span>
        ) : (
          <span className="text-xs text-gray-500">No deck</span>
        )}
      </div>
      
      {isSelected && (
        <div className="mt-2 text-center text-xs text-blue-400">
          👁️ Viewing
        </div>
      )}
    </div>
  )
}