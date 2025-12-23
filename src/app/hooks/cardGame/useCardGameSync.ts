// src/app/hooks/useCardGameSync.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { CardGameState } from '@/app/services/cardGame/CardGameState';

const CARD_GAME_SYNC_SETTINGS = {
  HEARTBEAT_INTERVAL: 30000,
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;

interface UseCardGameSyncOptions {
  cardGameId: string; // ✅ Changed from gameId
  playerId?: string;
  enabled?: boolean;
  onStateUpdate?: (state: CardGameState) => void;
  onError?: (error: string) => void;
  onPlayerJoined?: (player: any) => void;
  onPlayerLeft?: (playerId: string) => void;
  onDeckImported?: (playerId: string, cardData: any[]) => void;
  onCursorUpdate?: (playerId: string, x: number, y: number) => void;
}

export function useCardGameSync({ 
  cardGameId, // ✅ Changed from gameId
  playerId, 
  enabled = true,
  onStateUpdate,
  onError,
  onPlayerJoined,
  onPlayerLeft,
  onDeckImported,
  onCursorUpdate
}: UseCardGameSyncOptions) {
  const lastCursorSendRef = useRef<number>(0);
  const cursorThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [gameState, setGameState] = useState<CardGameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef<boolean>(false);

  const callbacksRef = useRef({
    onStateUpdate,
    onError,
    onPlayerJoined,
    onPlayerLeft,
    onDeckImported,
    onCursorUpdate
  });

  callbacksRef.current = {
    onStateUpdate,
    onError,
    onPlayerJoined,
    onPlayerLeft,
    onDeckImported,
    onCursorUpdate
  };

  const initializeCardGameSync = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      console.log('🃏 Initializing card game sync for:', cardGameId);
      setError(null);
      
      // Get initial state via HTTP
      const response = await fetch(`/__cgsync/cardGame/${cardGameId}`);
      if (response.ok) {
        const initialState = await response.json();
        setGameState(initialState);
        setIsLoading(false);
        callbacksRef.current.onStateUpdate?.(initialState);
      }

      // Setup WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        initializingRef.current = false;
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/__cgsync?key=${encodeURIComponent(cardGameId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Card game WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        initializingRef.current = false;

        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', cardGameId, playerId }));
          }
        }, CARD_GAME_SYNC_SETTINGS.HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'state_update':
            if (message.state) {
              setGameState(message.state);
              callbacksRef.current.onStateUpdate?.(message.state);
            }
            break;
            
          case 'player_joined':
            if (message.player) {
              callbacksRef.current.onPlayerJoined?.(message.player);
            }
            break;
            
          case 'player_left':
            if (message.playerId) {
              callbacksRef.current.onPlayerLeft?.(message.playerId);
            }
            break;
            
          case 'deck_imported':
            if (message.playerId && message.cardData) {
              callbacksRef.current.onDeckImported?.(message.playerId, message.cardData);
            }
            break;
            
          case 'cursor_update':
            if (message.playerId && typeof message.x === 'number' && typeof message.y === 'number') {
              callbacksRef.current.onCursorUpdate?.(message.playerId, message.x, message.y);
            }
            break;
            
          case 'game_deleted':
            const errorMsg = 'Card game has been deleted';
            setError(errorMsg);
            callbacksRef.current.onError?.(errorMsg);
            break;
            
          case 'pong':
            break;
            
          case 'error':
            const err = message.error || 'Unknown error';
            setError(err);
            callbacksRef.current.onError?.(err);
            break;
        }
      };

      ws.onclose = () => {
        console.log('🔌 Card game WebSocket closed');
        setIsConnected(false);
        initializingRef.current = false;
        
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        if (reconnectAttemptsRef.current < CARD_GAME_SYNC_SETTINGS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            initializeCardGameSync();
          }, CARD_GAME_SYNC_SETTINGS.RECONNECT_DELAY);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        initializingRef.current = false;
      };

    } catch (error) {
      console.error('Failed to initialize card game sync:', error);
      setIsConnected(false);
      setIsLoading(false);
      initializingRef.current = false;
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [cardGameId, playerId]);

  useEffect(() => {
    if (!enabled || !cardGameId) return;
  
    initializeCardGameSync();
  
    return () => {
      initializingRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (cursorThrottleTimeoutRef.current) clearTimeout(cursorThrottleTimeoutRef.current); // ✅ ADD THIS
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setGameState(null);
      setIsLoading(false);
    };
  }, [cardGameId, playerId, enabled, initializeCardGameSync]);

  const sendCursorUpdate = useCallback((x: number, y: number, force: boolean = false) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || !playerId) return;
        
    const now = Date.now();
    const timeSinceLastSend = now - lastCursorSendRef.current;
    const THROTTLE_MS = 300; // Only send every 300ms
    
    // Clear any pending throttled send
    if (cursorThrottleTimeoutRef.current) {
      clearTimeout(cursorThrottleTimeoutRef.current);
      cursorThrottleTimeoutRef.current = null;
    }
    
    // Force send (on click) OR enough time has passed
    if (force || timeSinceLastSend >= THROTTLE_MS) {
      wsRef.current?.send(JSON.stringify({
        type: 'cursor_move',
        playerId,
        x,
        y
      }));
      lastCursorSendRef.current = now;
    } else {
      // Schedule a throttled send
      const delay = THROTTLE_MS - timeSinceLastSend;
      cursorThrottleTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'cursor_move',
            playerId,
            x,
            y
          }));
          lastCursorSendRef.current = Date.now();
        }
      }, delay);
    }
  }, [playerId]);

  return {
    gameState,
    isConnected,
    isLoading,
    error,
    sendCursorUpdate,
    utils: {
      reconnect: () => {
        if (wsRef.current) wsRef.current.close();
        reconnectAttemptsRef.current = 0;
        setError(null);
        initializeCardGameSync();
      },
      clearError: () => setError(null),
    }
  };
}