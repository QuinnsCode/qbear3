// app/components/CardGame/YourZones.tsx
'use client'

import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import { useState, useEffect, useRef } from 'react'
import DeckBuilder from '@/app/components/CardGame/DeckBuilder/DeckBuilder'
import type { Deck } from '@/app/types/Deck'
import { Hand } from 'lucide-react'

// Import Lucide icons
import { 
  BookOpen, 
  Skull, 
  Flame, 
  Crown, 
  Swords 
} from 'lucide-react'

interface Props {
  player: MTGPlayer
  gameState: CardGameState
  cardGameId: string
  onViewZone: (zone: string) => void
  onSelectBattlefield: () => void
  isViewingHand?: boolean
  decks?: Deck[]
  userId: string
  onCreateDeck?: (deckList: string, deckName: string) => Promise<void>
  onDeleteDeck?: (deckId: string) => Promise<void>
  onSelectDeck?: (deckId: string) => void
  onEditDeck?: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  onPrefetchDecks?: () => Promise<void>
  spectatorMode?: boolean
  isSandbox?: boolean
}

export default function YourZones({ 
  player, 
  gameState, 
  cardGameId, 
  onViewZone, 
  onSelectBattlefield, 
  isViewingHand = false,
  decks = [],
  userId,
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck,
  onPrefetchDecks,
  spectatorMode,
  isSandbox
}: Props) {
  const [isImporting, setIsImporting] = useState(false)
  const [isDeckBuilderOpen, setIsDeckBuilderOpen] = useState(false)
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false)
  const libraryButtonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const [decksLoaded, setDecksLoaded] = useState(false)
  const [isLoadingDecks, setIsLoadingDecks] = useState(false)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [drawCount, setDrawCount] = useState(1)
  
  useEffect(() => {
    if (libraryMenuOpen && libraryButtonRef.current) {
      const rect = libraryButtonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.top - 180,
        right: window.innerWidth - rect.right
      })
    }
  }, [libraryMenuOpen])
  
  const handleImportTestDeck = async () => {
    setIsImporting(true)
    setLibraryMenuOpen(false)
    try {
        await applyCardGameAction(cardGameId, {
        type: 'import_deck',
        playerId: player.id,
        data: { deckListText: 'Test Deck' }
      })
    } catch (error) {
      console.error('Failed to import deck:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const handleOnSelectBattlefield = () => {
    setLibraryMenuOpen(false)
    setIsDeckBuilderOpen(false)
    onSelectBattlefield()
  }

  const handleImportDeck = async () => {
    setLibraryMenuOpen(false)
    setIsDeckBuilderOpen(true)
  }
  
  const handleDrawCards = async (count: number) => {
    setLibraryMenuOpen(false)
    setShowDrawModal(false)
    try {
      await applyCardGameAction(cardGameId, {
        type: 'draw_cards',
        playerId: player.id,
        data: { count: count }
      })
    } catch (error) {
      console.error('Failed to draw cards:', error)
    }
  }

  const handleMoveCard = async (cardId: string, fromZone: string, toZone: string) => {
    try {
      applyCardGameAction(cardGameId, {
        type: 'move_card',
        playerId: player.id,
        data: { cardId, fromZone, toZone }
      }).catch(error => {
        console.error('Failed to move card:', error)
      })
    } catch (error) {
      console.error('Failed to move card:', error)
    }
  }

  const handleShuffleLibrary = async () => {
    setLibraryMenuOpen(false)
    try {
      await applyCardGameAction(cardGameId, {
        type: 'shuffle_library',
        playerId: player.id,
        data: {}
      })
    } catch (error) {
      console.error('Failed to shuffle library:', error)
    }
  }
  
  const handleMillCards = async (count: number) => {
    setLibraryMenuOpen(false)
    try {
      for (let i = 0; i < count; i++) {
        const topCardId = player.zones.library[i]
        if (!topCardId) break
        
        await applyCardGameAction(cardGameId, {
          type: 'move_card',
          playerId: player.id,
          data: { 
            cardId: topCardId,
            fromZone: 'library',
            toZone: 'graveyard'
          }
        })
      }
    } catch (error) {
      console.error('Failed to mill cards:', error)
    }
  }
  
  const handleRevealTopCard = async () => {
    setLibraryMenuOpen(false)
    try {
      const topCardId = player.zones.library[0]
      if (!topCardId) {
        alert('Library is empty')
        return
      }
      
      await applyCardGameAction(cardGameId, {
        type: 'flip_card',
        playerId: player.id,
        data: { 
          cardId: topCardId,
          isFaceUp: true 
        }
      })
    } catch (error) {
      console.error('Failed to reveal top card:', error)
    }
  }

  const openDrawModal = () => {
    setLibraryMenuOpen(false)
    setShowDrawModal(true)
    setDrawCount(1)
  }

  return (
    <>
      {/* MOBILE LAYOUT */}
        <div className="lg:hidden h-full p-2 flex gap-2">
        {/* Left: Hand */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
            <button
            onClick={() => onViewZone('hand')}
            className="flex-1 bg-slate-900 hover:bg-slate-800 rounded border-2 border-slate-700 p-2 flex items-center justify-between transition-colors"
            >
            <div className="flex items-center gap-2">
                <span className="text-xl">🃏</span>
                <span className="text-white text-sm font-semibold">Hand</span>
            </div>
            <span className="text-white font-bold">{player.zones.hand.length}</span>
            </button>
        </div>
        
        {/* Center: Battlefield */}
        <button
            onClick={handleOnSelectBattlefield}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault()
                const cardId = e.dataTransfer.getData('cardId')
                const fromZone = e.dataTransfer.getData('fromZone')
                handleMoveCard(cardId, fromZone, 'battlefield')
            }}
            className="w-24 bg-slate-900 hover:bg-slate-800 rounded border-2 border-slate-700 p-2 flex flex-col items-center justify-center transition-colors group"
        >
            <Swords className="w-8 h-8 mb-1 text-white group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] transition-all" />
            <span className="text-white text-xs font-bold">Board</span>
            <span className="text-white text-lg font-bold">{player.zones.battlefield.length}</span>
        </button>
        
        {/* Right: Library with menu + Other zones */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Library with menu */}
            <div>
            <button
                ref={libraryButtonRef}
                onClick={() => onViewZone('library')}
                className="w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 rounded p-2 flex items-center justify-between relative transition-colors group"
            >
                <div className="flex items-center gap-2 text-white">
                <BookOpen className="w-6 h-6 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all" />
                <span className="font-bold">{player.zones.library.length}</span>
                </div>
                <button
                onClick={(e) => {
                    e.stopPropagation()
                    setLibraryMenuOpen(!libraryMenuOpen)
                }}
                disabled={spectatorMode || isSandbox}
                className="text-white hover:bg-slate-700 rounded px-2 py-1 text-sm z-10 transition-colors"
                >
                ⋯
                </button>
            </button>
            </div>
            
            {/* Other zones in grid */}
            <div className="grid grid-cols-3 gap-1">
            <ZoneCardMobile 
                icon={<Skull className="w-6 h-6" />}
                glowColor="rgba(168,85,247,0.8)"
                count={player.zones.graveyard.length} 
                onClick={() => onViewZone('graveyard')} 
            />
            <ZoneCardMobile 
                icon={<Flame className="w-6 h-6" />}
                glowColor="rgba(239,68,68,0.8)"
                count={player.zones.exile.length} 
                onClick={() => onViewZone('exile')} 
            />
            <ZoneCardMobile 
                icon={<Crown className="w-6 h-6" />}
                glowColor="rgba(251,191,36,0.8)"
                count={player.zones.command.length} 
                onClick={() => onViewZone('command')} 
            />
            </div>
        </div>
    </div>
      
    {libraryMenuOpen && (
        <>
            <div 
                className="fixed inset-0 z-40 lg:hidden"
                onClick={() => setLibraryMenuOpen(false)}
            />
                <div 
                className="fixed z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-600 min-w-[160px] max-w-[240px] lg:hidden"
                style={{
                    top: `${menuPosition.top}px`,
                    right: `${menuPosition.right}px`,
                    maxHeight: 'calc(100vh - 16px)',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#475569 #1e293b',
                }}
                >
                    <div className="p-2">
                        <button
                        onClick={handleImportDeck}
                        disabled={isImporting || spectatorMode}
                        className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm disabled:opacity-50"
                        >
                        📦 Import Deck
                        </button>
                        <button
                            onClick={() => {
                                setLibraryMenuOpen(false)
                                setIsDeckBuilderOpen(true)
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
                          <button
                            onClick={() => handleDrawCards(1)}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                            >
                            Draw 1 Card
                            </button>
                            <div className="border-t border-slate-600 my-1"></div>
                            <button
                            onClick={openDrawModal}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                            >
                            {`🎴 Draw X Card(s)`}
                            </button>
                            <button
                            onClick={() => handleDrawCards(7)}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                            >
                            Draw 7 Cards
                            </button>
                            <div className="border-t border-slate-600 my-1"></div>
                            <button 
                            onClick={() => handleShuffleLibrary()}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                            >
                            🔀 Shuffle Library
                            </button>
                            <button 
                            onClick={() => handleMillCards(3)}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                            >
                            ⚰️ Mill 3 Cards
                            </button>
                            <button 
                            onClick={() => handleRevealTopCard()}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                            >
                            👁️ Reveal Top Card
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
      )}
      
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex h-full p-3 gap-3">
        {/* Left: Hand section - UPDATED */}
        <div className="flex-[3] flex gap-2 min-w-0">
          {/* Hand Cards Carousel - now takes full space */}
          <div className="flex-1 bg-slate-900 rounded-lg p-3 border-2 border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 p-3 flex gap-3 overflow-x-auto pb-2 scroll-smooth">
              {player.zones.hand.map(cardId => {
                const card = gameState.cards[cardId]
                if (!card) return null
                
                const cardData = player.deckList?.cardData?.find(c => c.id === card.scryfallId)
                const imageUrl = cardData?.image_uris?.normal || cardData?.image_uris?.small
                
                return (
                  <div 
                    key={cardId}
                    draggable={!isViewingHand}
                    onDragStart={(e) => {
                      if (isViewingHand) {
                        e.preventDefault()
                        return
                      }
                      e.dataTransfer.setData('cardId', cardId)
                      e.dataTransfer.setData('fromZone', 'hand')
                      e.dataTransfer.setData('playerId', player.id)
                    }}
                    className={`w-40 h-full rounded-lg border-2 border-slate-600 flex-shrink-0 shadow-xl overflow-hidden hover:scale-105 transition-transform ${
                      isViewingHand ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={cardData?.name || 'Card'}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-sm text-white p-2">
                        <p className="text-center break-words">{cardData?.name || 'Card'}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* View All Button - Tall and Skinny on the RIGHT */}
          <button
            onClick={() => onViewZone('hand')}
            className="w-16 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center gap-3 transition-colors group py-4"
          >
            <Hand className="w-8 h-8 text-white group-hover:text-blue-400 transition-colors" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-white text-xs font-semibold [writing-mode:vertical-lr] rotate-180">
                View All
              </span>
              <span className="text-white text-2xl font-bold">{player.zones.hand.length}</span>
            </div>
          </button>
        </div>
        
        {/* Right: Zones Column - FORCE TO w-96 to match card search above it in the UI */}
        <div className="w-64 flex flex-col gap-3">
          {/* Library with menu */}
          <div className="relative">
            <button
              onClick={() => onViewZone('library')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const cardId = e.dataTransfer.getData('cardId')
                const fromZone = e.dataTransfer.getData('fromZone')
                handleMoveCard(cardId, fromZone, 'library')
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 p-4 rounded-lg hover:scale-105 transition-all shadow-md flex items-center justify-between group relative"
            >
              <div className="flex items-center gap-3 text-white">
                <BookOpen className="w-12 h-12 group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all" />
                <div className="text-3xl font-bold">
                  {player.zones.library.length}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setLibraryMenuOpen(!libraryMenuOpen)
                }}
                disabled={spectatorMode || isSandbox}
                className="text-white hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-lg transition-colors"
              >
                ⋯
              </button>
              
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                Library
              </div>
            </button>
            
            {/* Library Menu - Desktop */}
            {libraryMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setLibraryMenuOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-2 min-w-[180px] z-50">
                  <button
                    onClick={handleImportDeck}
                    disabled={isImporting}
                    className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm disabled:opacity-50"
                  >
                    {isImporting ? '⏳ Importing...' : '📦 Import Deck'}
                  </button>
                  <button
                    onClick={() => {
                        setLibraryMenuOpen(false)
                        setIsDeckBuilderOpen(true)
                      }}    
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
                            onClick={openDrawModal}
                            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                        >
                            🎴 Draw X Cards
                        </button>
                        <div className="border-t border-slate-600 my-1"></div>
                        <button 
                          onClick={() => handleShuffleLibrary()}
                          className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                        >
                        🔀 Shuffle Library
                        </button>
                        <button 
                          onClick={() => handleMillCards(3)}
                          className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                        >
                        ⚰️ Mill 3 Cards
                        </button>
                        <button 
                          onClick={() => handleRevealTopCard()}
                          className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
                        >
                        👁️ Reveal Top Card
                        </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Other zones - BACK TO 3 IN A ROW */}
          <div className="flex gap-2">
            <ZoneSymbolCard 
              icon={<Skull className="w-8 h-8" />}
              glowColor="rgba(168,85,247,0.8)"
              label="Graveyard"
              count={player.zones.graveyard.length}
              size="small"
              onClick={() => onViewZone('graveyard')}
              onDrop={(e) => {
                e.preventDefault()
                const cardId = e.dataTransfer.getData('cardId')
                const fromZone = e.dataTransfer.getData('fromZone')
                handleMoveCard(cardId, fromZone, 'graveyard')
              }}
            />
            
            <ZoneSymbolCard 
              icon={<Flame className="w-8 h-8" />}
              glowColor="rgba(239,68,68,0.8)"
              label="Exile"
              count={player.zones.exile.length}
              size="small"
              onClick={() => onViewZone('exile')}
              onDrop={(e) => {
                e.preventDefault()
                const cardId = e.dataTransfer.getData('cardId')
                const fromZone = e.dataTransfer.getData('fromZone')
                handleMoveCard(cardId, fromZone, 'exile')
              }}
            />
            
            <ZoneSymbolCard 
              icon={<Crown className="w-8 h-8" />}
              glowColor="rgba(251,191,36,0.8)"
              label="Command"
              count={player.zones.command.length}
              size="small"
              onClick={() => onViewZone('command')}
              onDrop={(e) => {
                e.preventDefault()
                const cardId = e.dataTransfer.getData('cardId')
                const fromZone = e.dataTransfer.getData('fromZone')
                handleMoveCard(cardId, fromZone, 'command')
              }}
            />
          </div>

          {/* Your Board Button */}
          <button
            onClick={handleOnSelectBattlefield}
            onDragOver={(e) => {
              if (isViewingHand) return
              e.preventDefault()
              e.currentTarget.classList.add('ring-4', 'ring-yellow-400')
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('ring-4', 'ring-yellow-400')
            }}
            onDrop={async (e) => {
              if (isViewingHand) return
              e.preventDefault()
              e.currentTarget.classList.remove('ring-4', 'ring-yellow-400')
              
              const cardId = e.dataTransfer.getData('cardId')
              const fromZone = e.dataTransfer.getData('fromZone')
              
              await applyCardGameAction(cardGameId, {
                type: 'move_card',
                playerId: player.id,
                data: {
                  cardId,
                  fromZone,
                  toZone: 'battlefield',
                  position: { x: 100, y: 50 },
                  isFaceUp: true
                }
              })
            }}
            className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-lg p-4 border-2 border-slate-700 shadow-xl relative overflow-hidden transition-all group"
          >
            <div className="relative z-10">
              <Swords className="w-12 h-12 mx-auto mb-2 text-white group-hover:drop-shadow-[0_0_12px_rgba(234,179,8,0.8)] transition-all" />
              <div className="text-white font-bold text-lg mb-1">Your Board</div>
              <div className="text-white text-3xl font-bold">
                {player.zones.battlefield.length}
              </div>
            </div>
          </button>
        </div>
      </div>
      
      {/* Draw X Cards Modal */}
      {showDrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-600 p-6 w-80">
            <h3 className="text-white text-xl font-bold mb-4">Draw Cards</h3>
            
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={() => setDrawCount(Math.max(1, drawCount - 1))}
                className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
              >
                -
              </button>
              
              <input
                type="number"
                min="1"
                max={player.zones.library.length}
                value={drawCount}
                onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 h-12 bg-slate-900 border-2 border-slate-600 rounded-lg text-white text-center text-2xl font-bold focus:outline-none focus:border-blue-500"
              />
              
              <button
                onClick={() => setDrawCount(Math.min(player.zones.library.length, drawCount + 1))}
                className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
              >
                +
              </button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDrawCount(Math.min(player.zones.library.length, drawCount + 5))}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold transition-colors"
              >
                +5
              </button>
              <button
                onClick={() => setDrawCount(Math.min(player.zones.library.length, drawCount + 10))}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold transition-colors"
              >
                +10
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDrawModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-3 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDrawCards(drawCount)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-bold transition-colors"
              >
                Draw {drawCount}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Deck Builder Modal */}
      {isDeckBuilderOpen && onCreateDeck && onDeleteDeck && onSelectDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4">
            <button
              onClick={() => setIsDeckBuilderOpen(false)}
              className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg transition-colors"
            >
              ✕
            </button>
            
            <div className="w-full h-full overflow-auto rounded-xl shadow-2xl">
              <DeckBuilder
                decks={decks}
                userId={userId || ''}
                onCreateDeck={onCreateDeck}
                onDeleteDeck={onDeleteDeck}
                onSelectDeck={(deckId) => {
                  onSelectDeck(deckId)
                  setIsDeckBuilderOpen(false)
                }}
                onEditDeck={onEditDeck || (async () => {})}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Mobile zone card with Lucide icons
function ZoneCardMobile({ icon, glowColor, count, onClick }: {
  icon: React.ReactNode
  glowColor: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 hover:bg-slate-800 rounded p-1 flex flex-col items-center justify-center border border-slate-700 transition-colors group"
      style={{
        ['--glow-color' as string]: glowColor
      }}
    >
      <div className="text-white group-hover:[filter:drop-shadow(0_0_6px_var(--glow-color))] transition-all">
        {icon}
      </div>
      <span className="text-white text-xs font-bold">{count}</span>
    </button>
  )
}

// Desktop zone card with Lucide icons
function ZoneSymbolCard({ icon, glowColor, label, count, size = 'normal', onClick, onDrop }: {
  icon: React.ReactNode
  glowColor: string
  label: string
  count: number
  size?: 'normal' | 'small'
  onClick: () => void
  onDrop?: (e: React.DragEvent) => void
}) {
  const sizeClasses = size === 'small' ? 'p-2' : 'p-4'
  const countSize = size === 'small' ? 'text-xl' : 'text-3xl'
  
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`bg-slate-900 hover:bg-slate-800 ${sizeClasses} rounded-lg border-2 border-slate-700 hover:scale-105 transition-all shadow-md flex items-center justify-between group relative flex-1`}
      style={{
        ['--glow-color' as string]: glowColor
      }}
    >
      {/* Icon and count */}
      <div className="flex items-center gap-2">
        <div className="text-white group-hover:[filter:drop-shadow(0_0_8px_var(--glow-color))] transition-all">
          {icon}
        </div>
        <div className={`${countSize} font-bold text-white`}>
          {count}
        </div>
      </div>
      
      {/* Info tooltip on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
        {label}
      </div>
    </button>
  )
}