// app/components/CardGame/CardGameBoard/ClientCardGameBoard.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDraggableLayout } from '@/app/hooks/useDraggableLayout'
import { useCardGameViewState } from '@/app/hooks/useGameViewState'
import { useDeckOperations } from '@/app/hooks/useDeckOperations'
import DragHandle from './ui/DragHandle'
import TopBar from './TopBar/TopBar'
import BattlefieldSection from './MiddleRow/BattlefieldSection'
import BottomZonesBar from './BottomRow/BottomZonesBar'
import CardGameMenu from './ui/CardGameMenu'
import CardSearch from './MiddleRow/CardSearch'
import MobileGameLayout from '../Mobile/MobileGameLayout'
import TokenCreationModal from '../TokenCreationModal'
import { DeckImportOverlay } from './ui/DeckImportOverlay'
import { LoadingScreen } from './ui/LoadingScreen'
import { PlayerNotFoundScreen } from './ui/PlayerNotFoundScreen'
import { SpectatorBottomBar } from './ui/SpectatorBottomBar'
import { getOpponents, getViewedPlayer } from '@/app/lib/cardGame/playerUtils'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import { GameSocialPanel } from '@/app/components/Social/GameSocialPanel'

interface Props {
  gameState: CardGameState
  currentPlayerId: string
  cardGameId: string
  gameName?: string
  spectatorMode?: boolean
  onBattlefieldScroll?: (scrollLeft: number, scrollTop: number) => void
  isSandbox?: boolean
}

export default function ClientCardGameBoard({
  gameState,
  currentPlayerId,
  cardGameId,
  gameName = '',
  spectatorMode = false,
  onBattlefieldScroll,
  isSandbox = false
}: Props) {
  // Custom hooks for state management
  const { layout, setLayout, isDragging, startDrag, resetLayout } = useDraggableLayout()
  const { selectedPlayerId, setSelectedPlayerId, hoveredCard, setHoveredCard, viewingZone, setViewingZone, showTokenCreator, setShowTokenCreator } = useCardGameViewState()
  const { decks, deckImportStatus, handleCreateDeck, handleDeleteDeck, handleSelectDeck, handleEditDeck, prefetchDecks } = useDeckOperations({ currentPlayerId, cardGameId, spectatorMode, isSandbox })

  // Null safety check
  if (!gameState?.players?.length) {
    return <LoadingScreen />
  }

  // Derived state
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
  const opponents = useMemo(() => getOpponents(gameState.players, currentPlayerId), [gameState.players, currentPlayerId])
  const viewedPlayer = getViewedPlayer(gameState, currentPlayerId, selectedPlayerId, spectatorMode, currentPlayer)
  const isTopBarCollapsed = layout.topBarHeight < 90
  const isRightPanelCollapsed = layout.rightPanelWidth < 100

  // Player validation
  if (!currentPlayer && !spectatorMode) {
    return <PlayerNotFoundScreen playerId={currentPlayerId} />
  }

  // Card drop handler
  const handleCardDrop = async (cardId: string, fromZone: string, position: { x: number, y: number }) => {
    if (spectatorMode) return
    await applyCardGameAction(cardGameId, {
      type: 'move_card',
      playerId: currentPlayerId,
      data: { cardId, fromZone, toZone: 'battlefield', position, isFaceUp: true }
    })
  }

  // Token creation handler
  const handleTokenCreate = async (tokenData: any) => {
    try {
      await applyCardGameAction(cardGameId, {
        type: 'create_token',
        playerId: currentPlayerId,
        data: { tokenData }
      })
      setShowTokenCreator(false)
    } catch (error) {
      console.error('Failed to create token:', error)
      alert('Failed to create token. Please try again.')
    }
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col relative overflow-hidden">
      {/* Game Menu - Top Right */}
      {!spectatorMode && (
        <div className="absolute top-2 right-2 z-30 flex gap-2">
          <CardGameMenu
            cardGameId={cardGameId}
            gameName={gameName}
            initialThreadUrl={null}
            isSandbox={isSandbox}
          />
        </div>
      )}

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileGameLayout
          currentPlayer={currentPlayer || gameState.players[0]}
          spectatorMode={spectatorMode}
          gameState={gameState}
          cardGameId={cardGameId}
          gameName={gameName}
          decks={decks}
          userId={currentPlayerId}
          onCreateDeck={handleCreateDeck}
          onDeleteDeck={handleDeleteDeck}
          onSelectDeck={handleSelectDeck}
          onEditDeck={handleEditDeck}
          isSandbox={isSandbox}
        />
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col h-full p-2 gap-1">
        {/* Game Social Panel */}
        {!spectatorMode && !isSandbox && (
          <GameSocialPanel
            userId={currentPlayerId}
            cardGameId={cardGameId}
            gameName={gameName}
            gameType="card"
          />
        )}

        {/* Top Row: Opponents */}
        <div 
          className="bg-slate-800 rounded-t-lg overflow-visible shrink-0"
          style={{ height: `${layout.topBarHeight}px` }}
        >
          <TopBar
            opponents={opponents}
            isCollapsed={isTopBarCollapsed}
            selectedPlayerId={selectedPlayerId}
            onSelectOpponent={setSelectedPlayerId}
            onViewZone={(playerId, zone) => setViewingZone({ playerId, zone })}
          />
        </div>

        <DragHandle
          orientation="horizontal"
          onDragStart={(e) => startDrag('top', e)}
          isDragging={isDragging === 'top'}
        />

        {/* Middle Row: Battlefield + Search */}
        <div className="flex-1 flex gap-1 min-h-0">
          <div className="flex-1 bg-slate-700 rounded-bl-lg overflow-hidden">
            <BattlefieldSection
              cardGameId={cardGameId}
              player={viewedPlayer}
              isCurrentPlayer={viewedPlayer.id === currentPlayerId}
              gameState={gameState}
              hoveredCard={hoveredCard}
              viewingZone={viewingZone}
              onCloseZone={() => setViewingZone(null)}
              onHoverCard={setHoveredCard}
              onBattlefieldScroll={onBattlefieldScroll}
              onDropCard={handleCardDrop}
              spectatorMode={spectatorMode}
              isLargeBattlefieldView={false}
              toggleLargeBattlefieldView={() => {}}
              isSandbox={isSandbox}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
            />
          </div>

          <DragHandle
            orientation="vertical"
            onDragStart={(e) => startDrag('right', e)}
            isDragging={isDragging === 'right'}
            containerHeight={layout.bottomBarHeight}
          />

          {!isRightPanelCollapsed && (
            <div 
              className="bg-slate-800 rounded-br-lg overflow-hidden shrink-0"
              style={{ width: `${layout.rightPanelWidth}px` }}
            >
              <CardSearch 
                hoveredCard={hoveredCard}
                onCardSelect={(card) => {
                  if (spectatorMode) return
                  console.log('Selected card:', card)
                }}
              />
            </div>
          )}

          {isRightPanelCollapsed && (
            <button
              onClick={() => setLayout(prev => ({ ...prev, rightPanelWidth: 400 }))}
              className="w-8 bg-slate-800 hover:bg-slate-700 rounded-br-lg flex items-center justify-center transition-all group cursor-pointer"
              title="Click to expand search panel"
            >
              <span className="text-slate-400 group-hover:text-blue-400 text-xs [writing-mode:vertical-lr] rotate-180 transition-colors">
                Search
              </span>
            </button>
          )}
        </div>

        <DragHandle
          orientation="horizontal"
          onDragStart={(e) => startDrag('bottom', e)}
          isDragging={isDragging === 'bottom'}
        />

        {/* Bottom Row */}
        {!spectatorMode && (
          <div 
            className="bg-slate-800 rounded-b-lg overflow-visible shrink-0"
            style={{ height: `${layout.bottomBarHeight}px` }}
          >
            <BottomZonesBar
              player={currentPlayer}
              gameState={gameState}
              cardGameId={cardGameId}
              viewingZone={viewingZone}
              onViewZone={(zone) => setViewingZone({ playerId: currentPlayerId, zone })}
              onSelectBattlefield={() => {
                setSelectedPlayerId(null)
                setViewingZone(null)
              }}
              decks={decks}
              onCreateDeck={handleCreateDeck}
              onDeleteDeck={handleDeleteDeck}
              onSelectDeck={handleSelectDeck}
              onEditDeck={handleEditDeck}
              onPrefetchDecks={prefetchDecks}
              isSandbox={isSandbox}
            />
          </div>
        )}

        {spectatorMode && <SpectatorBottomBar />}
      </div>

      {/* Overlays */}
      <DeckImportOverlay status={deckImportStatus} />
      
      <button
        onClick={resetLayout}
        className="hidden lg:block absolute bottom-4 left-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-500 z-50"
      >
        Reset Layout
      </button>

      {showTokenCreator && (
        <TokenCreationModal
          isOpen={showTokenCreator}
          onClose={() => setShowTokenCreator(false)}
          onCreateToken={handleTokenCreate}
        />
      )}
    </div>
  )
}