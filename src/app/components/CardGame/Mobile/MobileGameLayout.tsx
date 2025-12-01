// app/components/CardGame/Mobile/MobileGameLayout.tsx
'use client'

import { useState } from 'react'
import type { CardGameState, MTGPlayer } from '@/app/services/cardGame/CardGameState'
import { BattlefieldContainer } from '../Battlefield/BattlefieldContainer'
import MobileZoneDrawer from './MobileZoneDrawer'
import MobileOpponentBubble from './MobileOpponentBubble'
import MobileFloatingButtons from './MobileFloatingButtons'
import CardGameMenu from '../CardGameMenu'
import { Deck } from '@/app/types/Deck'

interface Props {
  gameState: CardGameState
  currentPlayer: MTGPlayer
  cardGameId: string
  gameName: string // ADD THIS
  spectatorMode?: boolean
  // Deck props
  decks?: Deck[]
  userId?: string,
  onCreateDeck?: (deckList: string, deckName: string) => Promise<void>
  onDeleteDeck?: (deckId: string) => Promise<void>
  onSelectDeck?: (deckId: string) => void
  onEditDeck?: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  initialThreadUrl?: string | null // ADD THIS
}

export default function MobileGameLayout({
  gameState,
  currentPlayer,
  cardGameId,
  gameName, // ADD THIS
  spectatorMode = false,
  decks,
  userId,
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck,
  initialThreadUrl // ADD THIS
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState<'zones' | 'hand' | null>(null)
  const [viewingPlayer, setViewingPlayer] = useState<string>(currentPlayer.id)

  const opponents = gameState.players.filter(p => p.id !== currentPlayer.id)
  const displayedPlayer = gameState.players.find(p => p.id === viewingPlayer) || currentPlayer
  const isViewingSelf = viewingPlayer === currentPlayer.id
  
  // Get battlefield cards for displayed player
  const battlefieldCards = displayedPlayer.zones.battlefield
    .map(id => gameState.cards[id])
    .filter(card => card !== undefined)

  return (
    <div className="h-screen w-screen bg-slate-900 relative overflow-hidden">
      {/* Game Menu - Top Right */}
      {!spectatorMode && (
        <div className="absolute top-2 right-2 z-30">
          <CardGameMenu
            cardGameId={cardGameId}
            gameName={gameName}
            initialThreadUrl={initialThreadUrl}
          />
        </div>
      )}

      {/* Opponent Bubbles - Top */}
      <div className="absolute top-2 left-2 right-16 z-20 flex gap-2">
        {opponents.map(opponent => (
          <MobileOpponentBubble
            key={opponent.id}
            player={opponent}
            isActive={viewingPlayer === opponent.id}
            onClick={() => setViewingPlayer(opponent.id)}
          />
        ))}
      </div>

      {/* Back to Your Board Button - Shows when viewing opponent */}
      {!isViewingSelf && (
        <button
          onClick={() => setViewingPlayer(currentPlayer.id)}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-full font-semibold shadow-lg border-2 border-yellow-400 flex items-center gap-2"
        >
          <span>⚔️</span>
          <span>Your Board</span>
        </button>
      )}

      {/* Player Name Header */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-600">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: displayedPlayer.cursorColor }}
          />
          <span className="text-white font-bold text-sm">
            {displayedPlayer.name}'s Battlefield
            {isViewingSelf && <span className="text-blue-400 ml-1">👤</span>}
          </span>
        </div>
      </div>

      {/* Battlefield - Full Screen */}
      <div className="absolute inset-0 pt-16 pb-24">
        <BattlefieldContainer
          cards={battlefieldCards}
          gameState={gameState}
          cardGameId={cardGameId}
          playerId={displayedPlayer.id}
          isCurrentPlayer={isViewingSelf}
          spectatorMode={spectatorMode || !isViewingSelf}
          onHover={() => {}}
          getCardData={(scryfallId) => {
            for (const p of gameState.players) {
              if (p.deckList?.cardData) {
                const found = p.deckList.cardData.find(c => c.id === scryfallId)
                if (found) return found
              }
            }
            return undefined
          }}
        />
      </div>

      {/* Floating Action Buttons - Bottom (only when viewing self) */}
      {isViewingSelf && (
        <MobileFloatingButtons
          player={currentPlayer}
          onOpenZones={() => setDrawerOpen('zones')}
          onOpenHand={() => setDrawerOpen('hand')}
          spectatorMode={spectatorMode}
        />
      )}

      {/* Zone Drawer */}
      {drawerOpen && (
        <MobileZoneDrawer
          player={currentPlayer}
          gameState={gameState}
          cardGameId={cardGameId}
          type={drawerOpen}
          onClose={() => setDrawerOpen(null)}
          spectatorMode={spectatorMode}
          decks={decks}
          userId={userId}
          onCreateDeck={onCreateDeck}
          onDeleteDeck={onDeleteDeck}
          onSelectDeck={onSelectDeck}
          onEditDeck={onEditDeck}
        />
      )}
    </div>
  )
}