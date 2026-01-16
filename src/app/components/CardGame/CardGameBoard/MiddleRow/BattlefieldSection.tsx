// app/components/CardGame/CardGameBoard/MiddleRow/BattlefieldSection.tsx
'use client'

import { useState } from 'react'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'
import { ZoneViewer } from '@/app/components/CardGame/ZoneViewer/ZoneViewer'
import { BattlefieldContainer } from './Battlefield/BattlefieldContainer'
import BattlefieldHeader from './BattlefieldHeader'
import LifeTracker from '@/app/components/CardGame/LifeTracker/LifeTracker'
import { BattlefieldMinimapModal } from '../BattlefieldMinimap/BattlefieldMinimapModal'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'

interface BattlefieldSectionProps {
  player: MTGPlayer
  isCurrentPlayer: boolean
  gameState: CardGameState
  hoveredCard: string | null
  viewingZone: { playerId: string, zone: string } | null
  onCloseZone: () => void
  onHoverCard: (cardId: string | null) => void
  cardGameId: string
  onDropCard?: (cardId: string, fromZone: string, position: { x: number, y: number }) => void
  onBattlefieldScroll?: (scrollLeft: number, scrollTop: number) => void
  spectatorMode?: boolean
  isLargeBattlefieldView?: boolean
  toggleLargeBattlefieldView?: () => void
  isSandbox?: boolean
  // New props for minimap
  selectedPlayerId?: string | null
  onSelectPlayer?: (playerId: string | null) => void
}

/**
 * BattlefieldSection - The main battlefield area in the middle row
 * 
 * Responsibilities:
 * - Display the battlefield with cards
 * - Show player header (name, life, controls)
 * - Manage life tracker modal
 * - Manage minimap modal
 * - Handle zone overlay when viewing zones
 */
export default function BattlefieldSection({ 
  player, 
  isCurrentPlayer, 
  gameState,
  hoveredCard,
  viewingZone,
  onCloseZone,
  onHoverCard,
  cardGameId,
  onDropCard,
  onBattlefieldScroll,
  spectatorMode = false,
  isLargeBattlefieldView = false,
  isSandbox = false,
  toggleLargeBattlefieldView,
  selectedPlayerId,
  onSelectPlayer
}: BattlefieldSectionProps) {
  const [showLifeTracker, setShowLifeTracker] = useState(false)
  const [showMinimap, setShowMinimap] = useState(false)

  // ✅ UPDATED: Helper to get card data from deck list OR return token data
  const getCardData = (scryfallId: string, card?: any) => {
    // ✅ CHECK IF TOKEN FIRST
    if (card?.isToken && card?.tokenData) {
      // Convert tokenData to ScryfallCard format
      return {
        id: scryfallId,
        name: card.tokenData.name,
        type_line: card.tokenData.typeLine,
        oracle_text: card.tokenData.oracleText,
        power: card.tokenData.power,
        toughness: card.tokenData.toughness,
        colors: card.tokenData.colors || [],
        color_identity: card.tokenData.colors || [],
        image_uris: card.tokenData.imageUrl ? {
          normal: card.tokenData.imageUrl,
          large: card.tokenData.imageUrl,
          small: card.tokenData.imageUrl
        } : undefined,
        set: 'token',
        set_name: 'Token',
        collector_number: '0',
        rarity: 'common'
      }
    }
    
    // Normal card lookup from deck lists
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
  
  // Handle life change from life tracker
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

  // Handle counters/game state sync from life tracker
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

  // Handle minimap player selection
  const handleMinimapSelectPlayer = (playerId: string) => {
    onSelectPlayer?.(playerId)
  }
  
  // If viewing a zone (hand, graveyard, etc), show zone overlay instead
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
  
  // Get battlefield cards for this player
  const battlefieldCards = player.zones.battlefield
    .map(id => gameState.cards[id])
    .filter(card => card !== undefined)
  
  return (
    <div className="h-full flex flex-col p-4 relative">
      {/* Header: Player info, life, controls */}
      <BattlefieldHeader
        player={player}
        isCurrentPlayer={isCurrentPlayer}
        spectatorMode={spectatorMode}
        isLargeBattlefieldView={isLargeBattlefieldView}
        onToggleLargeView={toggleLargeBattlefieldView}
        onOpenLifeTracker={isCurrentPlayer && !spectatorMode ? () => setShowLifeTracker(true) : undefined}
        onOpenMinimap={!spectatorMode ? () => setShowMinimap(true) : undefined}
      />
      
      {/* Battlefield Canvas: The scrollable card area */}
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
          onBattlefieldScroll={onBattlefieldScroll}
          isSandbox={isSandbox}
        />
      </div>

      {/* Life Tracker Modal - Only for current player */}
      {showLifeTracker && (
        <LifeTracker
          key={`${player.gameStateInfo}-${player.life}`}
          player={player}
          opponents={opponents}
          onLifeChange={handleLifeChange}
          onCountersChange={handleCountersChange}
          onClose={() => setShowLifeTracker(false)}
        />
      )}

      {/* Minimap Modal */}
      {showMinimap && (
        <BattlefieldMinimapModal
          gameState={gameState}
          currentPlayerId={player.id}
          onSelectPlayer={handleMinimapSelectPlayer}
          onClose={() => setShowMinimap(false)}
        />
      )}
    </div>
  )
}