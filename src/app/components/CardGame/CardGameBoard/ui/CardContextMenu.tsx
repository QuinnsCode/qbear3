// app/components/CardGame/CardContextMenu.tsx
'use client'

import { useRef, useEffect } from 'react'
import type { Card } from '@/app/services/cardGame/CardGameState'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import { MenuItem } from './MenuItem'
import { Gamepad2 } from 'lucide-react'

interface Props {
  card: Card
  cardGameId: string
  playerId: string
  position: { x: number, y: number }
  onClose: () => void
  spectatorMode?: boolean
  isSandbox?: boolean
}

export default function CardContextMenu({
  card,
  cardGameId,
  playerId,
  position,
  onClose,
  spectatorMode = false,
  isSandbox = false
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

  const isBattlefieldCard = card.zone === 'battlefield'
  const isOwnCard = card.ownerId === playerId
  
  // ✅ DETERMINE WHAT'S DISABLED
  const isBlocked = spectatorMode || (!isOwnCard && !(isSandbox && isBattlefieldCard))
  const isToHandDisabled = isSandbox && !isOwnCard
  const isToLibraryDisabled = isSandbox && !isOwnCard

  const handleAction = async (action: string, isDisabled?: boolean, reason?: string) => {
    if (isDisabled) {
      alert(reason || 'This action is not available')
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
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'library', toPosition: 'top' }
          })
          break
        case 'toLibraryBottom':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: { cardId: card.instanceId, fromZone: 'battlefield', toZone: 'library', toPosition: 'bottom' }
          })
          break
      }
    } catch (error) {
      console.error('Failed to perform card action:', error)
      alert('Failed to perform action. Check console for details.')
    }
    
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-1 min-w-[200px] z-[100]"
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        maxHeight: 'calc(100vh - 20px)',
        overflowY: 'auto'
      }}
    >
      {/* Debug Info */}
      {!isOwnCard && (
        <div className="px-3 py-2 text-xs text-yellow-400 border-b border-slate-600">
          ⚠️ Not your card
          {isSandbox && isBattlefieldCard && <span className="text-purple-400"> (Sandbox: Limited actions)</span>}
        </div>
      )}

      {/* Card State Actions */}
      <MenuItemButton
        onClick={() => handleAction(card.rotation === 90 ? 'untap' : 'tap', isBlocked, 
          spectatorMode ? 'Spectators cannot modify cards' : 'This is not your card')}
        disabled={isBlocked}
      >
        {card.rotation === 90 ? '↪️ Untap' : '↩️ Tap'}
        {isBlocked && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      <MenuItemButton
        onClick={() => handleAction('flip', isBlocked,
          spectatorMode ? 'Spectators cannot modify cards' : 'This is not your card')}
        disabled={isBlocked}
      >
        🔄 {card.isFaceUp ? 'Flip Face Down' : 'Flip Face Up'}
        {isBlocked && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      <MenuItemButton
        onClick={() => handleAction('rotate', isBlocked,
          spectatorMode ? 'Spectators cannot modify cards' : 'This is not your card')}
        disabled={isBlocked}
      >
        🔃 Rotate 90°
        {isBlocked && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>

      <div className="border-t border-slate-600 my-1" />

      {/* Move Actions */}
      <MenuItemButton
        onClick={() => handleAction('toHand', isToHandDisabled, 
          'In sandbox mode, you can only return cards to your own hand')}
        disabled={isToHandDisabled || isBlocked}
      >
        🃏 To Hand
        {isToHandDisabled && <span className="text-xs text-purple-400 ml-2">(Owner Only)</span>}
        {isBlocked && !isToHandDisabled && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      <MenuItemButton
        onClick={() => handleAction('toGraveyard', isBlocked,
          spectatorMode ? 'Spectators cannot modify cards' : 'This is not your card')}
        disabled={isBlocked}
      >
        🪦 To Graveyard
        {isBlocked && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      <MenuItemButton
        onClick={() => handleAction('toExile', isBlocked,
          spectatorMode ? 'Spectators cannot modify cards' : 'This is not your card')}
        disabled={isBlocked}
      >
        💫 To Exile
        {isBlocked && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      <div className="border-t border-slate-600 my-1" />
      
      <MenuItemButton
        onClick={() => handleAction('toLibraryTop', isToLibraryDisabled,
          'In sandbox mode, you can only return cards to your own library')}
        disabled={isToLibraryDisabled || isBlocked}
      >
        📜⬆️ To Library Top
        {isToLibraryDisabled && <span className="text-xs text-purple-400 ml-2">(Owner Only)</span>}
        {isBlocked && !isToLibraryDisabled && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      <MenuItemButton
        onClick={() => handleAction('toLibraryBottom', isToLibraryDisabled,
          'In sandbox mode, you can only return cards to your own library')}
        disabled={isToLibraryDisabled || isBlocked}
      >
        📜⬇️ To Library Bottom
        {isToLibraryDisabled && <span className="text-xs text-purple-400 ml-2">(Owner Only)</span>}
        {isBlocked && !isToLibraryDisabled && <span className="text-xs text-slate-500 ml-2">(Blocked)</span>}
      </MenuItemButton>
      
      {isSandbox && isBattlefieldCard && !isOwnCard && (
        <>
          <div className="border-t border-slate-600 my-1" />
          <div className="px-3 py-2 text-xs text-purple-400">
            <Gamepad2 className='text-white'/> Sandbox: Shared battlefield
          </div>
        </>
      )}
    </div>
  )
}

// ✅ NEW: MenuItemButton with disabled state
function MenuItemButton({ 
  onClick, 
  disabled, 
  children 
}: { 
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
        disabled 
          ? 'text-slate-500 cursor-not-allowed bg-slate-900' 
          : 'text-white hover:bg-slate-700 cursor-pointer'
      }`}
    >
      {children}
    </button>
  )
}