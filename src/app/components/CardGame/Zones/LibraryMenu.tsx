// app/components/CardGame/Zones/LibraryMenu.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
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
  onReveal: () => void
  onHandToBattlefieldTapped: () => void
  onPrefetchDecks?: () => void
  spectatorMode?: boolean
  buttonRef: React.RefObject<HTMLButtonElement | null>
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
  onReveal,
  onHandToBattlefieldTapped,
  onPrefetchDecks,
  spectatorMode,
  buttonRef,
  isMobile = false
}: LibraryMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const [menuPositionClass, setMenuPositionClass] = useState<'below' | 'above'>('below')

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      
      // Estimate menu height
      const estimatedMenuHeight = player.deckList ? 450 : 150
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      // Decide if menu should appear above or below
      const shouldShowAbove = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow
      
      setMenuPositionClass(shouldShowAbove ? 'above' : 'below')
      setMenuPosition({
        top: rect.top - 180,
        right: window.innerWidth - rect.right
      })
    }
  }, [isOpen, player.deckList, buttonRef])

  if (!isOpen) return null

  const menuClasses = isMobile
    ? "fixed z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-600 min-w-[160px] max-w-[240px]"
    : `absolute right-0 mt-2 bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-2 min-w-[200px] z-50 max-h-[calc(100vh-20px)] overflow-y-auto ${
        menuPositionClass === 'above' ? 'bottom-full mb-2' : 'top-full'
      }`

  const menuStyle = isMobile
    ? {
        top: `${menuPosition.top}px`,
        right: `${menuPosition.right}px`,
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto' as const,
        scrollbarWidth: 'thin' as const,
        scrollbarColor: '#475569 #1e293b',
      }
    : {
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
              onImportDeck()
              onClose()
            }}
            disabled={spectatorMode}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm disabled:opacity-50"
          >
            📦 Import Deck
          </button>
          <button
            onClick={() => {
              onOpenDeckBuilder()
              onClose()
            }}
            disabled={spectatorMode}
            onMouseEnter={onPrefetchDecks}
            onTouchStart={onPrefetchDecks}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
          >
            🎴 My Decks
          </button>
          
          {player.deckList && (
            <>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onMulligan()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🔄 Mulligan
              </button>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onDrawCards(1)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🃏 Draw 1 Card
              </button>
              <button
                onClick={() => {
                  onDrawX()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🎴 Draw X Cards
              </button>
              <button
                onClick={() => {
                  onDrawCards(7)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🃏 Draw 7 Cards
              </button>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onLibraryToHand()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                📤 Library → Hand
              </button>
              <button 
                onClick={() => {
                  onShuffle()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🔀 Shuffle Library
              </button>
              <button 
                onClick={() => {
                  onMill(3)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                ⚰️ Mill 3 Cards
              </button>
              <button 
                onClick={() => {
                  onReveal()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                👁️ Reveal Top Card
              </button>
              <div className="border-t border-slate-600 my-1"></div>
              <button
                onClick={() => {
                  onHandToBattlefieldTapped()
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🎴 Hand → Battlefield (Tapped)
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}