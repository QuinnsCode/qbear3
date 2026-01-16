// @/app/components/CardGame/Mobile/MobileZoneDrawer.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import DeckBuilder from '@/app/components/CardGame/DeckBuilder/DeckBuilder'
import { ZoneViewer } from '../ZoneViewer/ZoneViewer'
import type { Deck } from '@/app/types/Deck'
import { 
  BookOpen, 
  Skull, 
  Flame, 
  Crown, 
  Swords,
  Grid3x3,
  Grid2x2,
  LayoutGrid
} from 'lucide-react'

interface Props {
  player: MTGPlayer
  gameState: CardGameState
  cardGameId: string
  type: 'zones' | 'hand'
  onClose: () => void
  spectatorMode?: boolean
  decks?: Deck[]
  userId?: string
  onCreateDeck?: (deckList: string, deckName: string) => Promise<void>
  onDeleteDeck?: (deckId: string) => Promise<void>
  onSelectDeck?: (deckId: string) => Promise<void>
  onEditDeck?: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  isSandbox?: boolean
}

export default function MobileZoneDrawer({
  player,
  gameState,
  cardGameId,
  type,
  onClose,
  spectatorMode = false,
  decks = [],
  userId,
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck,
  isSandbox
}: Props) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [isDeckBuilderOpen, setIsDeckBuilderOpen] = useState(false)
  const [handColumns, setHandColumns] = useState<1 | 2 | 3>(2)
  const [cardMenu, setCardMenu] = useState<{ cardId: string, x: number, y: number } | null>(null)

  const handleMoveCard = async (cardId: string, fromZone: string, toZone: string) => {
    if (spectatorMode) return
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'move_card',
        playerId: player.id,
        data: { cardId, fromZone, toZone }
      })
    } catch (error) {
      console.error('Failed to move card:', error)
    }
  }

  // If viewing a specific zone, show ZoneViewer
  if (selectedZone) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900">
        <ZoneViewer
          player={player}
          zone={selectedZone}
          gameState={gameState}
          cardGameId={cardGameId}
          isCurrentPlayer={true}
          spectatorMode={spectatorMode}
          onClose={() => setSelectedZone(null)}
        />
      </div>
    )
  }

  if (type === 'zones') {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl max-h-[85vh] overflow-y-auto border-t border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3 border-b border-slate-700/50">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>

            {/* Title */}
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-white text-lg font-bold">Your Zones</h2>
            </div>

            {/* Zone Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <ZoneCard
                icon={<BookOpen className="w-10 h-10" />}
                glowColor="rgba(59,130,246,0.8)"
                label="Library"
                count={player.zones.library.length}
                onClick={() => setSelectedZone('library')}
              />
              <ZoneCard
                icon={<Skull className="w-10 h-10" />}
                glowColor="rgba(168,85,247,0.8)"
                label="Graveyard"
                count={player.zones.graveyard.length}
                onClick={() => setSelectedZone('graveyard')}
              />
              <ZoneCard
                icon={<Flame className="w-10 h-10" />}
                glowColor="rgba(239,68,68,0.8)"
                label="Exile"
                count={player.zones.exile.length}
                onClick={() => setSelectedZone('exile')}
              />
              <ZoneCard
                icon={<Crown className="w-10 h-10" />}
                glowColor="rgba(251,191,36,0.8)"
                label="Command"
                count={player.zones.command.length}
                onClick={() => setSelectedZone('command')}
              />
            </div>

            {/* Deck Management */}
            {!spectatorMode && (
              <div className="p-4 border-t border-slate-700 space-y-3">
                <h3 className="text-white text-sm font-bold mb-2">Deck Management</h3>
                <button
                  onClick={() => setIsDeckBuilderOpen(true)}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-xl">🎴</span>
                  <span>{player.deckList ? 'Change Deck' : 'Import Deck'}</span>
                </button>
                
                {player.deckList && (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <div className="text-white text-sm font-semibold mb-1">
                      ✅ {player.deckList.deckName || 'Deck Loaded'}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {player.zones.library.length} cards in library
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {player.deckList && !spectatorMode && (
              <div className="p-4 border-t border-slate-700 space-y-2">
                <h3 className="text-white text-sm font-bold mb-2">Quick Actions</h3>
                
                <button
                  onClick={async () => {
                    if (!confirm('Mulligan? This will shuffle your hand into library and draw 7 new cards.')) {
                      return
                    }
                    
                    try {
                      for (const cardId of player.zones.hand) {
                        await applyCardGameAction(cardGameId, {
                          type: 'move_card',
                          playerId: player.id,
                          data: { cardId, fromZone: 'hand', toZone: 'library' }
                        })
                      }
                      
                      await applyCardGameAction(cardGameId, {
                        type: 'shuffle_library',
                        playerId: player.id,
                        data: {}
                      })
                      
                      await applyCardGameAction(cardGameId, {
                        type: 'draw_cards',
                        playerId: player.id,
                        data: { count: 7 }
                      })
                    } catch (error) {
                      console.error('Failed to mulligan:', error)
                    }
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  🔄 Mulligan
                </button>
                
                <button
                  onClick={async () => {
                    await applyCardGameAction(cardGameId, {
                      type: 'draw_cards',
                      playerId: player.id,
                      data: { count: 1 }
                    })
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  🃏 Draw 1 Card
                </button>
                
                <button
                  onClick={async () => {
                    await applyCardGameAction(cardGameId, {
                      type: 'draw_cards',
                      playerId: player.id,
                      data: { count: 7 }
                    })
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  🃏 Draw 7 Cards
                </button>
                
                <button
                  onClick={async () => {
                    const topCardId = player.zones.library[0]
                    if (!topCardId) {
                      alert('Library is empty')
                      return
                    }
                    
                    await applyCardGameAction(cardGameId, {
                      type: 'move_card',
                      playerId: player.id,
                      data: { 
                        cardId: topCardId,
                        fromZone: 'library',
                        toZone: 'hand'
                      }
                    })
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  📤 Library → Hand
                </button>
                
                <button
                  onClick={async () => {
                    await applyCardGameAction(cardGameId, {
                      type: 'shuffle_library',
                      playerId: player.id,
                      data: {}
                    })
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  🔀 Shuffle Library
                </button>
                
                <button
                  onClick={async () => {
                    for (let i = 0; i < 3; i++) {
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
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  ⚰️ Mill 3 Cards
                </button>
                
                <button
                  onClick={async () => {
                    if (player.zones.hand.length === 0) {
                      alert('Your hand is empty')
                      return
                    }
                    
                    if (confirm('Move all cards from hand to battlefield tapped?')) {
                      for (const cardId of player.zones.hand) {
                        await applyCardGameAction(cardGameId, {
                          type: 'move_card',
                          playerId: player.id,
                          data: {
                            cardId,
                            fromZone: 'hand',
                            toZone: 'battlefield',
                            position: { x: Math.random() * 200, y: Math.random() * 200 },
                            isFaceUp: true,
                            isTapped: true
                          }
                        })
                      }
                    }
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  🎴 Hand → Battlefield (Tapped)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Deck Builder Modal */}
        {isDeckBuilderOpen && onCreateDeck && onDeleteDeck && onSelectDeck && (
          <div className="fixed inset-0 z-50 bg-slate-900">
            <button
              onClick={() => setIsDeckBuilderOpen(false)}
              className="absolute top-4 right-4 z-[60] bg-red-600 hover:bg-red-700 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold shadow-lg transition-colors"
            >
              ✕
            </button>
            
            <div className="w-full h-full overflow-auto">
              <DeckBuilder
                decks={decks}
                userId={userId || ''}
                onCreateDeck={onCreateDeck}
                onDeleteDeck={onDeleteDeck}
                onSelectDeck={async (deckId: string) => {
                  try {
                    if (onSelectDeck) {
                      await onSelectDeck(deckId)
                    }
                    setIsDeckBuilderOpen(false)
                    onClose()
                  } catch (error) {
                    console.error('Failed to select deck:', error)
                    alert('Failed to import deck: ' + (error instanceof Error ? error.message : 'Unknown error'))
                  }
                }}
                onEditDeck={onEditDeck || (async () => {})}
                isSandbox={isSandbox}
                cardGameId={cardGameId}
                onClose={() => {
                  setIsDeckBuilderOpen(false)
                  onClose()
                }}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  // Hand drawer with grid controls
  if (type === 'hand') {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl max-h-[85vh] overflow-y-auto border-t border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3 border-b border-slate-700/50">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>

            {/* Title & Grid Controls */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white text-lg font-bold">Your Hand ({player.zones.hand.length})</h2>
              
              {/* Grid size toggle */}
              <div className="flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1">
                <button
                  onClick={() => setHandColumns(1)}
                  className={`p-2 rounded transition-colors ${
                    handColumns === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setHandColumns(2)}
                  className={`p-2 rounded transition-colors ${
                    handColumns === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setHandColumns(3)}
                  className={`p-2 rounded transition-colors ${
                    handColumns === 3 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hand cards with dynamic grid */}
            <div 
              className={`p-4 grid gap-3`}
              style={{ gridTemplateColumns: `repeat(${handColumns}, 1fr)` }}
            >
              {player.zones.hand.map(cardId => {
                const card = gameState.cards[cardId]
                if (!card) return null

                const cardData = player.deckList?.cardData?.find(c => c.id === card.scryfallId)
                const imageUrl = cardData?.validatedImageUrl || cardData?.image_uris?.normal || cardData?.image_uris?.small

                return (
                  <div key={cardId} className="relative">
                    {/* Card Image */}
                    <div className="aspect-[2/3] rounded-lg overflow-hidden border border-slate-600 shadow-lg">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={cardData?.name || 'Card'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-card.png'
                            e.currentTarget.onerror = null
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center p-2">
                          <p className="text-white text-xs text-center">{cardData?.name || 'Card'}</p>
                        </div>
                      )}
                    </div>

                    {/* Menu Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setCardMenu({
                          cardId,
                          x: rect.left,
                          y: rect.top
                        })
                      }}
                      className="absolute top-1 right-1 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold shadow-lg border border-slate-600 transition-colors"
                    >
                      ⋯
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Card Menu */}
        {cardMenu && (
          <>
            <div 
              className="fixed inset-0 z-50 bg-black/30"
              onClick={() => setCardMenu(null)}
            />
            <SmartCardMenu
              cardId={cardMenu.cardId}
              position={{ x: cardMenu.x, y: cardMenu.y }}
              onClose={() => setCardMenu(null)}
              onAction={async (action) => {
                if (spectatorMode) return
                
                const actions: Record<string, any> = {
                  battlefield: {
                    type: 'move_card',
                    playerId: player.id,
                    data: {
                      cardId: cardMenu.cardId,
                      fromZone: 'hand',
                      toZone: 'battlefield',
                      position: { x: 100, y: 100 },
                      isFaceUp: true
                    }
                  },
                  graveyard: {
                    type: 'move_card',
                    playerId: player.id,
                    data: {
                      cardId: cardMenu.cardId,
                      fromZone: 'hand',
                      toZone: 'graveyard'
                    }
                  },
                  exile: {
                    type: 'move_card',
                    playerId: player.id,
                    data: {
                      cardId: cardMenu.cardId,
                      fromZone: 'hand',
                      toZone: 'exile'
                    }
                  },
                  library_top: {
                    type: 'move_card',
                    playerId: player.id,
                    data: {
                      cardId: cardMenu.cardId,
                      fromZone: 'hand',
                      toZone: 'library',
                      position: 'top'
                    }
                  },
                  library_bottom: {
                    type: 'move_card',
                    playerId: player.id,
                    data: {
                      cardId: cardMenu.cardId,
                      fromZone: 'hand',
                      toZone: 'library',
                      position: 'bottom'
                    }
                  }
                }
                
                if (actions[action]) {
                  await applyCardGameAction(cardGameId, actions[action])
                  setCardMenu(null)
                  if (action === 'battlefield') {
                    onClose()
                  }
                }
              }}
            />
          </>
        )}
      </>
    )
  }

  return null
}

function ZoneCard({ icon, glowColor, label, count, onClick }: {
  icon: React.ReactNode
  glowColor: string
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 flex flex-col items-center gap-2 transition-colors group"
      style={{
        ['--glow-color' as string]: glowColor
      }}
    >
      <div className="text-white group-hover:[filter:drop-shadow(0_0_10px_var(--glow-color))] transition-all">
        {icon}
      </div>
      <span className="text-white font-bold text-sm">{label}</span>
      <span className="text-white text-2xl font-bold">{count}</span>
    </button>
  )
}

function SmartCardMenu({ 
  cardId, 
  position, 
  onClose, 
  onAction 
}: {
  cardId: string
  position: { x: number; y: number }
  onClose: () => void
  onAction: (action: string) => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, maxHeight: 'auto' })

  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let top = position.y
      let left = position.x
      let maxHeight: string | number = 'auto'
      
      // Center horizontally around click point
      left = position.x - (menuRect.width / 2)
      
      // Keep within horizontal bounds
      if (left < 8) {
        left = 8
      } else if (left + menuRect.width > viewportWidth - 8) {
        left = viewportWidth - menuRect.width - 8
      }
      
      // Vertical positioning
      const spaceBelow = viewportHeight - position.y - 8
      const spaceAbove = position.y - 8
      
      if (spaceBelow >= menuRect.height) {
        top = position.y + 8
      } else if (spaceAbove >= menuRect.height) {
        top = position.y - menuRect.height - 8
      } else if (spaceAbove > spaceBelow) {
        top = 8
        maxHeight = spaceAbove - 8
      } else {
        top = position.y + 8
        maxHeight = spaceBelow - 8
      }
      
      setMenuPosition({
        top,
        left,
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
      })
    }
  }, [position])

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] bg-slate-800 rounded-lg shadow-2xl border border-slate-600 min-w-[200px]"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        maxHeight: menuPosition.maxHeight
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className={menuPosition.maxHeight !== 'auto' ? 'overflow-y-auto' : ''}
        style={{ maxHeight: menuPosition.maxHeight }}
      >
        <div className="p-2 space-y-1">
          <button
            onClick={() => onAction('battlefield')}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <Swords className="w-4 h-4" />
            Play to Battlefield
          </button>
          
          <button
            onClick={() => onAction('graveyard')}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <Skull className="w-4 h-4" />
            Discard
          </button>

          <button
            onClick={() => onAction('exile')}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <Flame className="w-4 h-4" />
            Exile
          </button>

          <div className="border-t border-slate-700 my-1" />

          <button
            onClick={() => onAction('library_top')}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            To Library Top
          </button>

          <button
            onClick={() => onAction('library_bottom')}
            className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            To Library Bottom
          </button>
        </div>
      </div>
    </div>
  )
}