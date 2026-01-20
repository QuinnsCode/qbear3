// app/hooks/useDraftSync.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import type { DraftState } from '@/app/types/Draft'

const DRAFT_SYNC_SETTINGS = {
  HEARTBEAT_INTERVAL: 30000,
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
} as const

interface UseDraftSyncOptions {
  draftId: string
  initialState: DraftState
  currentPlayerId: string
  onStateUpdate?: (state: DraftState) => void
  onError?: (error: string) => void
}

export function useDraftSync({ 
  draftId,
  initialState,
  currentPlayerId,
  onStateUpdate,
  onError
}: UseDraftSyncOptions) {
  const [draftState, setDraftState] = useState<DraftState>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initializingRef = useRef<boolean>(false)

  const callbacksRef = useRef({ onStateUpdate, onError })
  callbacksRef.current = { onStateUpdate, onError }

  // Client-side reducer for delta messages
  const applyDelta = useCallback((message: any) => {
    setDraftState(prevState => {
      switch (message.type) {
        case 'state_update':
          return message.state
  
        case 'pick_confirmed':
            return message.state  // ✅ Updates after your pick
        
        case 'packs_passed':
            return message.state  // ✅ Updates after packs pass
        
        case 'round_started':
          return message.state  // ✅ Just replace entire state
        
        case 'draft_complete':
          return {
            ...prevState,
            status: 'complete'
          }
        
        default:
          return prevState
      }
    })
  }, [])

  const initializeDraftSync = useCallback(async () => {
    if (initializingRef.current) return
    initializingRef.current = true

    try {
      console.log('🎴 Initializing draft sync for:', draftId)
      setError(null)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        initializingRef.current = false
        return
      }

      if (wsRef.current) {
        wsRef.current.close()
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/__draftsync/${draftId}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Draft WebSocket connected')
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
        initializingRef.current = false

        if (heartbeatRef.current) clearInterval(heartbeatRef.current)
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, DRAFT_SYNC_SETTINGS.HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
  
        console.log('📨 Received:', message.type, message)  // ✅ ADD THIS
        
        if (message.type === 'pong') return
        
        if (message.type === 'draft_deleted') {
          const errorMsg = 'Draft has been deleted'
          setError(errorMsg)
          callbacksRef.current.onError?.(errorMsg)
          return
        }
        
        if (message.type === 'error') {
          const err = message.error || 'Unknown error'
          setError(err)
          callbacksRef.current.onError?.(err)
          return
        }
        
        // Apply delta to state
        applyDelta(message)
      }

      ws.onclose = () => {
        console.log('🔌 Draft WebSocket closed')
        setIsConnected(false)
        initializingRef.current = false
        
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }

        if (reconnectAttemptsRef.current < DRAFT_SYNC_SETTINGS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            initializeDraftSync()
          }, DRAFT_SYNC_SETTINGS.RECONNECT_DELAY)
        } else {
          setError('Connection lost. Please refresh the page.')
        }
      }

      ws.onerror = () => {
        setIsConnected(false)
        initializingRef.current = false
      }

    } catch (error) {
      console.error('Failed to initialize draft sync:', error)
      setIsConnected(false)
      initializingRef.current = false
      setError(error instanceof Error ? error.message : 'Connection failed')
    }
  }, [draftId, applyDelta])

  useEffect(() => {
    if (!draftId) return

    initializeDraftSync()

    return () => {
      initializingRef.current = false
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }
  }, [draftId, initializeDraftSync])

  const makePick = useCallback(async (cardIds: string[]) => {
    try {
      const { makePick: makePickAction } = await import('@/app/serverActions/draft/makePick')
      const result = await makePickAction(draftId, cardIds, currentPlayerId)
      
      // ✅ ADD THIS - Check if action succeeded
      if (!result.success) {
        throw new Error(result.error || 'Pick failed')
      }
      
      // State update comes via WebSocket delta
      
    } catch (error) {
      console.error('Failed to make pick:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to make pick'
      setError(errorMsg)
      callbacksRef.current.onError?.(errorMsg)
      throw error
    }
  }, [draftId, currentPlayerId])

  return {
    draftState,
    isConnected,
    error,
    makePick,
    utils: {
      reconnect: () => {
        if (wsRef.current) wsRef.current.close()
        reconnectAttemptsRef.current = 0
        setError(null)
        initializeDraftSync()
      },
      clearError: () => setError(null),
    }
  }
}