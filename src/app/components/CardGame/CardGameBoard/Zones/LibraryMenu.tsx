// app/components/CardGame/CardGameBoard/Zones/LibraryMenu.tsx
'use client'

import { useRef } from 'react'
import {
  Coins,
  Package,
  RotateCcw,
  Library,
  Layers,
  Shuffle,
  Trash2,
  Eye,
  MoveRight
} from 'lucide-react'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface LibraryMenuProps {
  player: MTGPlayer
  isOpen: boolean
  onClose: () => void
  onImportDeck: () => void
  onOpenDeckBuilder: () => void
  onMulligan: () => void
  onDrawCards: (count: number) => void
  onDrawX: () => void
  onLibraryToHand: () => void
  onShuffle: () => void
  onMill: (count: number) => void
  onMillX: () => void
  onReveal: () => void
  onHandToBattlefieldTapped: () => void
  onCreateToken: () => void
  onPrefetchDecks?: () => void
  spectatorMode?: boolean
  isMobile?: boolean
}

export default function LibraryMenu({
  player,
  isOpen,
  onClose,
  onImportDeck,
  onOpenDeckBuilder,
  onMulligan,
  onDrawCards,
  onDrawX,
  onLibraryToHand,
  onShuffle,
  onMill,
  onMillX,
  onReveal,
  onHandToBattlefieldTapped,
  onCreateToken,
  onPrefetchDecks,
  spectatorMode,
  isMobile = false
}: LibraryMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const menuClasses = "fixed z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-600 min-w-[200px] max-w-[280px]"

  const menuStyle = {
    bottom: '80px',
    right: '16px',
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto' as const,
    scrollbarWidth: 'thin' as const,
    scrollbarColor: '#475569 #1e293b',
  }

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 ${isMobile ? 'lg:hidden' : ''}`}
        onClick={onClose}
      />
      <div 
        ref={menuRef}
        className={menuClasses}
        style={menuStyle}
      >
        <div className="p-2">
          <button
            onClick={() => {
              onOpenDeckBuilder()
              onClose()
            }}
            disabled={spectatorMode}
            onMouseEnter={onPrefetchDecks}
            onTouchStart={onPrefetchDecks}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <Package className="w-4 h-4 text-blue-400" />
            <span>My Decks</span>
          </button>

          <button
            onClick={() => {
              onCreateToken()
              onClose()
            }}
            disabled={spectatorMode}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>Create Token</span>
          </button>
          
          {player.deckList && (
            <>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onMulligan()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span>Mulligan</span>
              </button>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onDrawCards(1)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Library className="w-4 h-4 text-blue-400" />
                <span>Draw 1 Card</span>
              </button>
              <button
                onClick={() => {
                  onDrawX()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Draw X Cards</span>
              </button>
              <button
                onClick={() => {
                  onDrawCards(7)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Library className="w-4 h-4 text-blue-400" />
                <span>Draw 7 Cards</span>
              </button>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onLibraryToHand()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <MoveRight className="w-4 h-4 text-green-400" />
                <span>Library → Hand</span>
              </button>
              <button
                onClick={() => {
                  onShuffle()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4 text-purple-400" />
                <span>Shuffle Library</span>
              </button>
              <button
                onClick={() => {
                  onMill(3)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Mill 3 Cards</span>
              </button>
              <button
                onClick={() => {
                  onMillX()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-orange-400" />
                <span>Mill X Cards</span>
              </button>
              <button
                onClick={() => {
                  onReveal()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Reveal Top Card</span>
              </button>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onHandToBattlefieldTapped()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
              >
                <MoveRight className="w-4 h-4 text-green-400" />
                <span>Hand → Battlefield (Tapped)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}