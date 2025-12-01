// app/components/CardGame/Battlefield/BattlefieldContainer.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import type { Card, CardGameState } from '@/app/services/cardGame/CardGameState'
import { BattlefieldCard } from './BattlefieldCard'
import { SelectionBox } from './SelectionBox'
import { useMultiSelect } from '@/app/hooks/cardGame/useMultiSelect'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import CardContextMenu from '../CardContextMenu'
import { 
  BATTLEFIELD_CONFIG, 
  screenToBattlefield,
  clampToBattlefield,
  cardIntersectsSelection,
  getSelectionBounds
} from '@/app/lib/cardGame/battlefieldCoordinates'

interface Props {
    cards: Card[]
    gameState: CardGameState
    cardGameId: string
    playerId: string
    isCurrentPlayer: boolean
    spectatorMode: boolean
    onHover: (cardId: string | null) => void
    getCardData: (scryfallId: string) => any
    onDropCard?: (cardId: string, fromZone: string, position: { x: number, y: number }) => void
}

export function BattlefieldContainer({
  cards,
  gameState,
  cardGameId,
  playerId,
  isCurrentPlayer,
  spectatorMode,
  onHover,
  getCardData,
  onDropCard
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const battlefieldRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 600 })
  const [scrollOffset, setScrollOffset] = useState({ left: 0, top: 0 })
  const [contextMenu, setContextMenu] = useState<{ card: Card, x: number, y: number } | null>(null)
  
  // Handle tap/untap for selected cards
  const handleTapSelected = async () => {
    if (spectatorMode || !isCurrentPlayer) return
    
    console.log('🔥 Tapping', selectedCards.size, 'cards in one batch')
    
    const cardIds = Array.from(selectedCards)
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'rotate_cards_batch',
        playerId: playerId,
        data: {
          cardIds: cardIds,
          rotation: 90
        }
      })
    } catch (err) {
      console.error('Failed to tap cards:', err)
    }
  }
  
  const handleUntapSelected = async () => {
    if (spectatorMode || !isCurrentPlayer) return
    
    console.log('✨ Untapping', selectedCards.size, 'cards in one batch')
    
    const cardIds = Array.from(selectedCards)
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'rotate_cards_batch',
        playerId: playerId,
        data: {
          cardIds: cardIds,
          rotation: 0
        }
      })
    } catch (err) {
      console.error('Failed to untap cards:', err)
    }
  }
  
  const {
    selectedCards,
    selectionBox,
    isShiftPressed,
    startSelection,
    updateSelection,
    endSelection,
    selectCardsInBox,
    toggleCard,
    selectCard,
    getBoxBounds
  } = useMultiSelect({
    onTapSelected: handleTapSelected,
    onUntapSelected: handleUntapSelected
  })
  
  // Update viewport size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setViewportSize({ width: rect.width, height: rect.height })
      }
    }
    
    updateSize()
    
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => resizeObserver.disconnect()
  }, [])
  
  // Track scroll position
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      setScrollOffset({
        left: container.scrollLeft,
        top: container.scrollTop
      })
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Update selection when dragging - using battlefield coordinates
  useEffect(() => {
    if (!selectionBox) return
    
    // Get selection bounds in battlefield space
    const selectionBounds = getSelectionBounds(
      selectionBox.startX,
      selectionBox.startY,
      selectionBox.currentX,
      selectionBox.currentY,
      scrollOffset.left,
      scrollOffset.top
    )
    
    // Check which cards intersect with selection box (both in battlefield space)
    const cardsWithBounds = cards.map(card => ({
      id: card.instanceId,
      bounds: {
        x: card.position.x,
        y: card.position.y,
        width: BATTLEFIELD_CONFIG.CARD_WIDTH,
        height: BATTLEFIELD_CONFIG.CARD_HEIGHT
      }
    }))
    
    selectCardsInBox(cardsWithBounds)
  }, [selectionBox, cards, scrollOffset, selectCardsInBox])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (spectatorMode || !isCurrentPlayer) return
    
    // Only start selection box if clicking directly on battlefield (not on a card)
    if (e.target !== battlefieldRef.current) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    // Store viewport-relative coordinates for selection box rendering
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top
    
    startSelection(viewportX, viewportY)
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top
    
    updateSelection(viewportX, viewportY)
  }
  
  const handleMouseUp = () => {
    endSelection()
  }
  
  const handleCardSelect = (cardId: string) => {
    if (isShiftPressed) {
      toggleCard(cardId)
    } else {
      selectCard(cardId)
    }
  }
  
  // Convert selection box from viewport coords to battlefield coords for rendering
  const getSelectionBoxInBattlefieldSpace = () => {
    if (!selectionBox) return null
    
    const bounds = getSelectionBounds(
      selectionBox.startX,
      selectionBox.startY,
      selectionBox.currentX,
      selectionBox.currentY,
      scrollOffset.left,
      scrollOffset.top
    )
    
    return bounds
  }
  
  const battlefieldSelectionBox = getSelectionBoxInBattlefieldSpace()
  
  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-full bg-slate-900 rounded-lg overflow-auto select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          // Custom scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 #1e293b'
        }}
      >
        {/* Fixed-size battlefield surface */}
        <div
          ref={battlefieldRef}
          className="relative bg-slate-800/50"
          style={{
            width: `${BATTLEFIELD_CONFIG.WIDTH}px`,
            height: `${BATTLEFIELD_CONFIG.HEIGHT}px`,
            minWidth: `${BATTLEFIELD_CONFIG.WIDTH}px`,
            minHeight: `${BATTLEFIELD_CONFIG.HEIGHT}px`
          }}
          onDragOver={(e) => {
            if (spectatorMode) return
            e.preventDefault()
          }}
          onDrop={(e) => {
            if (spectatorMode) {
              console.log('🔍 Spectator mode - drop blocked')
              return
            }
            
            console.log('💧 Drop event fired!')
            e.preventDefault()
            
            const cardId = e.dataTransfer.getData('cardId')
            console.log('📦 Dropped card:', cardId)
            
            const fromZone = e.dataTransfer.getData('fromZone')
            
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            
            // Convert screen coordinates to battlefield coordinates
            const screenX = e.clientX - rect.left
            const screenY = e.clientY - rect.top
            
            const battlefieldPos = screenToBattlefield(
              screenX,
              screenY,
              scrollOffset.left,
              scrollOffset.top
            )
            
            // Clamp to battlefield bounds
            const clampedPos = clampToBattlefield(battlefieldPos.x, battlefieldPos.y)
            
            onDropCard?.(cardId, fromZone, clampedPos)
          }}
        >
          {/* Empty state */}
          {cards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
              <div className="text-center">
                <div className="text-4xl mb-2">🌟</div>
                <p>No cards on battlefield</p>
                {!spectatorMode && <p className="text-sm mt-2">Drag cards here to play</p>}
                <p className="text-xs text-gray-600 mt-4">
                  🗺️ Battlefield: {BATTLEFIELD_CONFIG.WIDTH} x {BATTLEFIELD_CONFIG.HEIGHT}
                </p>
              </div>
            </div>
          )}
          
          {/* Cards - positioned in battlefield space */}
          {cards.map(card => (
            <BattlefieldCard
              key={card.instanceId}
              card={card}
              cardData={getCardData(card.scryfallId)}
              isCurrentPlayer={isCurrentPlayer}
              playerId={playerId}
              cardGameId={cardGameId}
              scrollOffset={scrollOffset}
              onHover={() => onHover(card.instanceId)}
              isSelected={selectedCards.has(card.instanceId)}
              onSelect={() => handleCardSelect(card.instanceId)}
              spectatorMode={spectatorMode}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({
                  card,
                  x: e.clientX,
                  y: e.clientY
                })
              }}
            />
          ))}
        </div>
        
        {/* Keyboard shortcuts indicator - fixed to viewport */}
        {selectedCards.size > 0 && !spectatorMode && (
          <div className="fixed top-4 left-4 bg-slate-900/90 text-white px-3 py-2 rounded-lg text-xs border border-amber-500/50 shadow-lg z-50">
            <div className="font-bold mb-1">🔥 {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''} selected</div>
            <div className="text-gray-400">
              <kbd className="bg-slate-700 px-1 rounded">T</kbd> Tap | <kbd className="bg-slate-700 px-1 rounded">U</kbd> Untap
            </div>
          </div>
        )}
        
        {/* Selection box - positioned within battlefield space using your styled component */}
        {selectionBox && battlefieldSelectionBox && (
          <SelectionBox 
            box={{
              left: battlefieldSelectionBox.x,
              top: battlefieldSelectionBox.y,
              width: battlefieldSelectionBox.width,
              height: battlefieldSelectionBox.height,
            }}
          />
        )}
        
        {/* Scroll indicator */}
        <div className="fixed bottom-4 right-4 bg-slate-900/90 text-white px-3 py-1 rounded-lg text-xs z-50 pointer-events-none">
          📍 {Math.round(scrollOffset.left)} x {Math.round(scrollOffset.top)}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <CardContextMenu
          card={contextMenu.card}
          cardGameId={cardGameId}
          playerId={playerId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          spectatorMode={spectatorMode || !isCurrentPlayer}
        />
      )}
    </>
  )
}