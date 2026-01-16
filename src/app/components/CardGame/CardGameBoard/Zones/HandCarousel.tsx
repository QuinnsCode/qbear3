// app/components/CardGame/CardGameBoard/Zones/HandCarousel.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Hand, ZoomIn, ZoomOut, MoreVertical } from 'lucide-react'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'
import CardContextMenu from './CardContextMenu'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'

interface HandCarouselProps {
  player: MTGPlayer
  gameState: CardGameState
  isViewingHand?: boolean
  onViewZone: (zone: string) => void
  cardGameId: string
}

export default function HandCarousel({
  player,
  gameState,
  isViewingHand = false,
  onViewZone,
  cardGameId
}: HandCarouselProps) {
  const [handCardScale, setHandCardScale] = useState(1)
  const [contextMenu, setContextMenu] = useState<{
    cardId: string
    cardName: string
    position: { x: number; y: number }
  } | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  
  const cardWidth = Math.max(80, Math.min(240, 160 * handCardScale))

  const handleContextMenu = useCallback((e: React.MouseEvent, cardId: string, cardName: string) => {
    e.preventDefault()
    setContextMenu({
      cardId,
      cardName,
      position: { x: e.clientX, y: e.clientY }
    })
  }, [])

  const handleMenuButtonClick = useCallback((e: React.MouseEvent, cardId: string, cardName: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({
      cardId,
      cardName,
      position: { x: rect.right + 5, y: rect.top }
    })
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent, cardId: string, cardName: string) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0]
      setContextMenu({
        cardId,
        cardName,
        position: { x: touch.clientX, y: touch.clientY }
      })
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleMoveCard = async (cardId: string, toZone: string, options?: { position?: { x: number; y: number }; isFaceUp?: boolean }) => {
    try {
      await applyCardGameAction(cardGameId, {
        type: 'move_card',
        playerId: player.id,
        data: {
          cardId,
          fromZone: 'hand',
          toZone,
          position: options?.position || { x: 100, y: 50 },
          isFaceUp: options?.isFaceUp ?? true
        }
      })
    } catch (error) {
      console.error('Failed to move card:', error)
    }
  }

  const closeContextMenu = () => setContextMenu(null)

  return (
    <div className="flex-[3] flex flex-col gap-2 min-w-0">
      {/* Hand Cards Carousel */}
      <div className="flex-1 flex gap-2 min-w-0">
        <div className="flex-1 bg-slate-900 rounded-lg p-3 border-2 border-slate-700 relative overflow-hidden">
          <div className="absolute inset-0 p-3 flex gap-3 overflow-x-auto pb-2 scroll-smooth">
            {player.zones.hand.map(cardId => {
              const card = gameState.cards[cardId]
              if (!card) return null
              
              const cardData = player.deckList?.cardData?.find(c => c.id === card.scryfallId)
              const imageUrl = cardData?.image_uris?.normal || cardData?.image_uris?.small
              const cardName = cardData?.name || 'Card'
              
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
                  onContextMenu={(e) => handleContextMenu(e, cardId, cardName)}
                  onTouchStart={(e) => handleTouchStart(e, cardId, cardName)}
                  onTouchEnd={handleTouchEnd}
                  onMouseEnter={() => setHoveredCard(cardId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`rounded-lg border-2 border-slate-600 flex-shrink-0 shadow-xl overflow-hidden hover:scale-105 transition-transform relative ${
                    isViewingHand ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                  }`}
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardWidth * 1.4}px`
                  }}
                >
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={cardName}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-sm text-white p-2">
                      <p className="text-center break-words">{cardName}</p>
                    </div>
                  )}

                  {(hoveredCard === cardId || contextMenu?.cardId === cardId) && (
                    <button
                      onClick={(e) => handleMenuButtonClick(e, cardId, cardName)}
                      className="absolute top-1/2 right-1 -translate-y-1/2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full p-1 shadow-lg transition-colors z-10"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Vertical Slider */}
        <div className="w-8 bg-slate-900 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center py-4 gap-2">
          <ZoomIn className="w-3 h-3 text-slate-400" />
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={handCardScale}
            onChange={(e) => setHandCardScale(parseFloat(e.target.value))}
            className="h-32 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
            style={{ 
              writingMode: 'vertical-lr',
              width: '4px'
            }}
          />
          <ZoomOut className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] text-slate-400" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
            {Math.round(handCardScale * 100)}%
          </span>
        </div>

        {/* View All Button */}
        {/* <button
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
        </button> */}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <CardContextMenu
          cardId={contextMenu.cardId}
          cardName={contextMenu.cardName}
          position={contextMenu.position}
          isOpen={!!contextMenu}
          onClose={closeContextMenu}
          onPlayFaceUp={() => handleMoveCard(contextMenu.cardId, 'battlefield', { isFaceUp: true })}
          onPlayFaceDown={() => handleMoveCard(contextMenu.cardId, 'battlefield', { isFaceUp: false })}
          onMoveToGraveyard={() => handleMoveCard(contextMenu.cardId, 'graveyard')}
          onMoveToExile={() => handleMoveCard(contextMenu.cardId, 'exile')}
          onMoveToLibraryTop={() => handleMoveCard(contextMenu.cardId, 'library', { position: { x: 0, y: 0 } })}
          onMoveToLibraryBottom={() => handleMoveCard(contextMenu.cardId, 'library', { position: { x: 0, y: player.zones.library.length } })}
          onViewDetails={() => {
            console.log('View details for:', contextMenu.cardId)
          }}
        />
      )}
    </div>
  )
}