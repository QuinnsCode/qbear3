// src/hooks/useGameSync.ts - SIMPLE FIX
import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState } from '@/app/lib/GameState';

const GAME_SYNC_SETTINGS = {
  HEARTBEAT_INTERVAL: 30000,
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;

interface UseGameSyncOptions {
  gameId: string;
  playerId?: string;
  enabled?: boolean;
  onStateUpdate?: (state: GameState) => void;
  onError?: (error: string) => void;
  onPlayerJoined?: (player: any) => void;
  onGameRestarted?: (state: GameState, nukedTerritories: any[]) => void;
}

export function useGameSync({ 
  gameId, 
  playerId, 
  enabled = true,
  onStateUpdate,
  onError,
  onPlayerJoined,
  onGameRestarted
}: UseGameSyncOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef<boolean>(false);

  // ✅ SIMPLE FIX: Store callbacks in refs to prevent dependency loops
  const callbacksRef = useRef({
    onStateUpdate,
    onError,
    onPlayerJoined,
    onGameRestarted
  });

  // Update callbacks without causing re-renders
  callbacksRef.current = {
    onStateUpdate,
    onError,
    onPlayerJoined,
    onGameRestarted
  };

  // ✅ SIMPLE FIX: Only depend on gameId and playerId
  const initializeGameSync = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      console.log('🎮 Initializing game sync for:', gameId);
      setError(null);
      
      // Get initial state
      const response = await fetch(`/__gsync/game/${gameId}`);
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

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/__gsync?key=${encodeURIComponent(gameId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        initializingRef.current = false;

        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', gameId, playerId }));
          }
        }, GAME_SYNC_SETTINGS.HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        // console.log('📨 Raw WebSocket message received:', event.data);
        
        const message = JSON.parse(event.data);
        console.log('📨 Parsed WebSocket message:', message);
        
        switch (message.type) {
          case 'state_update':
            if (message.state) {
              console.log('📨 Processing state_update message');
              setGameState(message.state);
              callbacksRef.current.onStateUpdate?.(message.state);
            }
            break;
          case 'game_restarted':
            if (message.state) {
              setGameState(message.state);
              callbacksRef.current.onStateUpdate?.(message.state);
              callbacksRef.current.onGameRestarted?.(message.state, message.nukedTerritories || []);
            }
            break;
          case 'player_joined':
            if (message.player) {
              callbacksRef.current.onPlayerJoined?.(message.player);
            }
            break;
          case 'error':
            const errorMsg = message.error || 'Unknown error';
            setError(errorMsg);
            callbacksRef.current.onError?.(errorMsg);
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        initializingRef.current = false;
        
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        if (reconnectAttemptsRef.current < GAME_SYNC_SETTINGS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            initializeGameSync();
          }, GAME_SYNC_SETTINGS.RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        initializingRef.current = false;
      };

    } catch (error) {
      console.error('Failed to initialize game sync:', error);
      setIsConnected(false);
      setIsLoading(false);
      initializingRef.current = false;
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [gameId, playerId]); // ✅ ONLY these two dependencies

  useEffect(() => {
    if (!enabled || !gameId) return;

    initializeGameSync();

    return () => {
      initializingRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
      setIsConnected(false);
      setGameState(null);
      setIsLoading(false);
    };
  }, [gameId, playerId, enabled, initializeGameSync]);

  return {
    gameState,
    isConnected,
    isLoading,
    error,
    utils: {
      reconnect: () => {
        if (wsRef.current) wsRef.current.close();
        reconnectAttemptsRef.current = 0;
        setError(null);
        initializeGameSync();
      },
      clearError: () => setError(null),
    }
  };
}