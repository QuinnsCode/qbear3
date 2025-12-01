// app/components/CardGame/Battlefield/BattlefieldCard.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { Card } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import { BATTLEFIELD_CONFIG, clampToBattlefield, screenToBattlefield } from '@/app/lib/cardGame/battlefieldCoordinates'

interface Props {
  card: Card
  cardData: any
  isCurrentPlayer: boolean
  playerId: string
  cardGameId: string
  scrollOffset: { left: number; top: number }
  onHover: () => void
  isSelected: boolean
  onSelect: () => void
  spectatorMode?: boolean
  onContextMenu?: (e: React.MouseEvent) => void
}

export function BattlefieldCard({
  card,
  cardData,
  isCurrentPlayer,
  playerId,
  cardGameId,
  scrollOffset,
  onHover,
  isSelected,
  onSelect,
  spectatorMode = false,
  onContextMenu
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Card position is now stored directly in battlefield coordinates
  const [localPosition, setLocalPosition] = useState({ x: card.position.x, y: card.position.y })
  const [isDragging, setIsDragging] = useState(false)
  const ignoreServerUpdatesUntil = useRef<number>(0)
  
  // Double tap/click detection
  const lastTapTime = useRef<number>(0)
  const DOUBLE_TAP_DELAY = 300 // ms
  
  useEffect(() => {
    const now = Date.now()
    if (isDragging || now < ignoreServerUpdatesUntil.current) {
      return
    }
    
    // Update from server state (already in battlefield coordinates)
    setLocalPosition({ x: card.position.x, y: card.position.y })
  }, [card.position, isDragging])
  
  // Handle tap/untap (rotate 90 degrees clockwise)
  const handleTapCard = async () => {
    if (!isCurrentPlayer || spectatorMode) return
    
    const newRotation = card.rotation === 90 ? 0 : 90
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'rotate_card',
        playerId: playerId,
        data: {
          cardId: card.instanceId,
          rotation: newRotation
        }
      })
    } catch (err) {
      console.error('Failed to tap/untap card:', err)
    }
  }
  
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCurrentPlayer || spectatorMode) return
    e.stopPropagation() // Prevent battlefield selection box
    
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime.current
    
    // Check for double tap/click
    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      e.preventDefault()
      handleTapCard()
      lastTapTime.current = 0
      return
    }
    
    lastTapTime.current = now
    
    // Single click - select card
    onSelect()
    
    // Start drag after a short delay to distinguish from double-tap
    const dragStartTimeout = setTimeout(() => {
      startDrag(e)
    }, DOUBLE_TAP_DELAY)
    
    const cancelDrag = () => {
      clearTimeout(dragStartTimeout)
      document.removeEventListener('mouseup', cancelDrag)
      document.removeEventListener('touchend', cancelDrag)
    }
    
    document.addEventListener('mouseup', cancelDrag, { once: true })
    document.addEventListener('touchend', cancelDrag, { once: true })
  }
  
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCurrentPlayer || spectatorMode) return
    e.preventDefault()
    setIsDragging(true)
    
    const cardRect = cardRef.current?.getBoundingClientRect()
    if (!cardRect) return
    
    const parent = cardRef.current?.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    
    const getClientPos = (event: MouseEvent | TouchEvent) => {
      if ('touches' in event && event.touches.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY }
      }
      return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
    }
    
    const startPos = 'touches' in e ? 
      { x: e.touches[0].clientX, y: e.touches[0].clientY } :
      { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
    
    const offsetX = startPos.x - cardRect.left
    const offsetY = startPos.y - cardRect.top
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientPos = getClientPos(moveEvent)
      
      // Convert screen position to battlefield position
      const screenX = clientPos.x - parentRect.left - offsetX
      const screenY = clientPos.y - parentRect.top - offsetY
      
      const battlefieldPos = screenToBattlefield(
        screenX,
        screenY,
        scrollOffset.left,
        scrollOffset.top
      )
      
      // Clamp to battlefield bounds
      const clampedPos = clampToBattlefield(battlefieldPos.x, battlefieldPos.y)
      
      // ✅ INSTANT CLIENT UPDATE - NO SERVER CALL
      setLocalPosition(clampedPos)
    }
    
    const handleEnd = (upEvent: MouseEvent | TouchEvent) => {
      const clientPos = 'changedTouches' in upEvent && upEvent.changedTouches.length > 0 ?
        { x: upEvent.changedTouches[0].clientX, y: upEvent.changedTouches[0].clientY } :
        getClientPos(upEvent)
      
      // Convert final screen position to battlefield position
      const screenX = clientPos.x - parentRect.left - offsetX
      const screenY = clientPos.y - parentRect.top - offsetY
      
      const battlefieldPos = screenToBattlefield(
        screenX,
        screenY,
        scrollOffset.left,
        scrollOffset.top
      )
      
      // Clamp to battlefield bounds
      const clampedPos = clampToBattlefield(battlefieldPos.x, battlefieldPos.y)
      
      // ✅ IGNORE SERVER UPDATES FOR 500MS (client prediction)
      ignoreServerUpdatesUntil.current = Date.now() + 500
      setLocalPosition(clampedPos)
      
      // ✅ ONLY COMMIT FINAL POSITION TO SERVER (on mouse up)
      // Position is now in battlefield coordinates, not normalized
      applyCardGameAction(cardGameId, {
        type: 'move_card_position',
        playerId: playerId,
        data: { 
          cardId: card.instanceId,
          position: clampedPos
        }
      }).catch(err => {
        console.error('Failed to update position:', err)
        ignoreServerUpdatesUntil.current = 0
      })
      
      setIsDragging(false)
      
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
    
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }
  
  const getCardImageUrl = () => {
    const isFaceUp = card.isFaceUp !== false
    
    if (!isFaceUp || !cardData) return null
    return cardData.image_uris?.small || cardData.image_uris?.normal || cardData.image_uris?.large
  }
  
  const imageUrl = getCardImageUrl()
  const isFaceUp = card.isFaceUp !== false
  const isTapped = card.rotation === 90
  
  return (
    <div
      ref={cardRef}
      onContextMenu={onContextMenu}
      className={`absolute rounded border-2 shadow-lg overflow-hidden select-none ${
        isCurrentPlayer && !spectatorMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${isDragging ? 'z-50' : 'z-10'} ${spectatorMode ? '' : 'touch-none'} ${
        isSelected 
          ? 'ring-4 ring-amber-500 ring-offset-2 ring-offset-slate-900 border-orange-500' 
          : isFaceUp 
            ? (isTapped ? 'border-orange-500' : 'border-amber-500') 
            : 'border-blue-700'
      }`}
      style={{
        // Position in battlefield space (absolute positioning within battlefield)
        left: `${localPosition.x}px`,
        top: `${localPosition.y}px`,
        width: `${BATTLEFIELD_CONFIG.CARD_WIDTH}px`,
        height: `${BATTLEFIELD_CONFIG.CARD_HEIGHT}px`,
        transform: `rotate(${card.rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        boxShadow: isSelected 
          ? '0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.4)' 
          : undefined
      }}
      onMouseDown={spectatorMode ? undefined : handlePointerDown}
      onTouchStart={spectatorMode ? undefined : handlePointerDown}
      onMouseEnter={onHover}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={cardData?.name || 'Card'}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : isFaceUp ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900 to-amber-950 text-xs text-white p-1">
          <p className="text-center break-words">
            {cardData?.name || 'Card'}
          </p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950 border-4 border-blue-700">
          <div className="text-center">
            <div className="text-2xl">🎴</div>
            <div className="text-[8px] text-blue-300">MTG</div>
          </div>
        </div>
      )}
      
      {/* Tapped indicator overlay */}
      {isTapped && (
        <div className="absolute inset-0 bg-orange-500/20 pointer-events-none" />
      )}
      
      {/* Selected indicator glow */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-500/30 pointer-events-none animate-pulse" />
      )}
    </div>
  )
}