'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { MTGPlayer, CardGameState, Card } from '@/app/services/cardGame/CardGameState'
import { CardMenu } from '@/app/components/CardGame/CardMenu/CardMenu'

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
  const getCardData = (scryfallId: string, card?: Card) => {
    // ✅ Check if token first
    if (card?.isToken && card?.tokenData) {
      return {
        id: scryfallId,
        name: card.tokenData.name,
        type_line: card.tokenData.typeLine,
        oracle_text: card.tokenData.oracleText,
        power: card.tokenData.power,
        toughness: card.tokenData.toughness,
        colors: card.tokenData.colors || [],
        image_uris: card.tokenData.imageUrl ? {
          normal: card.tokenData.imageUrl,
          large: card.tokenData.imageUrl,
          small: card.tokenData.imageUrl
        } : undefined
      }
    }
    
    // Normal card lookup
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
    const cardData = getCardData(card.scryfallId, card)
    return cardData?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })
  
  // ✅ FIXED: Proper full-screen overlay with high z-index
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <h2 className="text-white text-xl font-bold capitalize">
          {player.name}'s {zone}
          {spectatorMode && <span className="text-purple-400 ml-2">👁️ View Only</span>}
        </h2>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          ✕ Close
        </button>
      </div>
      
      {/* Search Filter - Only for library */}
      {zone === 'library' && (
        <div className="p-4 border-b border-slate-700 bg-slate-800">
          <input
            type="text"
            placeholder="🔍 Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
      
      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredCards.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p className="text-xl">{searchQuery ? 'No cards found' : `No cards in ${zone}`}</p>
          </div>
        ) : (
          <div className={
            zone === 'command' 
              ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" 
              : "grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"
          }>
            {filteredCards.map(card => {
              const cardData = getCardData(card.scryfallId, card)
              
              // Special rendering for command zone - MUCH BIGGER
              if (zone === 'command') {
                return (
                  <div 
                    key={card.instanceId}
                    className="relative"
                  >
                    {/* Large Commander Card Display */}
                    <div className="aspect-[2.5/3.5] bg-gradient-to-br from-amber-900 to-amber-950 rounded-xl border-4 border-amber-500 overflow-hidden shadow-2xl relative">
                      {/* Crown badge */}
                      <div className="absolute top-2 left-2 z-10 bg-amber-500 text-amber-950 rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-lg">
                        👑
                      </div>
                      
                      {/* Card Image */}
                      {cardData?.validatedImageUrl || cardData?.image_uris?.normal || cardData?.image_uris?.large ? (
                        <img 
                          src={cardData.validatedImageUrl || cardData.image_uris?.normal || cardData.image_uris?.large} 
                          alt={cardData?.name || 'Commander'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-card.png'
                            e.currentTarget.onerror = null
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900 to-amber-950 p-4">
                          <p className="text-center text-amber-200 text-lg font-bold break-words">
                            {cardData?.name || 'Commander'}
                          </p>
                        </div>
                      )}
                      
                      {/* Menu button */}
                      {isCurrentPlayer && !spectatorMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCardMenuOpen(
                              cardMenuOpen === card.instanceId ? null : card.instanceId
                            )
                          }}
                          className="absolute top-2 right-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors z-10 backdrop-blur-sm shadow-lg"
                        >
                          ⋯
                        </button>
                      )}
                    </div>
                    
                    {/* Commander name label */}
                    <div className="mt-2 text-center">
                      <p className="text-amber-400 font-bold text-lg">
                        {cardData?.name || 'Commander'}
                      </p>
                      <p className="text-amber-300 text-sm">
                        ⚔️ Commander
                      </p>
                    </div>
                    
                    {/* Context menu for commander */}
                    {cardMenuOpen === card.instanceId && !spectatorMode && (
                      <CommanderMenu
                        card={card}
                        cardData={cardData}
                        playerId={player.id}
                        cardGameId={cardGameId}
                        onClose={() => setCardMenuOpen(null)}
                      />
                    )}
                  </div>
                )
              }
              
              // Normal rendering for other zones
              return (
                <CardMenu
                  key={card.instanceId}
                  card={card}
                  cardData={cardData}
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Commander-specific menu with appropriate actions
function CommanderMenu({ 
  card, 
  cardData, 
  playerId, 
  cardGameId, 
  onClose 
}: {
  card: Card
  cardData: any
  playerId: string
  cardGameId: string
  onClose: () => void
}) {
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Center the menu on screen
      setMenuPosition({
        top: Math.min(Math.max(100, (viewportHeight - rect.height) / 2), viewportHeight - rect.height - 20),
        left: Math.min(Math.max(20, (viewportWidth - rect.width) / 2), viewportWidth - rect.width - 20)
      })
    }
  }, [])
  
  const handleAction = async (action: string) => {
    try {
      const { applyCardGameAction } = await import('@/app/serverActions/cardGame/cardGameActions')
      
      switch (action) {
        case 'play':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: 'command',
              toZone: 'battlefield',
              position: { x: 100, y: 50 },
              isFaceUp: true
            }
          })
          break
        case 'play_tapped':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: 'command',
              toZone: 'battlefield',
              position: { x: 100, y: 50 },
              isFaceUp: true,
              isTapped: true
            }
          })
          break
        case 'hand':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: 'command',
              toZone: 'hand'
            }
          })
          break
        case 'graveyard':
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId,
            data: {
              cardId: card.instanceId,
              fromZone: 'command',
              toZone: 'graveyard'
            }
          })
          break
      }
      onClose()
    } catch (err) {
      console.error('Failed to perform action:', err)
    }
  }
  
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div 
        ref={menuRef}
        className="fixed z-50 bg-gradient-to-br from-amber-900 to-amber-950 rounded-xl shadow-2xl border-4 border-amber-500 min-w-[220px]"
        style={{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`
        }}
      >
        <div className="p-3 space-y-2">
          <div className="text-center text-amber-300 font-bold text-sm mb-2 border-b border-amber-700 pb-2">
            👑 Commander Actions
          </div>
          
          <button 
            onClick={() => handleAction('play')} 
            className="w-full text-left px-4 py-3 text-amber-100 hover:bg-amber-800/50 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <span className="text-xl">⚔️</span>
            <span>Cast Commander</span>
          </button>
          
          <button 
            onClick={() => handleAction('play_tapped')} 
            className="w-full text-left px-4 py-3 text-amber-100 hover:bg-amber-800/50 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <span className="text-xl">💤</span>
            <span>Cast Tapped</span>
          </button>
          
          <button 
            onClick={() => handleAction('hand')} 
            className="w-full text-left px-4 py-3 text-amber-100 hover:bg-amber-800/50 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <span className="text-xl">🃏</span>
            <span>To Hand</span>
          </button>
          
          <button 
            onClick={() => handleAction('graveyard')} 
            className="w-full text-left px-4 py-3 text-amber-100 hover:bg-amber-800/50 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <span className="text-xl">🪦</span>
            <span>To Graveyard</span>
          </button>
        </div>
      </div>
    </>
  )
}