// app/components/CardGame/ClientCardGameWrapper.tsx
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useCardGameSync } from '@/app/hooks/cardGame/useCardGameSync'
import { useCursorInterpolation } from '@/app/hooks/useCursorInterpolation'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import CardGameBoard from './CardGameBoard/CardGameBoard'
import { SandboxIndicator } from "./Sandbox/SandboxIndicator"

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

  // ✅ Use interpolation hook instead of raw cursors state
  const { cursors, updateCursor, removeCursor } = useCursorInterpolation()
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
      // ✅ Update interpolated cursor (receives updates every 300ms from server)
      if (playerId !== currentUserId) {
        updateCursor(playerId, x, y)
      }
    },
    onPlayerJoined: (player) => {
      console.log('👋 Player joined:', player.name)
    },
    onPlayerLeft: (playerId) => {
      // ✅ Remove cursor when player leaves
      removeCursor(playerId)
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
    
    // ✅ Throttled to 300ms on server, but send on every move
    // The hook handles throttling internally
    sendCursorUpdate(e.clientX, e.clientY, false)
  }, [spectatorMode, sendCursorUpdate])
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (spectatorMode) return
    
    // ✅ Force immediate send on click (bypasses throttle)
    sendCursorUpdate(e.clientX, e.clientY, true)
  }, [spectatorMode, sendCursorUpdate])
  
  const currentState = gameState || initialState

  // Helper function to get random subset of cursors
  const getVisibleCursors = useCallback(() => {
    if (!isSandbox) {
      // Normal game: show all cursors
      return Array.from(cursors.values());
    }
    
    // Sandbox: show max 10 random cursors
    const MAX_VISIBLE_CURSORS = 10;
    const allCursors = Array.from(cursors.values());
    
    if (allCursors.length <= MAX_VISIBLE_CURSORS) {
      return allCursors;
    }
    
    // Randomly sample cursors
    const shuffled = [...allCursors].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, MAX_VISIBLE_CURSORS);
  }, [isSandbox, cursors]);
  
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

  useEffect(() => {
    // Set/update cookie to persist user ID across refreshes
    const cookieName = isSandbox ? `sandbox_user_${cardGameId}` : 'spectator_user';
    
    // Always update cookie with current user ID (in case it was regenerated during self-heal)
    if (currentUserId) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      document.cookie = `${cookieName}=${currentUserId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      console.log('🍪 Saved/updated user ID to cookie:', currentUserId);
    }
  }, [currentUserId, cardGameId, isSandbox]);
  
  return (
    <div 
      className="relative"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
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
          <div className="flex items-center gap-2 bg-black/50 px-3 py-2 mr-2 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {/* <span className={`text-sm font-semibold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span> */}
          </div>
        )}
      </div>
      
      {/* Other players' cursors - interpolated at 60fps! */}
      {!spectatorMode && getVisibleCursors().map((cursor) => {
        const player = currentState.players.find(p => p.id === cursor.playerId)
        if (!player) return null
        
        return (
          <div
            key={cursor.playerId}
            className="fixed pointer-events-none z-50"
            style={{ 
              // ✅ Use interpolated current position (updates at 60fps!)
              left: cursor.current.x, 
              top: cursor.current.y 
            }}
          >
            <div className="text-2xl" style={{ color: player.cursorColor }}>👆</div>
            <div 
              className="text-xs mt-1 px-1 rounded whitespace-nowrap"
              style={{ 
                backgroundColor: player.cursorColor,
                color: 'white'
              }}
            >
              {player.name}
            </div>
          </div>
        )
      })}

      {/* Show that you are in sandbox mode with overlay that can be collapsed but will auto expand every 60 seconds */}
      {isSandbox && (
        <SandboxIndicator 
          playerCount={currentState.players.length}
          cursorCount={cursors.size}
        />
      )}
      
      <CardGameBoard 
        cardGameId={cardGameId}
        gameState={currentState} 
        currentPlayerId={currentUserId || ''}
        spectatorMode={spectatorMode}
        onBattlefieldScroll={handleBattlefieldScroll}
        isSandbox={isSandbox}
      />
    </div>
  )
}