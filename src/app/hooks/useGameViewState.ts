// app/hooks/useCardGameViewState.ts

import { useState } from 'react'

export function useCardGameViewState() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [viewingZone, setViewingZone] = useState<{ playerId: string, zone: string } | null>(null)
  const [showTokenCreator, setShowTokenCreator] = useState(false)

  return {
    selectedPlayerId,
    setSelectedPlayerId,
    hoveredCard,
    setHoveredCard,
    viewingZone,
    setViewingZone,
    showTokenCreator,
    setShowTokenCreator
  }
}