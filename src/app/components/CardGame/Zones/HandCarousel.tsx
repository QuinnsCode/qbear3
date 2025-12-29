// app/components/CardGame/Zones/HandCarousel.tsx
'use client'

import { useState } from 'react'
import { Hand, ZoomIn, ZoomOut } from 'lucide-react'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'

interface HandCarouselProps {
  player: MTGPlayer
  gameState: CardGameState
  isViewingHand?: boolean
  onViewZone: (zone: string) => void
}

export default function HandCarousel({
  player,
  gameState,
  isViewingHand = false,
  onViewZone
}: HandCarouselProps) {
  const [handCardScale, setHandCardScale] = useState(1)
  
  // Calculate card width based on scale (min 80px, default 160px, max 240px)
  const cardWidth = Math.max(80, Math.min(240, 160 * handCardScale))

  return (
    <div className="flex-[3] flex flex-col gap-2 min-w-0">
      {/* Scale Controls - Minimal and compact */}
      <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded">
        <ZoomOut className="w-3 h-3 text-slate-400" />
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={handCardScale}
          onChange={(e) => setHandCardScale(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
        />
        <ZoomIn className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-400 w-8 text-right">{Math.round(handCardScale * 100)}%</span>
      </div>

      {/* Hand Cards Carousel */}
      <div className="flex-1 flex gap-2 min-w-0">
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
                  className={`rounded-lg border-2 border-slate-600 flex-shrink-0 shadow-xl overflow-hidden hover:scale-105 transition-transform ${
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

        {/* View All Button */}
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
    </div>
  )
}