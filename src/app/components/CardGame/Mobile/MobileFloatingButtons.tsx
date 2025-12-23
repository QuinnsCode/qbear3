// app/components/CardGame/Mobile/MobileFloatingButtons.tsx
'use client'

import { useState } from 'react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'
import LifeTracker from '../LifeTracker/LifeTracker'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'

interface Props {
  player: MTGPlayer
  opponents: MTGPlayer[]
  cardGameId: string
  onOpenZones: () => void
  onOpenHand: () => void
  spectatorMode?: boolean
}

export default function MobileFloatingButtons({
  player,
  opponents,
  cardGameId,
  onOpenZones,
  onOpenHand,
  spectatorMode = false
}: Props) {
  const [showLifeTracker, setShowLifeTracker] = useState(false)
  
  const handleLifeChange = async (newLife: number) => {
    if (spectatorMode) return
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'update_life',
        playerId: player.id,
        data: { life: newLife }
      })
    } catch (error) {
      console.error('Failed to update life:', error)
    }
  }

  const handleCountersChange = async (gameStateInfo: string) => {
    if (spectatorMode) return
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'update_game_state_info',
        playerId: player.id,
        data: { gameStateInfo }
      })
    } catch (error) {
      console.error('Failed to sync game state:', error)
    }
  }

  return (
    <>
      {/* Hand Button - Bottom Left */}
      <button
        onClick={onOpenHand}
        className="absolute bottom-4 left-4 z-30 bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 flex items-center gap-2 shadow-xl border border-slate-600 transition-colors"
      >
        <span className="text-2xl">🃏</span>
        <div className="flex flex-col items-start">
          <span className="text-white text-xs font-semibold">Hand</span>
          <span className="text-green-400 text-sm font-bold">{player.zones.hand.length}</span>
        </div>
      </button>

      {/* Zones Button - Bottom Right */}
      <button
        onClick={onOpenZones}
        className="absolute bottom-4 right-4 z-30 bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 flex items-center gap-2 shadow-xl border border-slate-600 transition-colors"
      >
        <span className="text-2xl">📚</span>
        <div className="flex flex-col items-start">
          <span className="text-white text-xs font-semibold">Zones</span>
          <span className="text-blue-400 text-sm font-bold">{player.zones.library.length}</span>
        </div>
      </button>

      {/* Life Tracker Button - Bottom Center */}
      <button
        onClick={() => setShowLifeTracker(true)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 flex items-center gap-2 shadow-xl border border-slate-600 transition-colors"
      >
        <span className="text-2xl">💚</span>
        <div className="flex flex-col items-start">
          <span className="text-white text-xs font-semibold">Life</span>
          <span className="text-green-400 text-sm font-bold">{player.life}</span>
        </div>
      </button>

      {/* Life Tracker Modal */}
      {showLifeTracker && (
        <LifeTracker
          key={`${player.gameStateInfo}-${player.life}`}
          player={player}
          opponents={opponents}
          onLifeChange={handleLifeChange}
          onClose={() => setShowLifeTracker(false)}
          onCountersChange={handleCountersChange}
        />
      )}
    </>
  )
}