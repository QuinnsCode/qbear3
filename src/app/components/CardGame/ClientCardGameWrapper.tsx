// app/components/CardGame/ClientCardGameWrapper.tsx
'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useCardGameSync } from '@/app/hooks/cardGame/useCardGameSync'
import { useCursorInterpolation } from '@/app/hooks/useCursorInterpolation'
import type { CardGameState } from '@/app/services/cardGame/CardGameState'
import ClientCardGameBoard from './CardGameBoard/ClientCardGameBoard'
import { SandboxIndicator } from "./Sandbox/SandboxIndicator"
import { ConnectionStatus } from './ui/ConnectionStatus'
import { SpectatorIndicator } from './ui/SpectatorIndicator'
import { PlayerCursor } from './ui/PlayerCursor'
import { ErrorScreen } from './ui/ErrorScreen'
import { getVisibleCursors } from '@/app/lib/cardGame/cursorUtils'
import { persistUserIdCookie } from '@/app/lib/auth/cookieUtils'

interface Props {
  cardGameId: string
  gameName?: string
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
      console.log('Card game state updated')
    },
    onCursorUpdate: (playerId, x, y) => {
      if (playerId !== currentUserId) {
        updateCursor(playerId, x, y)
      }
    },
    onPlayerJoined: (player) => {
      console.log('Player joined:', player.name)
    },
    onPlayerLeft: (playerId) => {
      removeCursor(playerId)
    },
    onDeckImported: (playerId, cardData) => {
      console.log('Deck imported for player:', playerId)
    }
  })
  
  const handleBattlefieldScroll = useCallback((scrollLeft: number, scrollTop: number) => {
    battlefieldScrollRef.current = { left: scrollLeft, top: scrollTop }
  }, [])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (spectatorMode) return
    sendCursorUpdate(e.clientX, e.clientY, false)
  }, [spectatorMode, sendCursorUpdate])
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (spectatorMode) return
    sendCursorUpdate(e.clientX, e.clientY, true)
  }, [spectatorMode, sendCursorUpdate])
  
  const currentState = gameState || initialState
  const visibleCursors = getVisibleCursors(cursors, isSandbox)
  
  // Persist user ID in cookie
  useEffect(() => {
    if (currentUserId) {
      persistUserIdCookie(currentUserId, cardGameId, isSandbox)
    }
  }, [currentUserId, cardGameId, isSandbox])
  
  if (error) {
    return <ErrorScreen error={error} />
  }
  
  return (
    <div 
      className="relative"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Top-right indicators */}
      <div className="fixed top-4 right-10 z-50 flex items-center gap-3">
        {spectatorMode && <SpectatorIndicator />}
        {!spectatorMode && <ConnectionStatus isConnected={isConnected} />}
      </div>
      
      {/* Player cursors */}
      {!spectatorMode && visibleCursors.map((cursor) => {
        const player = currentState.players.find(p => p.id === cursor.playerId)
        if (!player) return null
        
        return (
          <PlayerCursor
            key={cursor.playerId}
            player={player}
            x={cursor.current.x}
            y={cursor.current.y}
          />
        )
      })}

      {/* Sandbox indicator */}
      {isSandbox && (
        <SandboxIndicator 
          playerCount={currentState.players.length}
          cursorCount={cursors.size}
        />
      )}
      
      <ClientCardGameBoard 
        cardGameId={cardGameId}
        gameState={currentState}
        gameName={gameName}
        currentPlayerId={currentUserId || ''}
        spectatorMode={spectatorMode}
        onBattlefieldScroll={handleBattlefieldScroll}
        isSandbox={isSandbox}
      />
    </div>
  )
}