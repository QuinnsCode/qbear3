// app/components/CardGame/Mobile/MobileOpponentBubble.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface Props {
  player: MTGPlayer
  onClick: () => void
  isActive?: boolean
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
      className="fixed bg-slate-800 rounded-lg shadow-xl border-2 border-slate-500 p-3 z-[9999] min-w-[200px] pointer-events-none"
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

export default function MobileOpponentBubble({ player, onClick, isActive = false }: Props) {
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
      
      // Auto-hide after 3 seconds
      autoHideTimerRef.current = setTimeout(() => {
        setShowHover(false)
      }, 3000)
    }, 500)
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

  // Desktop: Mouse hover
  const handleMouseEnter = () => {
    cancelLongPress()
    cancelAutoHide()
    setShowHover(true)
  }

  const handleMouseLeave = () => {
    cancelLongPress()
    cancelAutoHide()
    setShowHover(false)
  }

  // Mobile: Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't prevent default - let normal touch behavior work
    startLongPress()
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    cancelLongPress()
    // If long press didn't trigger, treat as normal click
    if (longPressTimerRef.current) {
      // Normal click through to onClick
    }
  }

  const handleTouchMove = () => {
    cancelLongPress()
  }

  const handleClick = (e: React.MouseEvent) => {
    // Hide hover on click so it doesn't interfere
    setShowHover(false)
    cancelAutoHide()
    onClick()
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={`flex-1 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border-2 transition-all ${
          isActive 
            ? 'border-yellow-400 shadow-lg shadow-yellow-500/50' 
            : 'border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full border border-white flex-shrink-0"
            style={{ backgroundColor: player.cursorColor }}
          />
          
          <div className="text-white text-xs font-semibold truncate flex-1 text-left">
            {player.name}
          </div>
          
          <div className="text-green-400 text-xs font-bold flex-shrink-0">
            💚{player.life}
          </div>
        </div>
        
        <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
          <span>🃏 {player.zones.hand.length}</span>
          <span>⚔️ {player.zones.battlefield.length}</span>
          <span>📜 {player.zones.library.length}</span>
        </div>
      </button>

      {showHover && mounted && typeof window !== 'undefined' && createPortal(
        <HoverCard player={player} position={position} />,
        document.body
      )}
    </>
  )
}