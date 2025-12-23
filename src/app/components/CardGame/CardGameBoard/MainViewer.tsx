// app/components/CardGame/MainViewer.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'
import { ZoneViewer } from '../ZoneViewer/ZoneViewer'
import { BattlefieldContainer } from '../Battlefield/BattlefieldContainer'
import LifeTracker from '../LifeTracker/LifeTracker'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'

interface Props {
  player: MTGPlayer
  isCurrentPlayer: boolean
  gameState: CardGameState
  hoveredCard: string | null
  viewingZone: { playerId: string, zone: string } | null
  onCloseZone: () => void
  onHoverCard: (cardId: string | null) => void
  cardGameId: string
  onDropCard?: (cardId: string, fromZone: string, position: { x: number, y: number }) => void
  spectatorMode?: boolean
  isLargeBattlefieldView?: boolean
  toggleLargeBattlefieldView?: () => void
}

export default function MainViewer({ 
  player, 
  isCurrentPlayer, 
  gameState,
  hoveredCard,
  viewingZone,
  onCloseZone,
  onHoverCard,
  cardGameId,
  onDropCard,
  spectatorMode = false,
  isLargeBattlefieldView = false,
  toggleLargeBattlefieldView
}: Props) {
  const [showLifeTracker, setShowLifeTracker] = useState(false)

  // Helper to get card data from game state
  const getCardData = (scryfallId: string) => {
    for (const p of gameState.players) {
      if (p.deckList?.cardData) {
        const found = p.deckList.cardData.find(c => c.id === scryfallId)
        if (found) return found
      }
    }
    return undefined
  }
  
  // Get opponents for life tracker
  const opponents = gameState.players.filter(p => p.id !== player.id)
  
  // Handle life change
  const handleLifeChange = async (newLife: number) => {
    if (spectatorMode || !isCurrentPlayer) return
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'update_life',
        playerId: player.id,
        data: { life: newLife }
      })
    } catch (error) {
      console.error('Failed to update life:', error)
    }
  }
  
  // If viewing a zone, show zone overlay
  if (viewingZone) {
    const zonePlayer = gameState.players.find(p => p.id === viewingZone.playerId)
    if (zonePlayer) {
      return (
        <ZoneViewer
          player={zonePlayer}
          zone={viewingZone.zone}
          gameState={gameState}
          cardGameId={cardGameId}
          isCurrentPlayer={viewingZone.playerId === player.id}
          spectatorMode={spectatorMode}
          onClose={onCloseZone}
        />
      )
    }
  }
  
  // Get battlefield cards
  const battlefieldCards = player.zones.battlefield
    .map(id => gameState.cards[id])
    .filter(card => card !== undefined)

  const handleCountersChange = async (gameStateInfo: string) => {
    if (spectatorMode || !isCurrentPlayer) return
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'update_game_state_info',
        playerId: player.id,
        data: { gameStateInfo }
      })
    } catch (error) {
      console.error('Failed to sync game state:', error)
    }
  }

  console.log('LifeTracker key:', `${player.id}-${player.life}-${player.gameStateInfo}`)
  
  return (
    <div className="h-full flex flex-col p-4 relative">
      {/* Header with toggle button between name and life */}
      <div className={`flex items-center justify-between transition-all ${
        isLargeBattlefieldView ? 'mb-2' : 'mb-4'
      }`}>
        {/* Left: Player name */}
        <div className="flex items-center gap-2">
          <div 
            className={`rounded-full border-2 border-white ${
              isLargeBattlefieldView ? 'w-3 h-3' : 'w-4 h-4'
            }`}
            style={{ backgroundColor: player.cursorColor }}
          />
          <h2 className={`text-white font-bold ${
            isLargeBattlefieldView ? 'text-sm' : 'text-base'
          }`}>
            {player.name}'s Battlefield
            {isCurrentPlayer && !spectatorMode && <span className="text-blue-400 ml-2">👤</span>}
            {spectatorMode && <span className="text-purple-400 ml-2">👁️</span>}
          </h2>
        </div>
        
        {/* Center: Toggle Button */}
        {toggleLargeBattlefieldView && !spectatorMode && (
          <button
            onClick={toggleLargeBattlefieldView}
            className="px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 group bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
            title={isLargeBattlefieldView ? "Exit Large View" : "Large Battlefield View"}
          >
            {isLargeBattlefieldView ? (
              <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
          </button>
        )}
        
        {/* Right: Life Tracker Button (only show for current player, not spectators) */}
        {isCurrentPlayer && !spectatorMode && (
          <button
            onClick={() => setShowLifeTracker(true)}
            className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg border border-slate-600 transition-colors"
          >
            <span className="text-xl">💚</span>
            <span className="text-white text-lg font-bold">{player.life}</span>
          </button>
        )}
        
        {/* Right: Static life display for opponents or spectators */}
        {(!isCurrentPlayer || spectatorMode) && (
          <div className={`text-white ${
            isLargeBattlefieldView ? 'text-sm' : 'text-base'
          }`}>
            💚 {player.life}
          </div>
        )}
      </div>
      
      {/* Battlefield */}
      <div className="flex-1 overflow-hidden">
        <BattlefieldContainer
          cards={battlefieldCards}
          gameState={gameState}
          cardGameId={cardGameId}
          playerId={player.id}
          isCurrentPlayer={isCurrentPlayer}
          spectatorMode={spectatorMode}
          onHover={onHoverCard}
          getCardData={getCardData}
          onDropCard={onDropCard}
        />
      </div>

      {/* Life Tracker Modal */}
      {showLifeTracker && (
        <LifeTracker
          key={`${player.gameStateInfo}-${player.life}`}
          player={player}
          opponents={opponents}
          onLifeChange={handleLifeChange}
          onCountersChange={handleCountersChange} // NEW
          onClose={() => setShowLifeTracker(false)}
        />
      )}
    </div>
  )
}