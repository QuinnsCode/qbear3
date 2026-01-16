// app/components/CardGame/CardGameBoard/BattlefieldMinimap/BattlefieldMinimapModal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import { PlayerCarousel } from './PlayerCarousel'

interface BattlefieldMinimapModalProps {
  gameState: CardGameState
  currentPlayerId: string
  onSelectPlayer: (playerId: string) => void
  onClose: () => void
}

export function BattlefieldMinimapModal({ 
  gameState, 
  currentPlayerId, 
  onSelectPlayer,
  onClose 
}: BattlefieldMinimapModalProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null) // null = centered
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMobile) return // No dragging on mobile
    
    // Only drag if clicking on header
    if (!(e.target as HTMLElement).closest('.drag-handle')) return
    
    setIsDragging(true)
    
    // Calculate offset from current position
    const rect = modalRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }
  
  // Handle dragging with bounds checking
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return
      
      const modalWidth = modalRef.current.offsetWidth
      const modalHeight = modalRef.current.offsetHeight
      
      let newX = e.clientX - dragOffset.x
      let newY = e.clientY - dragOffset.y
      
      // Keep modal on screen with padding
      const padding = 20
      const maxX = window.innerWidth - modalWidth - padding
      const maxY = window.innerHeight - modalHeight - padding
      
      newX = Math.max(padding, Math.min(newX, maxX))
      newY = Math.max(padding, Math.min(newY, maxY))
      
      setPosition({ x: newX, y: newY })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])
  
  // Handle clicking minimap to select player and close
  const handleSelectPlayer = (playerId: string) => {
    onSelectPlayer(playerId)
    onClose()
  }
  
  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  
  // Mobile fullscreen version
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
          onClick={onClose}
        />
        
        {/* Fullscreen Mobile Modal */}
        <div className="fixed inset-4 bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-600 z-[100] flex flex-col">
          {/* Header */}
          <div className="bg-slate-700 px-4 py-3 rounded-t-xl flex items-center justify-between border-b border-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              <span className="text-white font-bold text-lg">Battlefield Overview</span>
            </div>
            
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-2xl transition-all"
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-2">
            <PlayerCarousel
              gameState={gameState}
              currentPlayerId={currentPlayerId}
              onSelectPlayer={handleSelectPlayer}
            />
          </div>
          
          {/* Hint */}
          <div className="px-4 py-2 text-center text-slate-400 text-xs border-t border-slate-700">
            Tap minimap to focus | Tap arrows to navigate
          </div>
        </div>
      </>
    )
  }
  
  // Desktop draggable version
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-600 z-[100] select-none"
        style={{
          left: position ? `${position.x}px` : '50%',
          top: position ? `${position.y}px` : '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
          width: 'min(700px, 90vw)',
          height: 'min(800px, 90vh)',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onMouseDown={handleDragStart}
      >
        {/* Header - draggable area */}
        <div className="drag-handle bg-slate-700 px-4 py-3 rounded-t-xl flex items-center justify-between cursor-move border-b border-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <span className="text-white font-bold text-lg">Battlefield Overview</span>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 h-[calc(100%-60px)] overflow-hidden">
          <PlayerCarousel
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onSelectPlayer={handleSelectPlayer}
          />
        </div>
        
        {/* Hint */}
        <div className="absolute bottom-2 left-0 right-0 text-center text-slate-400 text-xs">
          Click minimap to focus | Arrow keys to navigate | ESC to close
        </div>
      </div>
    </>
  )
}