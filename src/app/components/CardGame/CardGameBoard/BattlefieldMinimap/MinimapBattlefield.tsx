// app/components/CardGame/CardGameBoard/BattlefieldMinimap/MinimapBattlefield.tsx
'use client'

import type { MTGPlayer, CardGameState, Card } from '@/app/services/cardGame/CardGameState'
import { BATTLEFIELD_CONFIG } from '@/app/lib/cardGame/battlefieldCoordinates'

interface MinimapBattlefieldProps {
  player: MTGPlayer
  gameState: CardGameState
  onClick: () => void
}

export function MinimapBattlefield({ 
  player, 
  gameState, 
  onClick 
}: MinimapBattlefieldProps) {
  // Get battlefield cards
  const battlefieldCards = player.zones.battlefield
    .map(id => gameState.cards[id])
    .filter((card): card is Card => card !== undefined)
  
  // Scale factor for minimap (adjust as needed)
  const scale = 0.12
  const minimapWidth = BATTLEFIELD_CONFIG.WIDTH * scale
  const minimapHeight = BATTLEFIELD_CONFIG.HEIGHT * scale
  
  // Helper to get card image
  const getCardImage = (card: Card) => {
    // Check if token
    if (card.isToken && card.tokenData?.imageUrl) {
      return card.tokenData.imageUrl
    }
    
    // Find card data in deck lists
    for (const p of gameState.players) {
      if (p.deckList?.cardData) {
        const found = p.deckList.cardData.find(c => c.id === card.scryfallId)
        if (found?.image_uris?.normal) {
          return found.image_uris.normal
        }
      }
    }
    return null
  }
  
  return (
    <div 
      className="relative bg-slate-900 rounded-lg border-2 border-blue-400 overflow-hidden cursor-pointer hover:border-blue-300 transition-all"
      style={{
        width: `${minimapWidth}px`,
        height: `${minimapHeight}px`,
      }}
      onClick={onClick}
    >
      {/* Minimap battlefield surface */}
      <div
        className="relative bg-slate-800/50"
        style={{
          width: `${BATTLEFIELD_CONFIG.WIDTH}px`,
          height: `${BATTLEFIELD_CONFIG.HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Empty state */}
        {battlefieldCards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
            <div className="text-center" style={{ transform: `scale(${1/scale})` }}>
              <div className="text-4xl mb-2">🌟</div>
              <p className="text-sm">Empty battlefield</p>
            </div>
          </div>
        )}
        
        {/* Cards as dots/thumbnails */}
        {battlefieldCards.map(card => {
          const imageUrl = getCardImage(card)
          
          return (
            <div
              key={card.instanceId}
              className="absolute rounded-sm overflow-hidden border border-yellow-400/50"
              style={{
                left: `${card.position.x}px`,
                top: `${card.position.y}px`,
                width: `${BATTLEFIELD_CONFIG.CARD_WIDTH}px`,
                height: `${BATTLEFIELD_CONFIG.CARD_HEIGHT}px`,
                transform: `rotate(${card.rotation || 0}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={card.name || 'Card'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>
                    {card.name?.substring(0, 3)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Click hint */}
      <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs font-bold opacity-75 pointer-events-none">
        Click to focus
      </div>
    </div>
  )
}