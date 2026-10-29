// @/app/hooks/useUserSession.ts
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface UserSessionState {
  userId: string;
  activeGames: string[];
  presence: 'online' | 'away' | 'offline';
  lastActive: number;
  connectedDevices?: number;
}

interface UseUserSessionOptions {
  userId: string | null;
  enabled?: boolean;
  onGameJoined?: (gameId: string) => void;
  onGameLeft?: (gameId: string) => void;
  onLoggedOut?: () => void;
  onPresenceChanged?: (presence: 'online' | 'away' | 'offline') => void;
}

interface UseUserSessionReturn {
  state: UserSessionState | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  logoutAllDevices: () => void;
  updatePresence: (presence: 'online' | 'away' | 'offline') => void;
}

/**
 * Hook to connect to User Session Durable Object with Hibernation API
 *
 * Provides real-time sync of user state across all devices:
 * - Active games list
 * - Presence status
 * - Cross-device logout
 *
 * Cost-efficient: DO hibernates when idle, only wakes on messages
 */
export function useUserSession(options: UseUserSessionOptions): UseUserSessionReturn {
  const {
    userId,
    enabled = true,
    onGameJoined,
    onGameLeft,
    onLoggedOut,
    onPresenceChanged
  } = options;

  const [state, setState] = useState<UserSessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  // True once the effect cleanup has closed the socket; onclose must then not reconnect.
  const closedByUs = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pingInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const deviceId = useRef(
    typeof window !== 'undefined'
      ? `${navigator.userAgent.substring(0, 20)}-${Date.now()}`
      : 'server'
  );

  // Send message to DO (wakes it from hibernation)
  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('[useUserSession] WebSocket not connected');
    }
  }, []);

  // Public API methods
  const joinGame = useCallback((gameId: string) => {
    sendMessage({ type: 'join_game', gameId });
  }, [sendMessage]);

  const leaveGame = useCallback((gameId: string) => {
    sendMessage({ type: 'leave_game', gameId });
  }, [sendMessage]);

  const logoutAllDevices = useCallback(() => {
    sendMessage({ type: 'logout_all' });
  }, [sendMessage]);

  const updatePresence = useCallback((presence: 'online' | 'away' | 'offline') => {
    sendMessage({ type: 'update_presence', presence });
  }, [sendMessage]);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'initial_state':
          setState({
            userId: data.userId,
            activeGames: data.activeGames || [],
            presence: data.presence || 'online',
            lastActive: data.lastActive || Date.now()
          });
          setIsLoading(false);
          break;

        case 'state':
          setState(prev => ({
            ...prev!,
            ...data
          }));
          break;

        case 'game_joined':
          setState(prev => prev ? { ...prev, activeGames: data.activeGames } : null);
          onGameJoined?.(data.gameId);
          break;

        case 'game_left':
          setState(prev => prev ? { ...prev, activeGames: data.activeGames } : null);
          onGameLeft?.(data.gameId);
          break;

        case 'presence_updated':
          setState(prev => prev ? { ...prev, presence: data.presence } : null);
          onPresenceChanged?.(data.presence);
          break;

        case 'pong':
          // Heartbeat response
          break;

        case 'error':
          console.error('[useUserSession] Error from DO:', data.message);
          setError(data.message);
          break;

        default:
          console.warn('[useUserSession] Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('[useUserSession] Failed to parse message:', err);
    }
  }, [onGameJoined, onGameLeft, onPresenceChanged]);

  // Connect to User Session DO
  const connect = useCallback(() => {
    if (!userId || !enabled || closedByUs.current) return;

    // Prevent duplicate connections
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/__user-session?userId=${userId}&deviceId=${deviceId.current}`;

      console.log('[useUserSession] Connecting to:', url);

      const socket = new WebSocket(url);

      socket.onopen = () => {
        // Cleanup ran while we were still connecting; drop the socket instead of
        // starting a heartbeat that would keep the DO awake after unmount.
        if (closedByUs.current || ws.current !== socket) {
          socket.close(1000, 'Unmounted');
          return;
        }
        console.log('[useUserSession] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Start heartbeat ping (every 30 seconds)
        if (pingInterval.current) clearInterval(pingInterval.current);
        pingInterval.current = setInterval(() => {
          sendMessage({ type: 'ping' });
        }, 30000);
      };

      socket.onmessage = handleMessage;

      socket.onerror = (err) => {
        console.error('[useUserSession] WebSocket error:', err);
        setError('Connection error');
      };

      socket.onclose = (event) => {
        console.log('[useUserSession] Disconnected:', event.code, event.reason);

        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = undefined;
        }

        // We closed it (unmount / deps change): no state updates, no reconnect.
        if (closedByUs.current || ws.current !== socket) return;

        setIsConnected(false);

        // Handle logout_all
        if (event.reason === 'Logged out from all devices') {
          onLoggedOut?.();
          return;
        }

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < 10 && enabled) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[useUserSession] Reconnecting in ${delay}ms...`);

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current = socket;

    } catch (err) {
      console.error('[useUserSession] Failed to connect:', err);
      setError('Failed to connect');
      setIsLoading(false);
    }
  }, [userId, enabled, handleMessage, onLoggedOut, sendMessage]);

  // Connect on mount
  useEffect(() => {
    closedByUs.current = false;
    reconnectAttempts.current = 0;
    if (enabled && userId) {
      connect();
    }

    return () => {
      closedByUs.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = undefined;
      }
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = undefined;
      }
      if (ws.current) {
        ws.current.close(1000, 'Unmounted');
        ws.current = null;
      }
      setIsConnected(false);
    };
  }, [connect, enabled, userId]);

  return {
    state,
    isConnected,
    isLoading,
    error,
    joinGame,
    leaveGame,
    logoutAllDevices,
    updatePresence
  };
}
