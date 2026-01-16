// app/components/CardGame/CardGameBoard/CardGameBoard-draggable.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDraggableLayout } from '@/app/hooks/useDraggableLayout'
import DragHandle from './ui/DragHandle'
import TopBar from './TopBar/TopBar'
import BattlefieldSection from './MiddleRow/BattlefieldSection'
import BottomZonesBar from './BottomRow/BottomZonesBar'
import CardGameMenu from './ui/CardGameMenu'
import CardSearch from './MiddleRow/CardSearch'
import MobileGameLayout from '../Mobile/MobileGameLayout'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import type { Deck } from '@/app/types/Deck'

interface Props {
  gameState: CardGameState
  currentPlayerId: string
  cardGameId: string
  gameName?: string
  spectatorMode?: boolean
  onBattlefieldScroll?: (scrollLeft: number, scrollTop: number) => void
  isSandbox?: boolean
}

export default function CardGameBoard({
  gameState,
  currentPlayerId,
  cardGameId,
  gameName = '',
  spectatorMode = false,
  onBattlefieldScroll,
  isSandbox = false
}: Props) {
  // Layout state
  const { layout, setLayout, isDragging, startDrag, resetLayout } = useDraggableLayout()
  
  // UI state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [viewingZone, setViewingZone] = useState<{ playerId: string, zone: string } | null>(null)
  
  // Deck state
  const [decks, setDecks] = useState<Deck[]>([])
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [deckImportStatus, setDeckImportStatus] = useState<{
    loading: boolean
    error: string | null
    step: string
  }>({ loading: false, error: null, step: '' })



  // ✅ Null safety: Check if gameState and players exist before proceeding
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    )
  }

  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
  const opponents = useMemo(() => 
    gameState.players?.filter(p => p.id !== currentPlayerId) || [],
    [gameState.players, currentPlayerId]
  )

  const viewedPlayer = spectatorMode
    ? (selectedPlayerId 
        ? gameState.players.find(p => p.id === selectedPlayerId) || gameState.players[0]
        : gameState.players[0])
    : (selectedPlayerId 
        ? gameState.players.find(p => p.id === selectedPlayerId) || currentPlayer
        : currentPlayer)

  // Derived state
  const isTopBarCollapsed = layout.topBarHeight < 90
  const isRightPanelCollapsed = layout.rightPanelWidth < 100

  // Load decks
  useEffect(() => {
    if (spectatorMode || !currentPlayerId) {
      setLoadingDecks(false)
      return
    }
    
    async function loadDecks() {
      try {
        const { getUserDecks } = await import('@/app/serverActions/deckBuilder/deckActions')
        const result = await getUserDecks(currentPlayerId!)
        if (result.success) {
          setDecks(result.decks)
        }
      } catch (error) {
        console.error('Failed to load decks:', error)
      } finally {
        setLoadingDecks(false)
      }
    }
    
    loadDecks()
  }, [currentPlayerId, spectatorMode])

  // Deck handlers
  const handleCreateDeck = async (deckListText: string, deckName: string) => {
    if (spectatorMode || !currentPlayerId) return
    
    try {
      const { createDeck } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await createDeck(currentPlayerId, deckName, deckListText)
      
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to create deck')
      }
      
      if (result.deck) {
        setDecks(prev => [result.deck!, ...prev])
      }
    } catch (error) {
      console.error('Failed to create deck:', error)
      throw error
    }
  }
  
  const handleDeleteDeck = async (deckId: string) => {
    if (spectatorMode || !currentPlayerId) return
    
    try {
      const { deleteDeck } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await deleteDeck(currentPlayerId, deckId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete deck')
      }
      
      setDecks(prev => prev.filter(d => d.id !== deckId))
    } catch (error) {
      console.error('Failed to delete deck:', error)
      throw error
    }
  }

  const handleSelectMyDeck = async (deckId: string) => {
    if (spectatorMode) {
      alert('Spectators cannot import decks')
      return
    }
    
    setDeckImportStatus({ loading: true, error: null, step: 'Starting import...' })
    
    try {
      // ✅ SANDBOX DECK
      if (isSandbox && deckId.startsWith('sandbox-')) {
        const sandboxIndex = parseInt(deckId.replace('sandbox-', ''))
        
        if (currentPlayer?.deckList) {
          const deck = decks.find(d => d.id === deckId)
          const confirmed = confirm(
            `⚠️ WARNING: Importing a new deck will RESET your entire game state!\n\n` +
            `This will clear:\n• Your hand\n• Battlefield\n• Graveyard\n• All zones\n\n` +
            `Replace "${currentPlayer.deckList.deckName || 'current deck'}" with "${deck?.name}"?`
          )
          if (!confirmed) {
            setDeckImportStatus({ loading: false, error: null, step: '' })
            return
          }
        }
        
        setDeckImportStatus({ loading: true, error: null, step: 'Importing deck...' })
        
        await applyCardGameAction(cardGameId, {
          type: 'import_sandbox_deck',
          playerId: currentPlayerId,
          data: { deckIndex: sandboxIndex }
        })
      } 
      // ✅ NORMAL DECK
      else {
        let deck = decks.find(d => d.id === deckId)
        if (!deck) throw new Error('Deck not found')
        
        if (!deck.cards || deck.cards.length === 0) {
          throw new Error('Deck has no cards. Please edit the deck first.')
        }
        
        if (currentPlayer?.deckList) {
          const confirmed = confirm(
            `⚠️ WARNING: Importing a new deck will RESET your entire game state!\n\n` +
            `This will clear:\n• Your hand\n• Battlefield\n• Graveyard\n• All zones\n\n` +
            `Replace "${currentPlayer.deckList.deckName || 'current deck'}" with "${deck.name}"?`
          )
          if (!confirmed) {
            setDeckImportStatus({ loading: false, error: null, step: '' })
            return
          }
        }
        
        setDeckImportStatus({ loading: true, error: null, step: 'Importing deck...' })
        
        try {
          // ✅ TRY NORMAL IMPORT FIRST
          const deckListText = [
            ...(deck.commanders?.map(c => `Commander: ${c}`) || []),
            ...deck.cards
              .filter(card => !card.isCommander)
              .map(card => `${card.quantity || 1} ${card.name}`)
          ].filter(Boolean).join('\n')
          
          await applyCardGameAction(cardGameId, {
            type: 'import_deck',
            playerId: currentPlayerId,
            data: { 
              deckListText,
              deckName: deck.name,
              cardData: deck.cards.map(deckCard => ({
                id: deckCard.scryfallId || deckCard.id,
                name: deckCard.name,
                image_uris: {
                  small: deckCard.imageUrl,
                  normal: deckCard.imageUrl,
                  large: deckCard.imageUrl
                },
                type_line: deckCard.type || '',
                mana_cost: deckCard.manaCost || '',
                colors: deckCard.colors || [],
                color_identity: deckCard.colors || []
              }))
            }
          })
          
        } catch (firstError) {
          // ✅ IF FAILED, TRY MIGRATING
          console.log('Import failed, attempting migration...')
          
          const { migrateDeck, needsMigration } = await import('@/app/types/Deck')
          if (needsMigration(deck)) {
            deck = migrateDeck(deck)
            
            const deckListText = [
              ...(deck.commanders?.map(c => `Commander: ${c}`) || []),
              ...deck.cards
                .filter(card => !card.isCommander)
                .map(card => `${card.quantity || 1} ${card.name}`)
            ].filter(Boolean).join('\n')
            
            await applyCardGameAction(cardGameId, {
              type: 'import_deck',
              playerId: currentPlayerId,
              data: { 
                deckListText,
                deckName: deck.name,
                cardData: deck.cards.map(deckCard => ({
                  id: deckCard.scryfallId || deckCard.id,
                  name: deckCard.name,
                  image_uris: {
                    small: deckCard.imageUrl || '',
                    normal: deckCard.imageUrl || '',
                    large: deckCard.imageUrl || ''
                  },
                  type_line: deckCard.type || '',
                  mana_cost: deckCard.manaCost || '',
                  colors: deckCard.colors || [],
                  color_identity: deckCard.colors || []
                }))
              }
            })
          } else {
            // Deck doesn't need migration - real error
            throw firstError
          }
        }
      }
      
      // ✅ SHUFFLE AND DRAW (after successful import)
      setDeckImportStatus({ loading: true, error: null, step: 'Shuffling library...' })
      
      await applyCardGameAction(cardGameId, {
        type: 'shuffle_library',
        playerId: currentPlayerId,
        data: {}
      })
  
      setDeckImportStatus({ loading: true, error: null, step: 'Drawing 7 cards...' })
  
      await applyCardGameAction(cardGameId, {
        type: 'draw_cards',
        playerId: currentPlayerId,
        data: { count: 7 }
      })
      
      setDeckImportStatus({ loading: false, error: null, step: '' })
      
    } catch (error) {
      setDeckImportStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        step: ''
      })
    }
  }

  const handleEditDeck = async (
    deckId: string,
    updatedCards: Array<{name: string, quantity: number}>,
    deckName: string
  ) => {
    if (spectatorMode || !currentPlayerId) return
  
    try {
      const { updateDeckFromEditor } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await updateDeckFromEditor(currentPlayerId, deckId, deckName, updatedCards)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update deck')
      }
    } catch (error) {
      console.error('Failed to update deck:', error)
      throw error
    }
  }

  const prefetchDecks = async () => {
    if (loadingDecks || decks.length > 0 || spectatorMode || !currentPlayerId) return
    
    setLoadingDecks(true)
    try {
      const { getUserDecks } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await getUserDecks(currentPlayerId)
      if (result.success) {
        setDecks(result.decks)
      }
    } catch (error) {
      console.error('Failed to prefetch decks:', error)
    } finally {
      setLoadingDecks(false)
    }
  }

  if (!currentPlayer && !spectatorMode) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-red-400">❌ Player not found</p>
          <p className="text-sm mt-2">ID: {currentPlayerId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col relative overflow-hidden">
      {/* Game Menu & Minimap - Top Right */}
      {!spectatorMode && (
        <div className="absolute top-2 right-2 z-30 flex gap-2">
          
          {/* Existing Game Menu */}
          <CardGameMenu
            cardGameId={cardGameId}
            gameName={gameName}
            initialThreadUrl={null}
            isSandbox={isSandbox}
          />
        </div>
      )}

      {/* ===== MOBILE LAYOUT ===== */}
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
          onSelectDeck={handleSelectMyDeck}
          onEditDeck={handleEditDeck}
          isSandbox={isSandbox}
        />
      </div>

      {/* ===== DESKTOP LAYOUT - Clear 3-row structure ===== */}
      <div className="hidden lg:flex flex-col h-full p-2 gap-1">
        
        {/* ===== TOP ROW: Opponent Bar + Ad Space ===== */}
        <div 
          className="bg-slate-800 rounded-t-lg overflow-hidden flex-shrink-0"
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

        {/* ===== MIDDLE ROW: Battlefield + Card Search ===== */}
        <div className="flex-1 flex gap-1 min-h-0">
          {/* Battlefield */}
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
              onDropCard={async (cardId, fromZone, position) => {
                if (spectatorMode) return
                await applyCardGameAction(cardGameId, {
                  type: 'move_card',
                  playerId: currentPlayerId,
                  data: {
                    cardId,
                    fromZone,
                    toZone: 'battlefield',
                    position,
                    isFaceUp: true
                  }
                })
              }}
              spectatorMode={spectatorMode}
              isLargeBattlefieldView={false}
              toggleLargeBattlefieldView={() => {}}
              isSandbox={isSandbox}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
            />
          </div>

          {/* Vertical drag handle - ALWAYS show */}
          <DragHandle
            orientation="vertical"
            onDragStart={(e) => startDrag('right', e)}
            isDragging={isDragging === 'right'}
            containerHeight={layout.bottomBarHeight}
          />

          {/* Card Search Panel */}
          {!isRightPanelCollapsed && (
            <div 
              className="bg-slate-800 rounded-br-lg overflow-hidden flex-shrink-0"
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

          {/* Collapsed panel tab - NOW CLICKABLE */}
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

        {/* ===== BOTTOM ROW: Hand + Zones ===== */}
        {!spectatorMode && (
          <div 
            className="bg-slate-800 rounded-b-lg overflow-visible flex-shrink-0"
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
              onSelectDeck={handleSelectMyDeck}
              onEditDeck={handleEditDeck}
              onPrefetchDecks={prefetchDecks}
              isSandbox={isSandbox}
            />
          </div>
        )}

        {/* Spectator bottom bar */}
        {spectatorMode && (
          <div className="bg-purple-900/50 rounded-b-lg flex items-center justify-center gap-3 py-4">
            <span className="text-purple-200">👁️ Spectator Mode - Read Only View</span>
            <a href="/user/signup" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg">
              Sign Up
            </a>
            <a href="/user/login" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg border border-purple-500">
              Log In
            </a>
          </div>
        )}
      </div>

    {/* Loading/Error Overlay - Add before closing </div> */}
    {deckImportStatus.loading && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <div className="animate-spin text-6xl">⚙️</div>
        <div className="text-white text-xl font-bold text-center">{deckImportStatus.step}</div>
        </div>
    </div>
    )}

    {deckImportStatus.error && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-red-900 border-2 border-red-500 rounded-xl p-6 max-w-md">
          <div className="text-6xl mb-4 text-center">❌</div>
          <div className="text-white text-xl font-bold mb-2 text-center">Import Failed</div>
          <div className="text-red-200 text-sm mb-4 text-center">{deckImportStatus.error}</div>
          <button
              onClick={() => setDeckImportStatus({ loading: false, error: null, step: '' })}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
              Close
          </button>
          </div>

          
      </div>
    
    )}
      {/* Reset Layout Button (dev tool) */}
      <button
        onClick={resetLayout}
        className="hidden lg:block absolute bottom-4 left-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-500 z-50"
      >
        Reset Layout
      </button>
    </div>
  )
}