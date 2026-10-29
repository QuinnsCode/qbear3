// app/components/CardGame/Battlefield/BattlefieldContainer.tsx
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { Card, CardGameState } from '@/app/services/cardGame/CardGameState'
import { BattlefieldCard } from './BattlefieldCard'
import { SelectionBox } from './SelectionBox'
import { useMultiSelect } from '@/app/hooks/cardGame/useMultiSelect'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import CardContextMenu from '@/app/components/CardGame/CardGameBoard/ui/CardContextMenu'
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
    isSandbox?: boolean
    onHover: (cardId: string | null) => void
    getCardData: (scryfallId: string, card?: Card) => any
    onDropCard?: (cardId: string, fromZone: string, position: { x: number, y: number }) => void
}

export function BattlefieldContainer({
  cards,
  gameState,
  cardGameId,
  playerId,
  isCurrentPlayer,
  isSandbox = false,
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
  const [scale, setScale] = useState(1)
  const [multiDragDelta, setMultiDragDelta] = useState<{ dx: number, dy: number } | null>(null)

  const SCALE_MIN = 0.25
  const SCALE_MAX = 2.0
  const SCALE_STEP = 0.25

  const adjustScale = useCallback((delta: number) => {
    setScale(s => Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round((s + delta) * 100) / 100)))
  }, [])
  
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
    clearSelection,
    getBoxBounds
  } = useMultiSelect({
    onTapSelected: handleTapSelected,
    onUntapSelected: handleUntapSelected
  })

  // Mobile selection mode — tap cards to toggle instead of replace
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false)

  // Auto-exit mobile selection mode when selection empties
  useEffect(() => {
    if (isMobileSelectionMode && selectedCards.size === 0) {
      setIsMobileSelectionMode(false)
    }
  }, [isMobileSelectionMode, selectedCards.size])

  const lastClampedDelta = useRef({ dx: 0, dy: 0 })
  // Positions we expect the server to confirm — cleared when cards prop matches
  const pendingMoveRef = useRef<{ cardId: string, position: { x: number, y: number } }[] | null>(null)

  const handleMultiDragMove = useCallback((dx: number, dy: number) => {
    const selectedCardsList = Array.from(selectedCards)
      .map(id => cards.find(c => c.instanceId === id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)

    if (selectedCardsList.length === 0) return

    // Compute group bounding box so we clamp the entire group, not individual cards
    const leftmost = Math.min(...selectedCardsList.map(c => c.position.x))
    const rightmost = Math.max(...selectedCardsList.map(c => c.position.x + BATTLEFIELD_CONFIG.CARD_WIDTH))
    const topmost = Math.min(...selectedCardsList.map(c => c.position.y))
    const bottommost = Math.max(...selectedCardsList.map(c => c.position.y + BATTLEFIELD_CONFIG.CARD_HEIGHT))

    const clampedDx = Math.max(-leftmost, Math.min(BATTLEFIELD_CONFIG.WIDTH - rightmost, dx))
    const clampedDy = Math.max(-topmost, Math.min(BATTLEFIELD_CONFIG.HEIGHT - bottommost, dy))

    lastClampedDelta.current = { dx: clampedDx, dy: clampedDy }
    setMultiDragDelta({ dx: clampedDx, dy: clampedDy })
  }, [selectedCards, cards])

  const handleMultiDragEnd = useCallback(async (_dx: number, _dy: number) => {
    // Use the last group-clamped delta (not raw delta from dragging card)
    const { dx, dy } = lastClampedDelta.current

    const updates = Array.from(selectedCards).map(cardId => {
      const card = cards.find(c => c.instanceId === cardId)
      if (!card) return null
      return { cardId, position: { x: card.position.x + dx, y: card.position.y + dy } }
    }).filter((u): u is { cardId: string, position: { x: number, y: number } } => u !== null)

    if (updates.length > 0) {
      // Record expected positions — the useEffect below clears multiDragDelta
      // when the server broadcast confirms these positions arrived in cards
      pendingMoveRef.current = updates
      applyCardGameAction(cardGameId, {
        type: 'move_cards_batch_position',
        playerId,
        data: { updates }
      }).catch(err => {
        console.error('Failed to batch move cards:', err)
        pendingMoveRef.current = null
        setMultiDragDelta(null)
      })
    } else {
      setMultiDragDelta(null)
    }
  }, [selectedCards, cards, cardGameId, playerId])

  // Clear multiDragDelta once the server confirms the moved positions via WebSocket broadcast
  useEffect(() => {
    if (!pendingMoveRef.current || !multiDragDelta) return

    const allConfirmed = pendingMoveRef.current.every(({ cardId, position }) => {
      const card = cards.find(c => c.instanceId === cardId)
      if (!card) return false
      return Math.abs(card.position.x - position.x) < 1 && Math.abs(card.position.y - position.y) < 1
    })

    if (allConfirmed) {
      pendingMoveRef.current = null
      setMultiDragDelta(null)
    }
  }, [cards, multiDragDelta])
  
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
      scrollOffset.top,
      scale
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
    if (isShiftPressed || isMobileSelectionMode) {
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
      scrollOffset.top,
      scale
    )

    return bounds
  }
  
  const battlefieldSelectionBox = getSelectionBoxInBattlefieldSpace()
  
  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-full bg-slate-900 rounded-lg overflow-scroll select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: '#94a3b8 #1e293b'
        }}
      >
        {/* Scaled battlefield surface */}
        <div
          ref={battlefieldRef}
          className="relative bg-slate-800/50"
          style={{
            width: `${BATTLEFIELD_CONFIG.WIDTH * scale}px`,
            height: `${BATTLEFIELD_CONFIG.HEIGHT * scale}px`,
            minWidth: `${BATTLEFIELD_CONFIG.WIDTH * scale}px`,
            minHeight: `${BATTLEFIELD_CONFIG.HEIGHT * scale}px`
          }}
          onDoubleClick={(e) => {
            // Double-click on empty battlefield area → deselect all
            if (e.target === battlefieldRef.current && selectedCards.size > 0) {
              clearSelection()
            }
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
              scrollOffset.top,
              scale
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
              cardData={getCardData(card.scryfallId, card)}
              isCurrentPlayer={isCurrentPlayer}
              playerId={playerId}
              cardGameId={cardGameId}
              scrollOffset={scrollOffset}
              scale={scale}
              onHover={() => onHover(card.instanceId)}
              isSelected={selectedCards.has(card.instanceId)}
              selectedCount={selectedCards.size}
              multiDragDelta={selectedCards.has(card.instanceId) ? multiDragDelta : null}
              isDraggingMulti={multiDragDelta !== null}
              onMultiDragMove={handleMultiDragMove}
              onMultiDragEnd={handleMultiDragEnd}
              onDeselectAll={clearSelection}
              isMobileSelectionMode={isMobileSelectionMode}
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
        
        {/* Desktop keyboard shortcuts indicator */}
        {selectedCards.size > 0 && !spectatorMode && (
          <div className="hidden lg:block fixed top-4 left-4 bg-slate-900/90 text-white px-3 py-2 rounded-lg text-xs border border-amber-500/50 shadow-lg z-50">
            <div className="font-bold mb-1">🔥 {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''} selected</div>
            <div className="text-gray-400">
              <kbd className="bg-slate-700 px-1 rounded">T</kbd> Tap | <kbd className="bg-slate-700 px-1 rounded">U</kbd> Untap
              {selectedCards.size > 1 && <> | drag any to move all | double-click empty to deselect</>}
            </div>
          </div>
        )}

        {/* Mobile selection mode toggle — top-right tab, mirrors the player name tab style */}
        {!spectatorMode && (
          <div className="lg:hidden absolute top-0 right-2 z-20">
            {isMobileSelectionMode ? (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setIsMobileSelectionMode(false); clearSelection() }}
                className="bg-amber-700/90 hover:bg-amber-600/90 text-white rounded-b-lg px-3 py-1 border border-t-0 border-amber-600/60 flex items-center gap-1.5 shadow-lg text-xs font-medium backdrop-blur-sm"
              >
                {selectedCards.size > 0 ? `${selectedCards.size} selected` : 'Select'} · Done
              </button>
            ) : (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setIsMobileSelectionMode(true)}
                className="bg-slate-800/70 hover:bg-slate-800/90 text-slate-300 rounded-b-lg px-3 py-1 border border-t-0 border-slate-600/60 shadow-lg text-xs backdrop-blur-sm"
              >
                ☐ Select
              </button>
            )}
          </div>
        )}
        
        {/* Selection box - positioned within battlefield space using your styled component */}
        {selectionBox && battlefieldSelectionBox && (
          <SelectionBox
            box={{
              left: battlefieldSelectionBox.x * scale,
              top: battlefieldSelectionBox.y * scale,
              width: battlefieldSelectionBox.width * scale,
              height: battlefieldSelectionBox.height * scale,
            }}
          />
        )}
        
        {/* Floating zoom controls — top-left, fixed position */}
        {!spectatorMode && (
          <div className="fixed top-4 left-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-lg select-none"
            style={{ boxShadow: '0 0 8px rgba(168, 85, 247, 0.15)' }}
          >
            <button
              onPointerDown={(e) => { e.stopPropagation(); adjustScale(-SCALE_STEP) }}
              className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 hover:bg-slate-700 transition-all rounded-md"
              title="Zoom out (25%)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-300 w-12 text-center tabular-nums font-medium">
              {Math.round(scale * 100)}%
            </span>
            <button
              onPointerDown={(e) => { e.stopPropagation(); adjustScale(SCALE_STEP) }}
              className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 hover:bg-slate-700 transition-all rounded-md"
              title="Zoom in (25%)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        )}
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
          isSandbox={isSandbox}
        />
      )}
    </>
  )
}