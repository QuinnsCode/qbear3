'use client'

import { useState, useMemo } from 'react'
import type { MTGPlayer, CardGameState, Card } from '@/app/services/cardGame/CardGameState'
import { CardMenu } from '../CardMenu/CardMenu'

interface ZoneViewerProps {
  player: MTGPlayer
  zone: string
  gameState: CardGameState
  cardGameId: string
  isCurrentPlayer: boolean
  spectatorMode?: boolean
  onClose: () => void
}

export function ZoneViewer({ 
  player, 
  zone, 
  gameState, 
  cardGameId, 
  isCurrentPlayer,
  spectatorMode = false,
  onClose 
}: ZoneViewerProps) {
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Get card data helper
  const getCardData = (scryfallId: string) => {
    for (const p of gameState.players) {
      if (p.deckList?.cardData) {
        const found = p.deckList.cardData.find(c => c.id === scryfallId)
        if (found) return found
      }
    }
    return undefined
  }
  
  // Get zone cards - MEMOIZE THIS!
  const zoneCards = useMemo(() => {
    return player.zones[zone as keyof typeof player.zones]
      .map(id => gameState.cards[id])
      .filter((card): card is Card => card !== undefined)
  }, [player.zones, zone, gameState.cards])

  // Randomize ONCE when zone cards change
  const displayCards = useMemo(() => {
    return zone === 'library' 
      ? [...zoneCards].sort(() => Math.random() - 0.5)
      : zoneCards
  }, [zone, zoneCards])
  
  // Filter by search
  const filteredCards = displayCards.filter(card => {
    if (!searchQuery) return true
    const cardData = getCardData(card.scryfallId)
    return cardData?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })
  
  return (
    <div className="h-full flex flex-col bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold capitalize">
          {player.name}'s {zone}
          {spectatorMode && <span className="text-purple-400 ml-2">👁️ View Only</span>}
        </h2>
        <button
          onClick={onClose}
          className="text-white hover:text-red-400 transition-colors"
        >
          ✕ Close
        </button>
      </div>
      
      {/* Search Filter - Only for library */}
      {zone === 'library' && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
      
      {/* Cards Grid */}
      <div className="flex-1 overflow-auto">
        {filteredCards.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>{searchQuery ? 'No cards found' : `No cards in ${zone}`}</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filteredCards.map(card => (
              <CardMenu
                key={card.instanceId}
                card={card}
                cardData={getCardData(card.scryfallId)}
                playerId={player.id}
                cardGameId={cardGameId}
                zone={zone}
                isCurrentPlayer={isCurrentPlayer}
                spectatorMode={spectatorMode}
                isMenuOpen={cardMenuOpen === card.instanceId}
                onToggleMenu={() => setCardMenuOpen(
                  cardMenuOpen === card.instanceId ? null : card.instanceId
                )}
                onClose={() => setCardMenuOpen(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}