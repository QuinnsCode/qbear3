// app/components/CardGame/ClientCardGameWrapper.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { useCardGameSync } from '@/app/hooks/cardGame/useCardGameSync'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import CardGameBoard from './CardGameBoard/CardGameBoard'

interface Props {
  cardGameId: string
  gameName: string
  currentUserId: string | null
  initialState: CardGameState
  spectatorMode?: boolean
  discordThreadUrl: string | null
  isSandbox: boolean
}

export default function ClientCardGameWrapper({ 
  cardGameId,
  gameName,
  currentUserId, 
  initialState,
  spectatorMode = false,
  discordThreadUrl,
  isSandbox
}: Props) {

  const [cursors, setCursors] = useState<Record<string, { x: number, y: number }>>({})
  const battlefieldScrollRef = useRef({ left: 0, top: 0 })
  
  const { 
    gameState, 
    isConnected, 
    error,
    sendCursorUpdate 
  } = useCardGameSync({
    cardGameId,
    playerId: currentUserId || '',
    enabled: true,
    onStateUpdate: (state) => {
      console.log('🔄 Card game state updated')
    },
    onCursorUpdate: (playerId, x, y) => {
      if (playerId !== currentUserId) {
        setCursors(prev => ({ ...prev, [playerId]: { x, y } }))
      }
    },
    onPlayerJoined: (player) => {
      console.log('👋 Player joined:', player.name)
    },
    onDeckImported: (playerId, cardData) => {
      console.log('📦 Deck imported for player:', playerId)
    }
  })
  
  // Update battlefield scroll tracking
  const handleBattlefieldScroll = useCallback((scrollLeft: number, scrollTop: number) => {
    battlefieldScrollRef.current = { left: scrollLeft, top: scrollTop }
  }, [])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (spectatorMode) return
    
    // Send raw screen coordinates - other clients will adjust for their own scroll
    sendCursorUpdate(e.clientX, e.clientY)
  }, [spectatorMode, sendCursorUpdate])
  
  const currentState = gameState || initialState

  // Helper function to get random subset of cursors
const getVisibleCursors = useCallback((allCursors: Record<string, { x: number, y: number }>) => {
  if (!isSandbox) {
    // Normal game: show all cursors
    return allCursors;
  }
  
  // Sandbox: show max 10 random cursors
  const MAX_VISIBLE_CURSORS = 10;
  const cursorEntries = Object.entries(allCursors);
  
  if (cursorEntries.length <= MAX_VISIBLE_CURSORS) {
    return allCursors;
  }
  
  // Randomly sample cursors
  const shuffled = [...cursorEntries].sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, MAX_VISIBLE_CURSORS);
  
  return Object.fromEntries(sampled);
}, [isSandbox]);
  
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Reconnect
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      className="relative"
      onMouseMove={handleMouseMove}
    >
      {/* Top-right corner indicators and menu */}
      <div className="fixed top-4 right-10 z-50 flex items-center gap-3">
        {/* Spectator Mode Indicator */}
        {spectatorMode && (
          <div className="flex items-center gap-2 bg-purple-600/90 px-3 py-1 rounded-full">
            <span className="text-xl">👁️</span>
            <span className="text-sm font-semibold text-white">Spectator</span>
          </div>
        )}
        
        {/* Connection Status Indicator */}
        {!spectatorMode && (
          <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {/* <span className={`text-sm font-semibold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span> */}
          </div>
        )}
      </div>
      
      {/* Other players' cursors - these show at screen coordinates */}
      {!spectatorMode && Object.entries(getVisibleCursors(cursors)).map(([playerId, pos]) => {
        const player = currentState.players.find(p => p.id === playerId)
        return (
          <div
            key={playerId}
            className="fixed pointer-events-none z-50"
            style={{ left: pos.x, top: pos.y }}
          >
            <div className="text-2xl" style={{ color: player?.cursorColor }}>👆</div>
            <div 
              className="text-xs mt-1 px-1 rounded whitespace-nowrap"
              style={{ 
                backgroundColor: player?.cursorColor,
                color: 'white'
              }}
            >
              {player?.name}
            </div>
          </div>
        )
      })}

      {/* Show total player count */}
      {isSandbox && (
        <div className="fixed top-20 left-4 z-40 bg-purple-600/90 px-4 py-2 rounded-lg shadow-lg">
          <div className="text-white font-semibold text-sm">
            🎮 Sandbox Mode: Shared Battlefield
          </div>
          <div className="text-purple-200 text-xs mt-1">
            👥 {currentState.players.length} players connected
            {Object.keys(cursors).length > 10 && (
              <span className="ml-1">(showing 10/{Object.keys(cursors).length} cursors)</span>
            )}
          </div>
        </div>
      )}
      
      <CardGameBoard 
        cardGameId={cardGameId}
        gameState={currentState} 
        currentPlayerId={currentUserId || ''}
        spectatorMode={spectatorMode}
        onBattlefieldScroll={handleBattlefieldScroll}
      />
    </div>
  )
}