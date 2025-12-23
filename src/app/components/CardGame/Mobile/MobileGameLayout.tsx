// app/components/CardGame/Mobile/MobileGameLayout.tsx
'use client'

import { useState } from 'react'
import type { CardGameState, MTGPlayer } from '@/app/services/cardGame/CardGameState'
import { BattlefieldContainer } from '../Battlefield/BattlefieldContainer'
import MobileZoneDrawer from './MobileZoneDrawer'
import MobileOpponentBubble from './MobileOpponentBubble'
import MobileFloatingButtons from './MobileFloatingButtons'
import { Deck } from '@/app/types/Deck'

interface Props {
  gameState: CardGameState
  currentPlayer: MTGPlayer
  cardGameId: string
  gameName: string
  spectatorMode?: boolean
  decks?: Deck[]
  userId?: string,
  onCreateDeck?: (deckList: string, deckName: string) => Promise<void>
  onDeleteDeck?: (deckId: string) => Promise<void>
  onSelectDeck?: (deckId: string) => void
  onEditDeck?: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  isSandbox?: boolean
}

export default function MobileGameLayout({
  gameState,
  currentPlayer,
  cardGameId,
  gameName,
  spectatorMode = false,
  decks,
  userId,
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck,
  isSandbox
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState<'zones' | 'hand' | null>(null)
  const [viewingPlayer, setViewingPlayer] = useState<string | null>(spectatorMode ? null : currentPlayer.id)

  const opponents = gameState.players.filter(p => p.id !== currentPlayer.id)
  const displayedPlayer = viewingPlayer 
    ? gameState.players.find(p => p.id === viewingPlayer) || currentPlayer
    : currentPlayer
  const isViewingSelf = viewingPlayer === currentPlayer.id
  
  // Get battlefield cards for displayed player
  const battlefieldCards = displayedPlayer.zones.battlefield
    .map(id => gameState.cards[id])
    .filter(card => card !== undefined)

  return (
    <div className="h-screen w-screen bg-slate-900 relative overflow-hidden">

      {/* Opponent Bubbles - Top (Horizontal Scrolling) */}
      <div className="absolute top-2 left-2 right-2 z-20">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-2">
            {opponents.map(opponent => (
              <MobileOpponentBubble
                key={opponent.id}
                player={opponent}
                isActive={viewingPlayer === opponent.id}
                onClick={() => setViewingPlayer(opponent.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Player Name Header - Below opponents */}
      {viewingPlayer && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-800/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-600">
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
      )}

      {/* Back to Your Board Button - Shows when viewing opponent */}
      {!isViewingSelf && viewingPlayer && (
        <button
          onClick={() => setViewingPlayer(currentPlayer.id)}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg border border-blue-500 flex items-center gap-2 transition-colors"
        >
          <span>⚔️</span>
          <span>Your Board</span>
        </button>
      )}

      {/* Battlefield - Full Screen */}
      {viewingPlayer && (
        <div className="absolute inset-0 pt-32 pb-28">
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
      )}

      {/* Floating Action Buttons - Bottom (only when viewing self) */}
      {isViewingSelf && (
        <MobileFloatingButtons
          player={currentPlayer}
          opponents={opponents}
          cardGameId={cardGameId}
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
          isSandbox={isSandbox}
        />
      )}

      {/* Spectator Mode - Initial Player Selection Modal */}
      {spectatorMode && !viewingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm">
          <div className="h-full w-full flex items-center justify-center p-4">
            <div className="text-center bg-slate-800 p-6 rounded-xl border border-purple-500 shadow-2xl max-w-md w-full">
              <div className="text-5xl mb-4">👁️</div>
              <p className="text-2xl mb-2 font-bold text-white">Spectator Mode</p>
              <p className="text-slate-300 mb-6">Choose a player to watch</p>
              
              <div className="space-y-3">
                {gameState.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setViewingPlayer(p.id)}
                    className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white"
                      style={{ backgroundColor: p.cursorColor }}
                    />
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-sm text-slate-400 ml-auto">
                      💚 {p.life}
                    </span>
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-slate-500 mt-6">
                Players: {gameState.players.length}/4
              </p>
              
              <div className="flex gap-3 mt-6">
                <a 
                  href="/user/signup"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Sign Up
                </a>
                <a 
                  href="/user/login"
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-purple-500"
                >
                  Log In
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}