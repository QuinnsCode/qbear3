// src/app/hooks/vtt/useVTTSync.ts

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { VTTGameState, VTTAction } from '@/app/services/vtt/VTTGameState'

/**
 * useVTTSync - WebSocket hook for VTT state synchronization
 *
 * Follows CardGameDO patterns:
 * - WebSocket connection to /__vttsync?key={gameId}
 * - Receives state_update, cursor_update, camera_update messages
 * - Sends actions, cursor_move, camera_move
 * - Throttles cursor (16ms) and camera (100ms) updates client-side
 */

const CURSOR_THROTTLE_MS = 16 // ~60fps
const CAMERA_THROTTLE_MS = 100 // 10Hz

type CursorPosition = { x: number; y: number; z: number }
type CameraPosition = { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }

type OtherPlayer = {
  playerId: string
  playerName: string
  cursor: CursorPosition | null
  camera: CameraPosition | null
}

export function useVTTSync({ gameId, playerId }: { gameId: string; playerId: string }) {
  const [gameState, setGameState] = useState<VTTGameState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [otherPlayers, setOtherPlayers] = useState<Map<string, OtherPlayer>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const lastCursorSendRef = useRef<number>(0)
  const lastCameraSendRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Send action to server
  const sendAction = useCallback((action: Omit<VTTAction, 'playerId'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[useVTTSync] WebSocket not connected, cannot send action')
      return
    }

    const fullAction: VTTAction = {
      ...action,
      playerId
    } as VTTAction

    wsRef.current.send(JSON.stringify(fullAction))
  }, [playerId])

  // Send cursor position (throttled client-side)
  const sendCursorPosition = useCallback((position: CursorPosition) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const now = Date.now()
    if (now - lastCursorSendRef.current < CURSOR_THROTTLE_MS) {
      return // Throttle
    }

    lastCursorSendRef.current = now
    wsRef.current.send(JSON.stringify({
      type: 'cursor_move',
      playerId,
      position
    }))
  }, [playerId])

  // Send camera position (throttled client-side)
  const sendCameraPosition = useCallback((camera: CameraPosition) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const now = Date.now()
    if (now - lastCameraSendRef.current < CAMERA_THROTTLE_MS) {
      return // Throttle
    }

    lastCameraSendRef.current = now
    wsRef.current.send(JSON.stringify({
      type: 'camera_move',
      playerId,
      camera
    }))
  }, [playerId])

  // WebSocket connection
  useEffect(() => {
    let isCancelled = false

    function connect() {
      if (isCancelled) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/__vttsync?key=${gameId}`

      console.log('[useVTTSync] Connecting to', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (isCancelled) return
        console.log('[useVTTSync] Connected')
        setIsConnected(true)
        setError(null)

        // Send join message
        ws.send(JSON.stringify({
          type: 'join',
          playerId
        }))
      }

      ws.onmessage = (event) => {
        if (isCancelled) return

        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'state_update':
              setGameState(data.state)
              break

            case 'cursor_update':
              if (data.playerId !== playerId) {
                setOtherPlayers((prev) => {
                  const updated = new Map(prev)
                  const player = updated.get(data.playerId) || {
                    playerId: data.playerId,
                    playerName: data.playerName || 'Unknown',
                    cursor: null,
                    camera: null
                  }
                  player.cursor = data.position
                  updated.set(data.playerId, player)
                  return updated
                })
              }
              break

            case 'camera_update':
              if (data.playerId !== playerId) {
                setOtherPlayers((prev) => {
                  const updated = new Map(prev)
                  const player = updated.get(data.playerId) || {
                    playerId: data.playerId,
                    playerName: data.playerName || 'Unknown',
                    cursor: null,
                    camera: null
                  }
                  player.camera = data.camera
                  updated.set(data.playerId, player)
                  return updated
                })
              }
              break

            case 'player_left':
              setOtherPlayers((prev) => {
                const updated = new Map(prev)
                updated.delete(data.playerId)
                return updated
              })
              break

            case 'error':
              console.error('[useVTTSync] Server error:', data.error)
              setError(data.error)
              break

            default:
              console.warn('[useVTTSync] Unknown message type:', data.type)
          }
        } catch (err) {
          console.error('[useVTTSync] Failed to parse message:', err)
        }
      }

      ws.onerror = (event) => {
        if (isCancelled) return
        console.error('[useVTTSync] WebSocket error:', event)
        setError('WebSocket connection error')
      }

      ws.onclose = () => {
        if (isCancelled) return
        console.log('[useVTTSync] Disconnected')
        setIsConnected(false)
        wsRef.current = null

        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCancelled) {
            console.log('[useVTTSync] Reconnecting...')
            connect()
          }
        }, 3000)
      }
    }

    connect()

    return () => {
      isCancelled = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [gameId, playerId])

  return {
    gameState,
    isConnected,
    otherPlayers,
    error,
    sendAction,
    sendCursorPosition,
    sendCameraPosition
  }
}
