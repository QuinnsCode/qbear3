// app/components/CardGame/CardGameBoard/TopBar/TopBar.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import DragHandle from '../ui/DragHandle'
import OpponentCarousel from './OpponentCarousel'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface TopBarProps {
  opponents: MTGPlayer[]
  isCollapsed: boolean
  selectedPlayerId: string | null
  onSelectOpponent: (playerId: string) => void
  onViewZone: (playerId: string, zone: string) => void
}

const MIN_AD_WIDTH_PERCENT = 20
const DEFAULT_AD_WIDTH_PERCENT = 25

export default function TopBar({
  opponents,
  isCollapsed,
  selectedPlayerId,
  onSelectOpponent,
  onViewZone
}: TopBarProps) {
  const [adWidthPercent, setAdWidthPercent] = useState(DEFAULT_AD_WIDTH_PERCENT)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const initialWidthPercent = useRef(DEFAULT_AD_WIDTH_PERCENT)

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    initialWidthPercent.current = adWidthPercent
  }, [adWidthPercent])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.offsetWidth
      const deltaX = dragStartX.current - e.clientX // Inverted because we're dragging from right
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidthPercent = Math.max(MIN_AD_WIDTH_PERCENT, initialWidthPercent.current + deltaPercent)
      
      setAdWidthPercent(newWidthPercent)
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
  }, [isDragging])

  const opponentWidthPercent = 100 - adWidthPercent

  return (
    <div ref={containerRef} className="h-full flex">
      {/* Left: Opponent Carousel */}
      <div 
        className="overflow-hidden"
        style={{ width: `${opponentWidthPercent}%` }}
      >
        <OpponentCarousel
          opponents={opponents}
          isCollapsed={isCollapsed}
          selectedPlayerId={selectedPlayerId}
          onSelectOpponent={onSelectOpponent}
          onViewZone={onViewZone}
        />
      </div>

      {/* Vertical Drag Handle */}
      <DragHandle
        orientation="vertical"
        onDragStart={startDrag}
        isDragging={isDragging}
      />

      {/* Right: Ad/Info Space */}
      <div 
        className="bg-slate-700/50 flex items-center justify-center text-slate-400 text-sm"
        style={{ width: `${adWidthPercent}%` }}
      >
        {/* Placeholder for ads or other content */}
        <div className="text-center p-4">
          <div className="text-xs opacity-50">Ad Space</div>
          <div className="text-xs opacity-30 mt-1">{Math.round(adWidthPercent)}%</div>
        </div>
      </div>
    </div>
  )
}