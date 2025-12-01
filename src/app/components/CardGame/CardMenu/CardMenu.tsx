'use client'

import { useState, useEffect, useRef } from 'react'
import type { Card } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'

interface CardMenuProps {
  card: Card
  cardData: any
  playerId: string
  cardGameId: string
  zone: string
  isCurrentPlayer: boolean
  spectatorMode: boolean
  isMenuOpen: boolean
  onToggleMenu: () => void
  onClose: () => void
}

export function CardMenu({
  card,
  cardData,
  playerId,
  cardGameId,
  zone,
  isCurrentPlayer,
  spectatorMode,
  isMenuOpen,
  onToggleMenu,
  onClose
}: CardMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, maxHeight: 'auto' })
  
  useEffect(() => {
    if (isMenuOpen && buttonRef.current && menuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let top = buttonRect.bottom + 4
      let left = buttonRect.left - 100
      let maxHeight: string | number = 'auto'
      
      // Horizontal positioning - keep menu in viewport
      if (left < 8) {
        // Too close to left edge
        left = 8
      } else if (left + menuRect.width > viewportWidth - 8) {
        // Too close to right edge
        left = viewportWidth - menuRect.width - 8
      }
      
      // Vertical positioning - handle bottom overflow
      const spaceBelow = viewportHeight - buttonRect.bottom - 4
      const spaceAbove = buttonRect.top - 4
      
      if (spaceBelow < menuRect.height && spaceAbove > spaceBelow) {
        // Not enough space below and more space above - position above button
        top = buttonRect.top - menuRect.height - 4
        maxHeight = Math.min(menuRect.height, spaceAbove - 8)
      } else if (spaceBelow < menuRect.height) {
        // Not enough space below or above - enable scrolling
        maxHeight = Math.max(200, spaceBelow - 8)
      }
      
      // Final bounds check
      if (top < 8) {
        top = 8
        maxHeight = Math.min(viewportHeight - 16, menuRect.height)
      }
      
      setMenuPosition({
        top,
        left,
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
      })
    }
  }, [isMenuOpen])
  
  const handleAction = async (action: string) => {
    if (spectatorMode) {
      alert('Spectators cannot perform actions')
      onClose()
      return
    }
    
    try {
      switch (action) {
        case 'play':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: zone,
              toZone: 'battlefield',
              position: { x: 100, y: 50 },
              isFaceUp: true
            }
          })
          break
        case 'play_facedown':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: zone,
              toZone: 'battlefield',
              position: { x: 100, y: 50 },
              isFaceUp: false
            }
          })
          break
        case 'discard':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: zone,
              toZone: 'graveyard'
            }
          })
          break
        case 'exile':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: zone,
              toZone: 'exile'
            }
          })
          break
        case 'bottom':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: zone,
              toZone: 'library',
              toPosition: 'bottom'
            }
          })
          break
        case 'top':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: zone,
              toZone: 'library',
              toPosition: 'top'
            }
          })
          break
      }
      onClose()
    } catch (err) {
      console.error('Failed to perform action:', err)
    }
  }
  
  const showFaceUp = zone === 'hand' || card.isFaceUp || isCurrentPlayer
  const imageUrl = showFaceUp && cardData ? 
    (cardData.validatedImageUrl || cardData.image_uris?.normal || cardData.image_uris?.large || cardData.image_uris?.small) : null
  
  return (
    <>
      <div className="relative aspect-[2.5/3.5] bg-gradient-to-br from-slate-700 to-slate-800 rounded border-2 border-slate-600 overflow-visible">
        {/* Card Image */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={cardData?.name || 'Card'}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-card.png'
              e.currentTarget.onerror = null
            }}
          />
        ) : showFaceUp ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900 to-amber-950 text-xs text-white p-1 rounded">
            <p className="text-center break-words">{cardData?.name || 'Card'}</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950 border-4 border-blue-700 rounded">
            <div className="text-center">
              <div className="text-4xl mb-1">🎴</div>
              <div className="text-xs text-blue-300">MTG</div>
            </div>
          </div>
        )}
        
        {/* Menu button */}
        {(zone === 'hand' || zone === 'library' || zone === 'command' || zone === 'graveyard' || zone === 'exile') && isCurrentPlayer && !spectatorMode && (
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation()
              onToggleMenu()
            }}
            className="absolute top-1 right-1 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors z-10 backdrop-blur-sm"
          >
            ⋯
          </button>
        )}
      </div>
      
      {/* Context menu */}
      {isMenuOpen && !spectatorMode && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div 
            ref={menuRef}
            className="fixed z-50 bg-slate-900 rounded-lg shadow-2xl border-2 border-slate-700 min-w-[180px] max-w-[220px]"
            style={{ 
              top: `${menuPosition.top}px`, 
              left: `${menuPosition.left}px`,
              maxHeight: menuPosition.maxHeight
            }}
          >
            <div className={menuPosition.maxHeight !== 'auto' ? 'overflow-y-auto' : ''} style={{ maxHeight: menuPosition.maxHeight }}>
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => handleAction('play')} 
                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-800 rounded transition-colors text-sm flex items-center gap-2"
                >
                  <span>🎴</span>
                  <span>Play to Battlefield</span>
                </button>
                <button 
                  onClick={() => handleAction('play_facedown')} 
                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-800 rounded transition-colors text-sm flex items-center gap-2"
                >
                  <span>🃏</span>
                  <span>Play Face Down</span>
                </button>
                
                <div className="border-t border-slate-700 my-1"></div>
                
                <button 
                  onClick={() => handleAction('discard')} 
                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-800 rounded transition-colors text-sm flex items-center gap-2"
                >
                  <span>🪦</span>
                  <span>Discard</span>
                </button>
                <button 
                  onClick={() => handleAction('exile')} 
                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-800 rounded transition-colors text-sm flex items-center gap-2"
                >
                  <span>⭕</span>
                  <span>Exile</span>
                </button>
                
                <div className="border-t border-slate-700 my-1"></div>
                
                <button 
                  onClick={() => handleAction('top')} 
                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-800 rounded transition-colors text-sm flex items-center gap-2"
                >
                  <span>⬆️</span>
                  <span>To Top of Library</span>
                </button>
                <button 
                  onClick={() => handleAction('bottom')} 
                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-800 rounded transition-colors text-sm flex items-center gap-2"
                >
                  <span>⬇️</span>
                  <span>To Bottom of Library</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}