// app/components/CardGame/CardGameBoard/ui/CompactOpponentCard.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface CompactOpponentCardProps {
  player: MTGPlayer
  isCollapsed: boolean
  isSelected: boolean
  onClick: () => void
  onViewZone: (zone: string) => void
}

function HoverCard({ 
  player, 
  position 
}: { 
  player: MTGPlayer
  position: { top: number; left: number } 
}) {
  return (
    <div
      className="fixed bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-3 z-[9999] min-w-[200px] pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <div className="text-sm font-semibold text-white mb-2">{player.name}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-slate-300">
          <span>Life:</span>
          <span className="text-green-400 font-bold">{player.life}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Hand:</span>
          <span>{player.zones.hand.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Library:</span>
          <span>{player.zones.library.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Graveyard:</span>
          <span>{player.zones.graveyard.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Battlefield:</span>
          <span>{player.zones.battlefield.length}</span>
        </div>
      </div>
    </div>
  )
}

export default function CompactOpponentCard({
  player,
  isCollapsed,
  isSelected,
  onClick,
  onViewZone
}: CompactOpponentCardProps) {
  const [showHover, setShowHover] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (showHover && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
  }, [showHover])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current)
      }
    }
  }, [])

  const startLongPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowHover(true)
      
      // Auto-hide after 3 seconds (useful for touch/long-press)
      autoHideTimerRef.current = setTimeout(() => {
        setShowHover(false)
      }, 3000)
    }, 500) // 500ms long press
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const cancelAutoHide = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current)
      autoHideTimerRef.current = null
    }
  }

  // Desktop: Mouse hover (instant show)
  const handleMouseEnter = () => {
    cancelLongPress() // Cancel any ongoing long press
    cancelAutoHide() // Cancel auto-hide
    setShowHover(true)
  }

  const handleMouseLeave = () => {
    cancelLongPress()
    cancelAutoHide()
    setShowHover(false)
  }

  // Desktop: Mouse long press (for collapsed mobile-style on desktop)
  const handleMouseDown = () => {
    startLongPress()
  }

  const handleMouseUp = () => {
    cancelLongPress()
  }

  // Mobile: Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation() // Prevent interference
    startLongPress()
  }

  const handleTouchEnd = () => {
    cancelLongPress()
  }

  const handleTouchMove = () => {
    cancelLongPress() // Cancel if user scrolls
  }

  if (isCollapsed) {
    return (
      <>
        <button
          ref={buttonRef}
          // Desktop hover (immediate)
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          // Desktop & Mobile long press
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onClick={onClick}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: player.cursorColor }}
          />
          <span className="text-sm font-medium truncate max-w-[100px]">
            {player.name}
          </span>
          <span className="text-xs opacity-75">❤️ {player.life}</span>
        </button>

        {showHover && mounted && createPortal(
          <HoverCard player={player} position={position} />,
          document.body
        )}
      </>
    )
  }

  // Expanded state unchanged
  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-lg p-3 transition-all ${
        isSelected
          ? 'bg-blue-900/50 border-2 border-blue-500'
          : 'bg-slate-800 border-2 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: player.cursorColor }}
          />
          <span className="text-white font-semibold text-sm">{player.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xl">❤️</span>
          <span className="text-green-400 font-bold text-lg">{player.life}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between text-slate-300">
          <span>🃏 Hand</span>
          <span className="font-semibold">{player.zones.hand.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>📚 Library</span>
          <span className="font-semibold">{player.zones.library.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>⚰️ Graveyard</span>
          <span className="font-semibold">{player.zones.graveyard.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>⚔️ Board</span>
          <span className="font-semibold">{player.zones.battlefield.length}</span>
        </div>
      </div>
    </button>
  )
}