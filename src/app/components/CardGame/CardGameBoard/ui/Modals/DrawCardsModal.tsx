// @/app/components/CardGame/CardGameBoard/ui/Modals/DrawCardsModal.tsx
'use client'

import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface DrawCardsModalProps {
  isOpen: boolean
  drawCount: number
  setDrawCount: (count: number) => void
  onDraw: (count: number) => void
  onClose: () => void
  player: MTGPlayer
}

export default function DrawCardsModal({
  isOpen,
  drawCount,
  setDrawCount,
  onDraw,
  onClose,
  player
}: DrawCardsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-600 p-6 w-80">
        <h3 className="text-white text-xl font-bold mb-4">Draw Cards</h3>
        
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setDrawCount(Math.max(1, drawCount - 1))}
            className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
          >
            -
          </button>
          
          <input
            type="number"
            min="1"
            max={player.zones.library.length}
            value={drawCount}
            onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 h-12 bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-center text-2xl font-bold focus:outline-none focus:border-blue-500"
          />
          
          <button
            onClick={() => setDrawCount(Math.min(player.zones.library.length, drawCount + 1))}
            className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
          >
            +
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setDrawCount(Math.min(player.zones.library.length, drawCount + 5))}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold transition-colors"
          >
            +5
          </button>
          <button
            onClick={() => setDrawCount(Math.min(player.zones.library.length, drawCount + 10))}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold transition-colors"
          >
            +10
          </button>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-3 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onDraw(drawCount)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-bold transition-colors"
          >
            Draw {drawCount}
          </button>
        </div>
      </div>
    </div>
  )
}