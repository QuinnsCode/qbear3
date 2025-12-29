// app/components/CardGame/CardGameBoard/MiddleRow/BattlefieldView.tsx
'use client'

import MainViewer from '@/app/components/CardGame/CardGameBoard/legacy/MainViewer'
import CardSearch from '@/app/components/CardGame/CardGameBoard/MiddleRow/CardSearch'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'

interface BattlefieldViewProps {
  cardGameId: string
  viewedPlayer: MTGPlayer
  isCurrentPlayer: boolean
  gameState: CardGameState
  hoveredCard: string | null
  viewingZone: { playerId: string, zone: string } | null
  onCloseZone: () => void
  onHoverCard: (cardId: string | null) => void
  onBattlefieldScroll?: (scrollLeft: number, scrollTop: number) => void
  onDropCard: (cardId: string, fromZone: string, position: { x: number, y: number }) => Promise<void>
  onCardSelect: (card: any) => void
  showCardSearch: boolean
  cardSearchWidth: number
}

export default function BattlefieldView({
  cardGameId,
  viewedPlayer,
  isCurrentPlayer,
  gameState,
  hoveredCard,
  viewingZone,
  onCloseZone,
  onHoverCard,
  onBattlefieldScroll,
  onDropCard,
  onCardSelect,
  showCardSearch,
  cardSearchWidth
}: BattlefieldViewProps) {
  return (
    <>
      {/* Battlefield */}
      <div className="flex-1 bg-slate-700 rounded-bl-lg overflow-hidden">
        <MainViewer
          // ... props
        />
      </div>

      {/* Card Search Panel */}
      {showCardSearch && (
        <div 
          className="bg-slate-800 rounded-br-lg overflow-hidden flex-shrink-0"
          style={{ width: `${cardSearchWidth}px` }}
        >
          <CardSearch 
            hoveredCard={hoveredCard}
            onCardSelect={onCardSelect}
          />
        </div>
      )}

      {/* Collapsed panel tab */}
      {!showCardSearch && (
        <button
          onClick={() => {/* TODO: handle reopen */}}
          className="w-8 bg-slate-800 rounded-br-lg hover:bg-slate-700 transition-colors flex items-center justify-center"
        >
          <span className="text-slate-400 text-xs [writing-mode:vertical-lr] rotate-180">Search</span>
        </button>
      )}
    </>
  )
}