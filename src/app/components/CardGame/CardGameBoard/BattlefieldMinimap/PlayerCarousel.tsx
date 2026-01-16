// app/components/CardGame/CardGameBoard/BattlefieldMinimap/PlayerCarousel.tsx
'use client'

import { useState, useEffect } from 'react'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import { PlayerSector } from '../BattlefieldMinimap/PlayerSector'
import { MinimapBattlefield } from '../BattlefieldMinimap/MinimapBattlefield'

interface PlayerCarouselProps {
  gameState: CardGameState
  currentPlayerId: string
  onSelectPlayer: (playerId: string) => void
}

export function PlayerCarousel({ 
  gameState, 
  currentPlayerId,
  onSelectPlayer 
}: PlayerCarouselProps) {
  const players = gameState.players
  const [activeIndex, setActiveIndex] = useState(0)
  
  // Initialize active player on mount
  useEffect(() => {
    const currentIndex = players.findIndex(p => p.id === currentPlayerId)
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [players, currentPlayerId])
  
  const activePlayer = players[activeIndex]
  const totalPlayers = players.length
  
  // Calculate rotation offset to bring active player to front (bottom of circle)
  const rotationOffset = -(activeIndex / totalPlayers) * 360
  
  // Navigation handlers
  const rotateLeft = () => {
    setActiveIndex((prev) => (prev - 1 + totalPlayers) % totalPlayers)
  }
  
  const rotateRight = () => {
    setActiveIndex((prev) => (prev + 1) % totalPlayers)
  }
  
  const selectPlayer = (index: number) => {
    setActiveIndex(index)
  }
  
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Circular player layout */}
      <div className="relative w-[500px] h-[500px] mb-4">
        {/* Rotation container */}
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{
            transform: `rotate(${rotationOffset}deg)`,
          }}
        >
          {/* Position players around circle */}
          {players.map((player, index) => {
            // Start from bottom (270°) and go clockwise
            const angle = (270 + (index / totalPlayers) * 360) * (Math.PI / 180)
            const isActive = index === activeIndex
            
            return (
              <div
                key={player.id}
                style={{
                  // Counter-rotate each player so they stay upright
                  transform: `rotate(${-rotationOffset}deg)`,
                }}
              >
                <PlayerSector
                  player={player}
                  angle={angle}
                  isActive={isActive}
                  totalPlayers={totalPlayers}
                  onClick={() => selectPlayer(index)}
                />
              </div>
            )
          })}
        </div>
        
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-slate-500 text-sm font-bold">
            Knights of the Round Table
          </div>
        </div>
      </div>
      
      {/* Active player minimap - appears below circle */}
      {activePlayer && (
        <div className="flex flex-col items-center gap-2 animate-fadeIn">
          <div className="text-white font-bold text-lg">
            {activePlayer.name}'s Battlefield
          </div>
          
          <MinimapBattlefield
            player={activePlayer}
            gameState={gameState}
            onClick={() => onSelectPlayer(activePlayer.id)}
          />
        </div>
      )}
      
      {/* Navigation arrows */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
        <button
          onClick={rotateLeft}
          className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-all border-2 border-slate-500 hover:border-slate-400"
          aria-label="Previous player"
        >
          ←
        </button>
        
        <button
          onClick={rotateRight}
          className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-all border-2 border-slate-500 hover:border-slate-400"
          aria-label="Next player"
        >
          →
        </button>
      </div>
      
      {/* Player count indicator */}
      <div className="absolute top-4 text-slate-400 text-sm">
        {activeIndex + 1} / {totalPlayers}
      </div>
    </div>
  )
}