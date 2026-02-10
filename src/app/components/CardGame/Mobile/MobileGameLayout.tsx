// app/components/CardGame/Mobile/MobileGameLayout.tsx - UPDATED STYLING
'use client'

import { useState } from 'react'
import type { CardGameState, MTGPlayer, TokenData } from '@/app/services/cardGame/CardGameState'
import { BattlefieldContainer } from '../CardGameBoard/MiddleRow/Battlefield/BattlefieldContainer'
import MobileZoneDrawer from './MobileZoneDrawer'
import MobileOpponentBubble from './MobileOpponentBubble'
import MobileFloatingButtons from './MobileFloatingButtons'
import TokenCreationModal from '../TokenCreationModal'
import { Deck } from '@/app/types/Deck'
import { GameSocialPanel } from '@/app/components/Social/GameSocialPanel'
import SpectatorBanner from './SpectatorBanner'

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
  const [tokenModalOpen, setTokenModalOpen] = useState(false)

  const opponents = gameState.players.filter(p => p.id !== currentPlayer.id)

  const handleCreateToken = async (tokenData: TokenData) => {
    try {
      const { applyCardGameAction } = await import('@/app/serverActions/cardGame/cardGameActions')
      
      console.log('🎯 Mobile: Creating token:', tokenData.name)
      
      // Get battlefield container (the scrollable area)
      const battlefield = document.querySelector('[data-battlefield]') as HTMLElement
      
      if (!battlefield) {
        console.warn('⚠️ Battlefield not found, using fallback position')
        await applyCardGameAction(cardGameId, {
          type: 'create_token',
          playerId: currentPlayer.id,
          data: { 
            tokenData, 
            position: { x: 100, y: 100 } // Fallback
          }
        })
        console.log('✅ Token created (fallback position):', tokenData.name)
        return
      }
      
      // Place token in top-left of visible viewport + some padding
      // This accounts for current scroll position
      const PADDING = 50 // pixels from edge
      const position = {
        x: battlefield.scrollLeft + PADDING,
        y: battlefield.scrollTop + PADDING
      }
      
      console.log('📍 Creating token at position:', position)
      
      await applyCardGameAction(cardGameId, {
        type: 'create_token',
        playerId: currentPlayer.id,
        data: { tokenData, position }
      })
      
      console.log('✅ Token created successfully:', tokenData.name)
    } catch (error) {
      console.error('❌ Failed to create token:', error)
      // Re-throw so TokenCreationModal can show the error
      throw error
    }
  }

  const displayedPlayer = viewingPlayer
    ? gameState.players.find(p => p.id === viewingPlayer) || currentPlayer
    : spectatorMode
      ? gameState.players[0] || currentPlayer  // Show first player in spectator mode
      : currentPlayer
  const isViewingSelf = viewingPlayer === currentPlayer.id
  
  // Get battlefield cards for displayed player
  const battlefieldCards = displayedPlayer.zones.battlefield
    .map(id => gameState.cards[id])
    .filter(card => card !== undefined)

  // ✅ UPDATED: Token-aware getCardData
  const getCardData = (scryfallId: string, card?: any) => {
    // ✅ CHECK IF TOKEN FIRST
    if (card?.isToken && card?.tokenData) {
      // Convert tokenData to ScryfallCard format
      return {
        id: scryfallId,
        name: card.tokenData.name,
        type_line: card.tokenData.typeLine,
        oracle_text: card.tokenData.oracleText,
        power: card.tokenData.power,
        toughness: card.tokenData.toughness,
        colors: card.tokenData.colors || [],
        color_identity: card.tokenData.colors || [],
        image_uris: card.tokenData.imageUrl ? {
          normal: card.tokenData.imageUrl,
          large: card.tokenData.imageUrl,
          small: card.tokenData.imageUrl
        } : undefined,
        set: 'token',
        set_name: 'Token',
        collector_number: '0',
        rarity: 'common'
      }
    }
    
    // Normal card lookup from deck lists
    for (const p of gameState.players) {
      if (p.deckList?.cardData) {
        const found = p.deckList.cardData.find(c => c.id === scryfallId)
        if (found) return found
      }
    }
    return undefined
  }

  return (
    <div className="h-screen w-screen bg-slate-900 relative overflow-hidden">
      {/* Game Social Panel */}
      {!spectatorMode && !isSandbox && (
        <GameSocialPanel
          userId={userId || currentPlayer.id}
          cardGameId={cardGameId}
          gameName={gameName}
          gameType="card"
        />
      )}

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
      {displayedPlayer && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700/50 shadow-lg">
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
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-semibold shadow-lg border border-blue-500/50 flex items-center gap-2 transition-all"
        >
          <span>⚔️</span>
          <span>Your Board</span>
        </button>
      )}

      {/* Battlefield - Full Screen */}
      {displayedPlayer && (
        <div className="absolute inset-0 pt-32 pb-28">
          <BattlefieldContainer
            cards={battlefieldCards}
            gameState={gameState}
            cardGameId={cardGameId}
            playerId={displayedPlayer.id}
            isCurrentPlayer={isViewingSelf}
            spectatorMode={spectatorMode || !isViewingSelf}
            onHover={() => {}}
            getCardData={getCardData}
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
          onCreateToken={() => setTokenModalOpen(true)}
        />
      )}

      {/* Token Creation Modal */}
      <TokenCreationModal
        isOpen={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onCreateToken={handleCreateToken}
      />

      {/* Spectator Mode - Collapsible Banner */}
      {spectatorMode && !viewingPlayer && (
        <SpectatorBanner
          onSelectPlayer={setViewingPlayer}
          players={gameState.players}
        />
      )}
    </div>
  )
}