// app/components/CardGame/CardGameBoard/TopBar/OpponentCarousel.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import CompactOpponentCard from '@/app/components/CardGame/CardGameBoard/ui/CompactOpponentCard'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface OpponentCarouselProps {
  opponents: MTGPlayer[]
  isCollapsed: boolean
  selectedPlayerId: string | null
  onSelectOpponent: (playerId: string) => void
  onViewZone: (playerId: string, zone: string) => void
}

const BATCH_DELAY = 2000 // 2 seconds between batches

export default function OpponentCarousel({
  opponents,
  isCollapsed,
  selectedPlayerId,
  onSelectOpponent,
  onViewZone
}: OpponentCarouselProps) {
  const [displayedOpponents, setDisplayedOpponents] = useState<MTGPlayer[]>([])
  const [pendingOpponents, setPendingOpponents] = useState<MTGPlayer[]>([])
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevOpponentsRef = useRef<MTGPlayer[]>([])

  // Detect new opponents and batch them
  useEffect(() => {
    const currentIds = new Set(displayedOpponents.map(o => o.id))
    const newOpponents = opponents.filter(o => !currentIds.has(o.id))

    if (newOpponents.length > 0) {
      // Add to pending queue (only if truly new - check prev ref to prevent loops)
      const prevIds = new Set(prevOpponentsRef.current.map(o => o.id))
      const actuallyNew = newOpponents.filter(o => !prevIds.has(o.id))

      if (actuallyNew.length > 0) {
        setPendingOpponents(prev => {
          // Deduplicate before adding
          const pendingIds = new Set(prev.map(p => p.id))
          const uniqueNew = actuallyNew.filter(o => !pendingIds.has(o.id))
          return [...uniqueNew, ...prev]
        })

        // Start batch timer if not already running
        if (!batchTimerRef.current) {
          batchTimerRef.current = setTimeout(() => {
            // Flush pending to displayed
            setPendingOpponents(current => {
              if (current.length > 0) {
                setDisplayedOpponents(prev => [...current, ...prev]) // Newest on LEFT
              }
              return []
            })
            batchTimerRef.current = null
          }, BATCH_DELAY)
        }
      }
    }

    // Handle removed opponents (immediate removal)
    const opponentIds = new Set(opponents.map(o => o.id))
    setDisplayedOpponents(prev => prev.filter(o => opponentIds.has(o.id)))
    setPendingOpponents(prev => prev.filter(o => opponentIds.has(o.id)))

    // Update existing opponents (for life changes, etc)
    setDisplayedOpponents(prev =>
      prev.map(displayed =>
        opponents.find(o => o.id === displayed.id) || displayed
      )
    )

    prevOpponentsRef.current = opponents
  }, [opponents, displayedOpponents])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
      }
    }
  }, [])

  // Immediate render of pending opponents (for smooth animation)
  // They appear immediately but in a "joining" state
  const allDisplayed = [...pendingOpponents, ...displayedOpponents]

  return (
    <div className="h-full p-2 overflow-x-auto overflow-y-visible">
      <div className="flex gap-2 h-full">
        {allDisplayed.map((opponent, index) => {
          const isPending = index < pendingOpponents.length
          
          return (
            <div 
              key={opponent.id} 
              className={`shrink-0 relative transition-all duration-500 ${
                isPending ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}
              style={{ width: isCollapsed ? 'auto' : '280px' }}
            >
              <CompactOpponentCard
                player={opponent}
                isCollapsed={isCollapsed}
                isSelected={selectedPlayerId === opponent.id}
                onClick={() => onSelectOpponent(opponent.id)}
                onViewZone={(zone) => onViewZone(opponent.id, zone)}
              />
              
              {/* "Joining..." indicator for pending */}
              {isPending && !isCollapsed && (
                <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  Joining...
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}