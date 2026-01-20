// app/components/CardGame/CardGameBoard/Zones/CardContextMenu.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { Eye, Trash2, Flame, BookOpen, ArrowUp, ArrowDown } from 'lucide-react'

interface CardContextMenuProps {
  cardId: string
  cardName?: string
  position: { x: number; y: number }
  isOpen: boolean
  onClose: () => void
  onPlayFaceUp: () => void
  onPlayFaceDown: () => void
  onMoveToGraveyard: () => void
  onMoveToExile: () => void
  onMoveToLibraryTop: () => void
  onMoveToLibraryBottom: () => void
  onViewDetails?: () => void
}

export default function CardContextMenu({
  cardId,
  cardName,
  position,
  isOpen,
  onClose,
  onPlayFaceUp,
  onPlayFaceDown,
  onMoveToGraveyard,
  onMoveToExile,
  onMoveToLibraryTop,
  onMoveToLibraryBottom,
  onViewDetails
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    let newX = position.x
    let newY = position.y

    // Adjust horizontal position if menu goes off right edge
    if (position.x + menuRect.width > viewportWidth) {
      newX = viewportWidth - menuRect.width - 10
    }

    // Adjust vertical position if menu goes off bottom edge
    if (position.y + menuRect.height > viewportHeight) {
      // Try to position above the click point
      newY = position.y - menuRect.height
      
      // If that's still off-screen, clamp to bottom with padding
      if (newY < 0) {
        newY = viewportHeight - menuRect.height - 10
      }
    }

    // Ensure minimum padding from edges
    newX = Math.max(10, Math.min(newX, viewportWidth - menuRect.width - 10))
    newY = Math.max(10, Math.min(newY, viewportHeight - menuRect.height - 10))

    setAdjustedPosition({ x: newX, y: newY })
  }, [isOpen, position])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 z-40 lg:hidden"
        onClick={onClose}
      />
      
      <div
        ref={menuRef}
        className="fixed z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-600 py-1 min-w-[200px] max-h-[calc(100vh-20px)] overflow-y-auto"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 #1e293b'
        }}
      >
        {cardName && (
          <>
            <div className="px-3 py-2 text-xs text-slate-400 font-semibold truncate max-w-[200px]">
              {cardName}
            </div>
            <div className="border-t border-slate-600 my-1" />
          </>
        )}

        <MenuButton
          icon={<ArrowUp className="w-4 h-4" />}
          label="Play to Battlefield"
          onClick={() => handleAction(onPlayFaceUp)}
        />
        
        <MenuButton
          icon={<ArrowDown className="w-4 h-4" />}
          label="Play Face Down"
          onClick={() => handleAction(onPlayFaceDown)}
        />

        <div className="border-t border-slate-600 my-1" />

        <MenuButton
          icon={<Trash2 className="w-4 h-4" />}
          label="Move to Graveyard"
          onClick={() => handleAction(onMoveToGraveyard)}
        />

        <MenuButton
          icon={<Flame className="w-4 h-4" />}
          label="Move to Exile"
          onClick={() => handleAction(onMoveToExile)}
        />

        <div className="border-t border-slate-600 my-1" />

        <MenuButton
          icon={<BookOpen className="w-4 h-4" />}
          label="To Library (Top)"
          onClick={() => handleAction(onMoveToLibraryTop)}
        />

        <MenuButton
          icon={<BookOpen className="w-4 h-4" />}
          label="To Library (Bottom)"
          onClick={() => handleAction(onMoveToLibraryBottom)}
        />

        {onViewDetails && (
          <>
            <div className="border-t border-slate-600 my-1" />
            <MenuButton
              icon={<Eye className="w-4 h-4" />}
              label="View Card Details"
              onClick={() => handleAction(onViewDetails)}
            />
          </>
        )}
      </div>
    </>
  )
}

function MenuButton({ icon, label, onClick }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}