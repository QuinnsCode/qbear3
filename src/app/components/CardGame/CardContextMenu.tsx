// app/components/CardGame/CardContextMenu.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { Card } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import { MenuItem } from './ui/MenuItem'

interface Props {
  card: Card
  cardGameId: string
  playerId: string
  position: { x: number, y: number }
  onClose: () => void
  spectatorMode?: boolean
  isSandbox?: boolean  // ✅ ADD THIS
}

export default function CardContextMenu({
  card,
  cardGameId,
  playerId,
  position,
  onClose,
  spectatorMode = false,
  isSandbox = false  // ✅ ADD THIS
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleAction = async (action: string) => {
    // ✅ Block spectators completely (read-only observers)
    if (spectatorMode) {
      alert('Spectators cannot modify cards')
      onClose()
      return
    }

    // ✅ Sandbox chaos mode: Allow battlefield card manipulation by ANYONE
    const isBattlefieldCard = card.zone === 'battlefield'
    const isOwnCard = card.ownerId === playerId
    
    // ✅ Check ownership for non-battlefield zones
    if (!isSandbox && !isBattlefieldCard && !isOwnCard) {
      alert('You can only interact with your own cards in hand/library/graveyard')
      onClose()
      return
    }
    
    // ✅ In normal mode (not sandbox), check ownership for ALL zones
    if (!isSandbox && !isOwnCard) {
      alert('This is not your card')
      onClose()
      return
    }

    try {
      switch (action) {
        case 'tap':
          await applyCardGameAction(cardGameId, {
            type: 'tap_card',
            playerId,
            data: { cardId: card.instanceId }
          })
          break
        case 'untap':
          await applyCardGameAction(cardGameId, {
            type: 'untap_card',
            playerId,
            data: { cardId: card.instanceId }
          })
          break
        case 'flip':
          await applyCardGameAction(cardGameId, {
            type: 'flip_card',
            playerId,
            data: { cardId: card.instanceId, isFaceUp: !card.isFaceUp }
          })
          break
        case 'rotate':
          const newRotation = ((card.rotation || 0) + 90) % 360
          await applyCardGameAction(cardGameId, {
            type: 'rotate_card',
            playerId,
            data: { cardId: card.instanceId, rotation: newRotation }
          })
          break
        case 'toHand':
          // ✅ In sandbox, can only return cards to YOUR hand
          if (isSandbox && !isOwnCard) {
            alert('In sandbox mode, you can only return cards to your own hand')
            onClose()
            return
          }
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'hand' }
          })
          break
        case 'toGraveyard':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'graveyard' }
          })
          break
        case 'toExile':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'exile' }
          })
          break
        case 'toLibraryTop':
          // ✅ In sandbox, can only return cards to YOUR library
          if (isSandbox && !isOwnCard) {
            alert('In sandbox mode, you can only return cards to your own library')
            onClose()
            return
          }
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'library', position: 'top' }
          })
          break
        case 'toLibraryBottom':
          // ✅ In sandbox, can only return cards to YOUR library
          if (isSandbox && !isOwnCard) {
            alert('In sandbox mode, you can only return cards to your own library')
            onClose()
            return
          }
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'library', position: 'bottom' }
          })
          break
      }
    } catch (error) {
      console.error('Failed to perform card action:', error)
    }
    
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-1 min-w-[180px] z-[100]"
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        maxHeight: 'calc(100vh - 20px)',
        overflowY: 'auto'
      }}
    >
      {/* Card State Actions */}
      <MenuItem onClick={() => handleAction(card.isTapped ? 'untap' : 'tap')}>
        {card.isTapped ? '↪️ Untap' : '↩️ Tap'}
      </MenuItem>
      <MenuItem onClick={() => handleAction('flip')}>
        🔄 {card.isFaceUp ? 'Flip Face Down' : 'Flip Face Up'}
      </MenuItem>
      <MenuItem onClick={() => handleAction('rotate')}>
        🔃 Rotate 90°
      </MenuItem>

      <div className="border-t border-slate-600 my-1" />

      {/* Move Actions */}
      <MenuItem onClick={() => handleAction('toHand')}>
        🃏 To Hand {isSandbox && card.ownerId !== playerId ? '(Owner Only)' : ''}
      </MenuItem>
      <MenuItem onClick={() => handleAction('toGraveyard')}>
        🪦 To Graveyard
      </MenuItem>
      <MenuItem onClick={() => handleAction('toExile')}>
        💫 To Exile
      </MenuItem>
      
      <div className="border-t border-slate-600 my-1" />
      
      <MenuItem onClick={() => handleAction('toLibraryTop')}>
        📜⬆️ To Library Top {isSandbox && card.ownerId !== playerId ? '(Owner Only)' : ''}
      </MenuItem>
      <MenuItem onClick={() => handleAction('toLibraryBottom')}>
        📜⬇️ To Library Bottom {isSandbox && card.ownerId !== playerId ? '(Owner Only)' : ''}
      </MenuItem>
      
      {isSandbox && (
        <>
          <div className="border-t border-slate-600 my-1" />
          <div className="px-2 py-1 text-xs text-purple-400">
            🎮 Chaos Mode: Battlefield cards are shared!
          </div>
        </>
      )}
    </div>
  )
}