'use client'

import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'

interface Props {
  player: MTGPlayer
  position: 'north' | 'east' | 'south' | 'west'
  isCurrentPlayer: boolean
  gameState: CardGameState
  currentPlayerId: string
}

export default function PlayerZone({ 
  player, 
  position, 
  isCurrentPlayer,
  gameState,
  currentPlayerId
}: Props) {
  return (
    <div className="h-full p-2 flex flex-col">
      {/* Player header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: player.cursorColor }}
          />
          <div>
            <p className="text-white font-semibold text-sm">
              {player.name}
              {isCurrentPlayer && <span className="text-blue-400 ml-2">👤 YOU</span>}
            </p>
            <p className="text-xs text-gray-400">{position}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-red-400 font-bold">💚 {player.life}</p>
        </div>
      </div>
      
      {/* Zone counts */}
      <div className="flex-1 grid grid-cols-2 gap-1 text-xs">
        <div className="bg-slate-700 rounded p-1 text-center">
          <p className="text-gray-400">Library</p>
          <p className="text-blue-400 font-bold">{player.zones.library.length}</p>
        </div>
        <div className="bg-slate-700 rounded p-1 text-center">
          <p className="text-gray-400">Hand</p>
          <p className="text-green-400 font-bold">{player.zones.hand.length}</p>
        </div>
        <div className="bg-slate-700 rounded p-1 text-center">
          <p className="text-gray-400">Battlefield</p>
          <p className="text-yellow-400 font-bold">{player.zones.battlefield.length}</p>
        </div>
        <div className="bg-slate-700 rounded p-1 text-center">
          <p className="text-gray-400">Graveyard</p>
          <p className="text-purple-400 font-bold">{player.zones.graveyard.length}</p>
        </div>
      </div>
      
      {/* Deck status */}
      {player.deckList && (
        <div className="mt-2 text-xs text-green-400 text-center">
          ✅ Deck loaded
        </div>
      )}
    </div>
  )
}