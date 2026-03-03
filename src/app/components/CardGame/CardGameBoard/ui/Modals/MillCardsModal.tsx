// @/app/components/CardGame/CardGameBoard/ui/Modals/MillCardsModal.tsx
'use client'

import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface MillCardsModalProps {
  isOpen: boolean
  millCount: number
  setMillCount: (count: number) => void
  onMill: (count: number) => void
  onClose: () => void
  player: MTGPlayer
}

export default function MillCardsModal({
  isOpen,
  millCount,
  setMillCount,
  onMill,
  onClose,
  player
}: MillCardsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-600 p-6 w-80">
        <h3 className="text-white text-xl font-bold mb-4">Mill Cards</h3>

        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setMillCount(Math.max(1, millCount - 1))}
            className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
          >
            -
          </button>

          <input
            type="number"
            min="1"
            max={player.zones.library.length}
            value={millCount}
            onChange={(e) => setMillCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 h-12 bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-center text-2xl font-bold focus:outline-none focus:border-red-500"
          />

          <button
            onClick={() => setMillCount(Math.min(player.zones.library.length, millCount + 1))}
            className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
          >
            +
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMillCount(Math.min(player.zones.library.length, millCount + 5))}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold transition-colors"
          >
            +5
          </button>
          <button
            onClick={() => setMillCount(Math.min(player.zones.library.length, millCount + 10))}
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
            onClick={() => onMill(millCount)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-bold transition-colors"
          >
            Mill {millCount}
          </button>
        </div>
      </div>
    </div>
  )
}
