// app/components/CardGame/CardGameBoard/TopBar/OpponentCarousel.tsx
'use client'

import CompactOpponentCard from '@/app/components/CardGame/CardGameBoard/ui/CompactOpponentCard'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface OpponentCarouselProps {
  opponents: MTGPlayer[]
  isCollapsed: boolean
  selectedPlayerId: string | null
  onSelectOpponent: (playerId: string) => void
  onViewZone: (playerId: string, zone: string) => void
}

export default function OpponentCarousel({
  opponents,
  isCollapsed,
  selectedPlayerId,
  onSelectOpponent,
  onViewZone
}: OpponentCarouselProps) {
  return (
    <div className="h-full p-2 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-2 h-full">
        {opponents.map((opponent) => (
          <div 
            key={opponent.id} 
            className="flex-shrink-0" 
            style={{ width: isCollapsed ? 'auto' : '280px' }}
          >
            <CompactOpponentCard
              player={opponent}
              isCollapsed={isCollapsed}
              isSelected={selectedPlayerId === opponent.id}
              onClick={() => onSelectOpponent(opponent.id)}
              onViewZone={(zone) => onViewZone(opponent.id, zone)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}