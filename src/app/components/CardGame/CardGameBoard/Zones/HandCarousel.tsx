// app/components/CardGame/CardGameBoard/Zones/HandCarousel.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut, CheckSquare, Square, Play, EyeOff, Trash2 } from 'lucide-react'
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

  // ── local hand order (client-side reordering) ────────────────────────────
  const [cardOrder, setCardOrder] = useState<string[]>(player.zones.hand)

  // Keep local order in sync with server state:
  // - Remove cards that have left the hand
  // - Append newly drawn cards at the end while preserving existing order
  useEffect(() => {
    setCardOrder(prev => {
      const handSet = new Set(player.zones.hand)
      const filtered = prev.filter(id => handSet.has(id))
      const existing = new Set(filtered)
      const newCards = player.zones.hand.filter(id => !existing.has(id))
      return [...filtered, ...newCards]
    })
  }, [player.zones.hand])

  // Drag-to-reorder state
  const [reorderDragging, setReorderDragging] = useState<string | null>(null)
  const [reorderInsertIndex, setReorderInsertIndex] = useState<number | null>(null)
  const handContainerRef = useRef<HTMLDivElement>(null)

  // ── selection mode ────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

  const toggleSelectionMode = () => {
    setSelectionMode(m => !m)
    setSelectedCards(new Set())
  }

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  // Clear selection on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false)
        setSelectedCards(new Set())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectionMode])

  // ── card width from scale ─────────────────────────────────────────────────
  const cardWidth = Math.max(80, Math.min(240, 160 * handCardScale))

  // ── context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, cardId: string, cardName: string) => {
    if (selectionMode) { e.preventDefault(); return }
    e.preventDefault()
    setContextMenu({ cardId, cardName, position: { x: e.clientX, y: e.clientY } })
  }, [selectionMode])

  const handleMenuButtonClick = useCallback((e: React.MouseEvent, cardId: string, cardName: string) => {
    if (selectionMode) return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({ cardId, cardName, position: { x: rect.right + 5, y: rect.top } })
  }, [selectionMode])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // ── zone move ─────────────────────────────────────────────────────────────
  const handleMoveCard = async (
    cardId: string,
    toZone: string,
    options?: { position?: { x: number; y: number }; isFaceUp?: boolean }
  ) => {
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

  // ── bulk actions ──────────────────────────────────────────────────────────
  const handleBulkAction = async (action: 'play-up' | 'play-down' | 'discard') => {
    const ids = Array.from(selectedCards)
    if (ids.length === 0) return

    const toZone = action === 'discard' ? 'graveyard' : 'battlefield'
    const isFaceUp = action !== 'play-down'

    // Stagger positions slightly so cards don't stack perfectly
    await Promise.all(ids.map((cardId, i) =>
      handleMoveCard(cardId, toZone, {
        position: { x: 100 + i * 30, y: 50 + i * 20 },
        isFaceUp
      })
    ))

    setSelectedCards(new Set())
    setSelectionMode(false)
  }

  // ── drag-to-reorder helpers ───────────────────────────────────────────────
  const getInsertIndex = useCallback((clientX: number): number => {
    const container = handContainerRef.current
    if (!container) return cardOrder.length
    const cardEls = container.querySelectorAll<HTMLElement>('[data-card-id]')
    let insertIdx = cardEls.length
    for (let i = 0; i < cardEls.length; i++) {
      const rect = cardEls[i].getBoundingClientRect()
      if (clientX < rect.left + rect.width / 2) {
        insertIdx = i
        break
      }
    }
    return insertIdx
  }, [cardOrder.length])

  const applyReorder = useCallback((draggingId: string, insertIdx: number) => {
    setCardOrder(prev => {
      const sourceIdx = prev.indexOf(draggingId)
      if (sourceIdx === -1) return prev
      const without = prev.filter(id => id !== draggingId)
      const adjustedIdx = insertIdx > sourceIdx ? insertIdx - 1 : insertIdx
      const result = [...without]
      result.splice(Math.max(0, Math.min(adjustedIdx, result.length)), 0, draggingId)
      return result
    })
  }, [])

  // HTML5 drag-to-reorder
  const handleReorderDragStart = (e: React.DragEvent, cardId: string) => {
    if (isViewingHand || selectionMode) { e.preventDefault(); return }
    e.dataTransfer.setData('hand-reorder', cardId)
    // Also set zone data so battlefield drop still works if dragged there
    e.dataTransfer.setData('cardId', cardId)
    e.dataTransfer.setData('fromZone', 'hand')
    e.dataTransfer.setData('playerId', player.id)
    setReorderDragging(cardId)
  }

  const handleReorderDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('hand-reorder')) return
    e.preventDefault()
    setReorderInsertIndex(getInsertIndex(e.clientX))
  }

  const handleReorderDrop = (e: React.DragEvent) => {
    const draggingId = e.dataTransfer.getData('hand-reorder')
    if (!draggingId) return
    e.preventDefault()
    e.stopPropagation()
    applyReorder(draggingId, getInsertIndex(e.clientX))
    setReorderDragging(null)
    setReorderInsertIndex(null)
  }

  const handleReorderDragEnd = () => {
    setReorderDragging(null)
    setReorderInsertIndex(null)
  }

  // Touch-based reorder
  const touchReorderRef = useRef<{ id: string; startX: number; moved: boolean } | null>(null)

  const handleCardTouchStart = useCallback((e: React.TouchEvent, cardId: string, cardName: string) => {
    touchReorderRef.current = { id: cardId, startX: e.touches[0].clientX, moved: false }
    longPressTimer.current = setTimeout(() => {
      if (touchReorderRef.current && !touchReorderRef.current.moved) {
        touchReorderRef.current = null
        const touch = e.touches[0]
        setContextMenu({ cardId, cardName, position: { x: touch.clientX, y: touch.clientY } })
      }
    }, 500)
  }, [])

  const handleCardTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchReorderRef.current) return
    const dx = Math.abs(e.touches[0].clientX - touchReorderRef.current.startX)
    if (dx > 8) {
      touchReorderRef.current.moved = true
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
    if (touchReorderRef.current.moved) {
      setReorderInsertIndex(getInsertIndex(e.touches[0].clientX))
    }
  }, [getInsertIndex])

  const handleCardTouchEnd = useCallback((e: React.TouchEvent) => {
    handleTouchEnd()
    const ref = touchReorderRef.current
    if (!ref) return
    if (ref.moved) {
      applyReorder(ref.id, getInsertIndex(e.changedTouches[0].clientX))
    }
    touchReorderRef.current = null
    setReorderDragging(null)
    setReorderInsertIndex(null)
  }, [handleTouchEnd, getInsertIndex, applyReorder])

  const closeContextMenu = () => setContextMenu(null)

  return (
    <div className="flex-[3] flex flex-col gap-2 min-w-0">
      {/* Hand Cards Carousel */}
      <div className="flex-1 flex gap-2 min-w-0">
        <div className="flex-1 bg-slate-900 rounded-lg border-2 border-slate-700 relative overflow-hidden flex flex-col">

          {/* Header: hand count + selection toggle */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
            <span className="text-xs text-slate-400 font-semibold">
              Hand ({cardOrder.length})
              {selectionMode && selectedCards.size > 0 && (
                <span className="ml-2 text-purple-400">{selectedCards.size} selected</span>
              )}
            </span>
            {!isViewingHand && (
              <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectionMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
                title={selectionMode ? 'Exit selection mode (Esc)' : 'Select cards for bulk actions'}
              >
                {selectionMode ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline ml-0.5">{selectionMode ? 'Selecting' : 'Select'}</span>
              </button>
            )}
          </div>

          {/* Cards row */}
          <div
            ref={handContainerRef}
            className="flex-1 relative overflow-x-auto pb-2 scroll-smooth"
            onDragOver={handleReorderDragOver}
            onDrop={handleReorderDrop}
            onDragLeave={(e) => {
              // Only clear if leaving the container entirely
              if (!handContainerRef.current?.contains(e.relatedTarget as Node)) {
                setReorderInsertIndex(null)
              }
            }}
          >
            <div className="absolute inset-0 flex gap-3 px-3 items-start pt-2">
              {cardOrder.map((cardId, idx) => {
                const card = gameState.cards[cardId]
                if (!card) return null

                const cardData = player.deckList?.cardData?.find(c => c.id === card.scryfallId)
                const imageUrl = cardData?.image_uris?.normal || cardData?.image_uris?.small
                const cardName = cardData?.name || 'Card'
                const isSelected = selectedCards.has(cardId)
                const isDraggingThis = reorderDragging === cardId

                return (
                  <div key={cardId} className="relative flex-shrink-0 flex items-center">
                    {/* Drop insertion indicator left of this card */}
                    {reorderInsertIndex === idx && reorderDragging && (
                      <div
                        className="w-0.5 bg-blue-400 rounded-full mr-1 flex-shrink-0"
                        style={{ height: `${cardWidth * 1.4}px` }}
                      />
                    )}

                    <div
                      data-card-id={cardId}
                      draggable={!isViewingHand && !selectionMode}
                      onDragStart={(e) => handleReorderDragStart(e, cardId)}
                      onDragEnd={handleReorderDragEnd}
                      onContextMenu={(e) => handleContextMenu(e, cardId, cardName)}
                      onTouchStart={(e) => {
                        if (selectionMode) return
                        handleCardTouchStart(e, cardId, cardName)
                      }}
                      onTouchMove={handleCardTouchMove}
                      onTouchEnd={handleCardTouchEnd}
                      onMouseEnter={() => setHoveredCard(cardId)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => {
                        if (selectionMode) toggleCardSelection(cardId)
                      }}
                      className={`rounded-lg border-2 shadow-xl overflow-hidden transition-transform relative ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-500 scale-105'
                          : 'border-slate-600 hover:scale-105'
                      } ${isDraggingThis ? 'opacity-40' : ''} ${
                        selectionMode
                          ? 'cursor-pointer'
                          : isViewingHand
                            ? 'cursor-default'
                            : 'cursor-grab active:cursor-grabbing'
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

                      {/* Selection overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-purple-500/20 pointer-events-none" />
                      )}

                      {/* Hover menu button (non-selection mode only) */}
                      {!selectionMode && (hoveredCard === cardId || contextMenu?.cardId === cardId) && (
                        <button
                          onClick={(e) => handleMenuButtonClick(e, cardId, cardName)}
                          className="absolute top-1/2 right-1 -translate-y-1/2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full p-1 shadow-lg transition-colors z-10"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Trailing insertion indicator */}
              {reorderInsertIndex === cardOrder.length && reorderDragging && (
                <div
                  className="w-0.5 bg-blue-400 rounded-full flex-shrink-0"
                  style={{ height: `${cardWidth * 1.4}px` }}
                />
              )}
            </div>
          </div>

          {/* Bulk action bar — visible when selection mode is on and cards are chosen */}
          {selectionMode && selectedCards.size > 0 && (
            <div className="shrink-0 flex flex-wrap gap-2 px-3 py-2 bg-slate-800/90 border-t border-slate-600">
              <button
                onClick={() => handleBulkAction('play-up')}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                style={{ minHeight: '36px' }}
              >
                <Play className="w-3.5 h-3.5" />
                Play Face-Up ({selectedCards.size})
              </button>
              <button
                onClick={() => handleBulkAction('play-down')}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                style={{ minHeight: '36px' }}
              >
                <EyeOff className="w-3.5 h-3.5" />
                Face-Down ({selectedCards.size})
              </button>
              <button
                onClick={() => handleBulkAction('discard')}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                style={{ minHeight: '36px' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard ({selectedCards.size})
              </button>
            </div>
          )}
        </div>

        {/* Hand Zoom Controls - +/- Buttons */}
        <div className="w-10 bg-slate-900 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center py-2 gap-1">
          <button
            onClick={() => setHandCardScale(s => Math.min(1.5, s + 0.1))}
            disabled={handCardScale >= 1.5}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 hover:bg-slate-700 transition-all rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-slate-400 font-medium py-1">
            {Math.round(handCardScale * 100)}%
          </span>
          <button
            onClick={() => setHandCardScale(s => Math.max(0.5, s - 0.1))}
            disabled={handCardScale <= 0.5}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-purple-400 hover:bg-slate-700 transition-all rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
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
