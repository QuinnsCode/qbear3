// app/components/CardGame/CardGameBoard/legacy/CardGameBoard.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCardGameLargeBattlefieldView } from '@/app/hooks/useCardGameLargeBattlefieldView'
import type { CardGameState, MTGPlayer } from '@/app/services/cardGame/CardGameState'
import { getRelativePosition } from '@/app/services/cardGame/CardGameState'
import OpponentPanel from '../TopBar/OpponentPanel'
import MainViewer from './MainViewer'
import YourZones from './YourZones'
import CardSearch from '@/app/components/CardGame/CardGameBoard/MiddleRow/CardSearch'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import { createDeck, getUserDecks, deleteDeck, updateDeckFromEditor } from '@/app/serverActions/deckBuilder/deckActions'
import type { Deck, DeckCard } from '@/app/types/Deck'
import MobileGameLayout from '../../Mobile/MobileGameLayout'
import CardGameMenu from '../ui/CardGameMenu'

interface Props {
  gameState: CardGameState
  currentPlayerId: string
  cardGameId: string
  gameName: string
  spectatorMode?: boolean
  onBattlefieldScroll?: null
  isSandbox?: boolean
}

export default function CardGameBoard({ 
  gameState, 
  currentPlayerId, 
  cardGameId,
  gameName,
  spectatorMode = false,
  onBattlefieldScroll,
  isSandbox = false
}: Props) {

  console.log('Spectator mode: ', spectatorMode)

  const { 
    isLargeBattlefieldView, 
    toggleLargeBattlefieldView
  } = useCardGameLargeBattlefieldView()

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [viewingZone, setViewingZone] = useState<{ playerId: string, zone: string } | null>(null)
  const [decks, setDecks] = useState<Deck[]>([])
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [decksLoaded, setDecksLoaded] = useState(false)
  
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)

  // Load user's decks on mount (skip for spectators)
  useEffect(() => {
    if (spectatorMode || !currentPlayerId) {
      setLoadingDecks(false)
      return
    }
    
    async function loadDecks() {
      try {
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
  
  const opponents = useMemo(() => {
    if (!currentPlayer) return { north: null, west: null, east: null }
    
    const result: Record<'north' | 'west' | 'east', MTGPlayer | null> = {
      north: null,
      west: null,
      east: null
    }
    
    gameState.players.forEach(player => {
      if (player.id === currentPlayerId) return
      
      const visualPosition = getRelativePosition(player.position, currentPlayer.position)
      if (visualPosition === 'north' || visualPosition === 'west' || visualPosition === 'east') {
        result[visualPosition] = player
      }
    })
    
    return result
  }, [gameState.players, currentPlayer, currentPlayerId])
  
  // Create deck handler (disabled for spectators)
  const handleCreateDeck = async (deckListText: string, deckName: string) => {
    if (spectatorMode || !currentPlayerId) {
      console.log('🔍 Spectator mode - deck creation disabled')
      return
    }
    
    try {
      const result = await createDeck(currentPlayerId, deckName, deckListText)
      
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to create deck')
      }
      
      // Add new deck to state
      if (result.deck) {
        setDecks(prev => [result.deck!, ...prev])
      }
    } catch (error) {
      console.error('Failed to create deck:', error)
      throw error
    }
  }
  
  // Delete deck handler (disabled for spectators)
  const handleDeleteDeck = async (deckId: string) => {
    if (spectatorMode || !currentPlayerId) {
      console.log('🔍 Spectator mode - deck deletion disabled')
      return
    }
    
    try {
      const result = await deleteDeck(currentPlayerId, deckId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete deck')
      }
      
      // Remove deck from state
      setDecks(prev => prev.filter(d => d.id !== deckId))
    } catch (error) {
      console.error('Failed to delete deck:', error)
      throw error
    }
  }
  
  // Select deck handler (disabled for spectators)
  const handleSelectDeck = async (deckId: string) => {
    if (spectatorMode) {
      console.log('🔍 Spectator mode - deck import disabled')
      alert('Spectators cannot import decks')
      return
    }
    
    try {
      const deck = decks.find(d => d.id === deckId)
      if (!deck) {
        throw new Error('Deck not found')
      }
      
      // Check if player already has a deck loaded
      if (currentPlayer?.deckList) {
        const confirmed = confirm(
          `⚠️ WARNING: Importing a new deck will RESET your entire game state!\n\n` +
          `This will clear:\n` +
          `• Your hand\n` +
          `• Battlefield\n` +
          `• Graveyard\n` +
          `• All zones\n\n` +
          `Replace "${currentPlayer.deckList.deckName || 'current deck'}" with "${deck.name}"?`
        )
        if (!confirmed) {
          return // User cancelled
        }
      }
      
      // Build deck list text from MIGRATED deck structure
      const deckListText = [
        deck.commander ? `Commander: ${deck.commander}` : '',
        ...deck.cards
          .filter(card => !card.isCommander)
          .map(card => `${card.quantity} ${card.name}`)
      ].filter(Boolean).join('\n')
      
      console.log('[CardGameBoard] Importing deck:', deck.name)
      console.log('[CardGameBoard] Commander:', deck.commander)
      console.log('[CardGameBoard] Cards in main list (excluding commander):', deck.cards.filter(c => !c.isCommander).length)
      console.log('[CardGameBoard] Total cards (including commander):', deck.cards.reduce((sum, c) => sum + c.quantity, 0))
      console.log('[CardGameBoard] This will reset all game state for this player')
      
      // Import deck into game using existing action
      const updatedGameState = await applyCardGameAction(cardGameId, {
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
            color_identity: deckCard.colors || [],
            set: '',
            set_name: '',
            collector_number: '',
            rarity: 'common'
          }))
        }
      })
      
      // Auto-shuffle library
      await applyCardGameAction(cardGameId, {
        type: 'shuffle_library',
        playerId: currentPlayerId,
        data: {}
      });

      // Auto-draw 7 cards
      await applyCardGameAction(cardGameId, {
        type: 'draw_cards',
        playerId: currentPlayerId,
        data: { count: 7 }
      });

      console.log('[CardGameBoard] Deck imported, shuffled, drew 7')
      return updatedGameState

    } catch (error) {
      console.error('Failed to import deck:', error)
      alert('Failed to import deck: ' + (error instanceof Error ? error.message : 'Unknown error'))
      throw error
    }
  }

  const handleEditDeck = async (
    deckId: string,
    updatedCards: Array<{name: string, quantity: number}>,
    deckName: string
  ) => {
    if (spectatorMode || !currentPlayerId) {
      return
    }
  
    try {
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
  
  const viewedPlayer = spectatorMode
    ? (selectedPlayerId 
        ? gameState.players.find(p => p.id === selectedPlayerId) || gameState.players[0]
        : gameState.players[0])
    : (selectedPlayerId 
        ? gameState.players.find(p => p.id === selectedPlayerId) || currentPlayer
        : currentPlayer)
  
  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col relative">
      {/* Game Menu - Top Right of mobile and desktop! */}
      {!spectatorMode && (
        <div className="absolute top-2 right-2 z-30">
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
          currentPlayer={currentPlayer || gameState.players[0]}  // Safe fallback
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

      {/*~~~~~~~~~~~~ DESKTOP LAYOUT (lg and up) ~~~~~~~~~~~~*/}
      <div className={`hidden lg:grid gap-2 h-full p-2 transition-all duration-300 ${
        isLargeBattlefieldView 
          ? 'lg:grid-cols-1 lg:grid-rows-[auto_1fr]' 
          : 'lg:grid-cols-[1fr_320px] lg:grid-rows-[120px_1fr_280px]'
      }`}>
        
        {/* Row 1: Opponent Panels (hidden in large view) */}
        {!isLargeBattlefieldView && (
          <>
            {/* Col 1: Horizontally scrollable opponent panels */}
            <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              {/* Show ALL opponents (not just north/west/east) */}
              {gameState.players
                .filter(p => p.id !== currentPlayerId)
                .map((opponent, index) => (
                  <div key={opponent.id} className="shrink-0 w-80 bg-slate-800 rounded-lg overflow-hidden">
                    <OpponentPanel
                      player={opponent}
                      position={index === 0 ? 'north' : index === 1 ? 'west' : 'east'}
                      isSelected={selectedPlayerId === opponent.id}
                      onClick={() => setSelectedPlayerId(opponent.id)}
                      onViewZone={(zone) => setViewingZone({ playerId: opponent.id, zone })}
                    />
                  </div>
                ))}
              
              {/* Show empty slots if less than 3 opponents */}
              {gameState.players.length < 4 && Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="shrink-0 w-80 bg-slate-800 rounded-lg overflow-hidden">
                  <EmptySlot position={`opponent-${i + gameState.players.length}`} />
                </div>
              ))}
            </div>
            
            {/* Col 2: Turn Order */}
            <div className="bg-slate-800/20 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">
                {spectatorMode ? '👁️ Spectator' : 'Turn Order'}
              </span>
            </div>
          </>
        )}
        
        {/* Large View: Compact header bar */}
        {isLargeBattlefieldView && (
          <div className="col-span-full bg-slate-800 rounded-lg p-3 flex items-center justify-between overflow-x-auto">
            <div className="flex items-center gap-4 min-w-0">
              {/* Opponent buttons - ALL opponents, scrollable */}
              {gameState.players
                .filter(p => p.id !== currentPlayerId)
                .map((opp) => (
                  <button
                    key={opp.id}
                    onClick={() => setSelectedPlayerId(opp.id)}
                    className={`shrink-0 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedPlayerId === opp.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {opp.name}
                    <span className="ml-2 text-xs opacity-75">❤️ {opp.life}</span>
                  </button>
                ))}
            </div>
            
            {/* Life total */}
            {currentPlayer && (
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="text-slate-400 text-sm">{currentPlayer.name}</span>
                <span className="text-xl">💚</span>
                <span className="text-xl font-bold text-green-400">{currentPlayer.life}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Row 2: Battlefield (expands to full screen in large view) */}
        <div className={`bg-slate-700 rounded-lg overflow-hidden ${
          isLargeBattlefieldView ? 'col-span-full' : ''
        }`}>
          <MainViewer
            cardGameId={cardGameId}
            player={viewedPlayer}
            isCurrentPlayer={viewedPlayer.id === currentPlayerId}
            gameState={gameState}
            hoveredCard={hoveredCard}
            viewingZone={viewingZone}
            onCloseZone={() => setViewingZone(null)}
            onHoverCard={setHoveredCard}
            spectatorMode={spectatorMode}
            isLargeBattlefieldView={isLargeBattlefieldView}
            toggleLargeBattlefieldView={toggleLargeBattlefieldView}
            onDropCard={async (cardId, fromZone, position) => {
              if (spectatorMode) {
                console.log('🔍 Spectator mode - card drop disabled')
                return
              }
              
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
          />
        </div>
        
        {/* Row 2, Col 2: Card Search (hidden in large view) */}
        {!isLargeBattlefieldView && (
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <CardSearch 
              hoveredCard={hoveredCard}
              onCardSelect={(card) => {
                if (spectatorMode) {
                  console.log('🔍 Spectator mode - card selection disabled')
                  return
                }
                console.log('Selected card:', card)
              }}
            />
          </div>
        )}
        
        {/* Row 3: Bottom bar (hidden in large view, hidden for spectators) */}
        {!isLargeBattlefieldView && !spectatorMode && (
          <div className="col-span-2 bg-slate-800 rounded-lg">
            <YourZones
              player={currentPlayer}
              gameState={gameState}
              cardGameId={cardGameId}
              onViewZone={(zone) => setViewingZone({ playerId: currentPlayerId, zone })}
              onSelectBattlefield={() => {
                setSelectedPlayerId(null)
                setViewingZone(null)
              }}
              isViewingHand={viewingZone?.zone === 'hand' && viewingZone?.playerId === currentPlayerId}
              decks={decks}
              userId={currentPlayerId}
              onCreateDeck={handleCreateDeck}
              onDeleteDeck={handleDeleteDeck}
              onSelectDeck={handleSelectDeck}
              onEditDeck={handleEditDeck}
              onPrefetchDecks={prefetchDecks}
              spectatorMode={spectatorMode}
              isSandbox={isSandbox}
            />
          </div>
        )}
        
        {/* Spectator: Show minimal info bar (hidden in large view) */}
        {!isLargeBattlefieldView && spectatorMode && (
          <div className="col-span-2 bg-purple-900/50 rounded-lg flex flex-col items-center justify-center gap-3 py-4">
            <span className="text-purple-200">👁️ Spectator Mode - Read Only View</span>
            <div className="flex gap-3">
              <a 
                href="/user/signup"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                Sign Up
              </a>
              <a 
                href="/user/login"
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-purple-500"
              >
                Log In
              </a>
            </div>
          </div>
        )}
      </div>
        
      {/* Spectator overlay */}
      {spectatorMode && !selectedPlayerId && (
        <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-5 backdrop-blur-sm">
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center bg-slate-800 bg-opacity-95 p-8 rounded-xl border-2 border-purple-500 shadow-2xl max-w-md">
              <div className="text-6xl mb-4">👁️</div>
              <p className="text-2xl mb-2 font-bold text-white">Spectator Mode</p>
              <p className="text-gray-300 mb-6">Choose a player to watch</p>
              
              <div className="space-y-3">
                {gameState.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: p.cursorColor }}
                    />
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-sm text-gray-400 ml-auto">
                      💚 {p.life}
                    </span>
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-6">
                Players: {gameState.players.length}/4
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptySlot({ position }: { position: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-600 text-xs bg-slate-800 rounded">
      <div className="text-center p-1">
        <div className="text-lg">👻</div>
        <p className="hidden sm:block text-[10px]">Empty</p>
      </div>
    </div>
  )
}