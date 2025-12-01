// app/components/CardGame/Mobile/MobileFloatingButtons.tsx
'use client'

import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface Props {
  player: MTGPlayer
  onOpenZones: () => void
  onOpenHand: () => void
  spectatorMode?: boolean
}

export default function MobileFloatingButtons({
  player,
  onOpenZones,
  onOpenHand,
  spectatorMode = false
}: Props) {
  return (
    <>
      {/* Hand Button - Bottom Left */}
      <button
        onClick={onOpenHand}
        className="absolute bottom-4 left-4 z-30 bg-slate-700 hover:bg-slate-600 rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-xl border-2 border-slate-500"
      >
        <span className="text-2xl">🃏</span>
        <span className="text-green-400 text-xs font-bold">{player.zones.hand.length}</span>
      </button>

      {/* Zones Button - Bottom Right */}
      <button
        onClick={onOpenZones}
        className="absolute bottom-4 right-4 z-30 bg-blue-700 hover:bg-blue-600 rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-xl border-2 border-blue-500"
      >
        <span className="text-2xl">📚</span>
        <span className="text-blue-200 text-xs font-bold">Zones</span>
      </button>

      {/* Life Total - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-800/90 backdrop-blur-sm rounded-full px-6 py-3 border-2 border-green-500 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💚</span>
          <span className="text-white text-2xl font-bold">{player.life}</span>
        </div>
      </div>
    </>
  )
}