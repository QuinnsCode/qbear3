// src/hooks/usePresence.ts

import { useState, useEffect, useRef } from 'react';

// User-configurable settings - adjust these as needed
const PRESENCE_SETTINGS = {
  // How often to send heartbeats to the server (in milliseconds)
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  
  // How often to refresh presence data via HTTP (if needed for fallback)
  PRESENCE_REFRESH_INTERVAL: 60000, // 1 minute
  
  // WebSocket reconnection delay after disconnect
  RECONNECT_DELAY: 5000, // 5 seconds
  
  // Maximum number of reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 5,
  
  // Timeout for initial connection attempts
  CONNECTION_TIMEOUT: 10000, // 10 seconds
} as const;

interface UserPresence {
  userId: string;
  username: string;
  joinedAt: number;
  lastSeen: number;
}

interface UsePresenceOptions {
  userId: string;
  username: string;
  enabled?: boolean;
}

export function usePresence({ userId, username, enabled = true }: UsePresenceOptions) {
  //the actual presence data
  const [presence, setPresence] = useState<UserPresence[]>([]);
  //is the user connected
  const [isConnected, setIsConnected] = useState(false);
  //the userId & username of the current user
  const [effectiveUserId, setEffectiveUserId] = useState<string>(userId);
  const [effectiveUsername, setEffectiveUsername] = useState<string>(username);
  //the websocket ref
  const wsRef = useRef<WebSocket | null>(null);
  //the heartbeat ref used to send heartbeats to the server to keep in touch client to server
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  //reconnection tracking
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  //react to when we login we'll get a username 
  //or if we logout we'll get null which will genreate a new userId
  //userId gets made on server into a unique adject animal type random name
  //used to keep same person online as same animal

  useEffect(() => {
    if (!enabled) return;

    console.log('🔌 Initializing presence for:', username || 'anonymous');
    console.log('⚙️ Using settings:', PRESENCE_SETTINGS);

    let cleanup = false;

    const initializePresence = async () => {
      try {
        // 1. Join presence via HTTP API
        const joinPayload: any = {
          action: 'join',
          pathname: window.location.pathname
        };

        // Only include userId and username if we have them (logged in users)
        if (userId) {
          joinPayload.userId = userId;
        }
        if (username) {
          joinPayload.username = username;
        }

        const joinResponse = await fetch('/__realtime/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(joinPayload)
        });

        if (joinResponse.ok) {
          const joinResult = await joinResponse.json() as { userId: string; username: string; success: boolean };
          // Server returns the effective userId and username (generated if anonymous)
          setEffectiveUserId(joinResult.userId);
          setEffectiveUsername(joinResult.username);
          console.log('✅ Joined presence as:', joinResult.username, '(', joinResult.userId, ')');

          // 2. Establish WebSocket connection for real-time updates
          const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/__realtime?key=${encodeURIComponent(window.location.pathname)}`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            setIsConnected(true);
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

            // Start sending heartbeats to associate this WebSocket with our user
            const sendHeartbeat = () => {
              if (ws.readyState === WebSocket.OPEN && !cleanup) {
                ws.send(JSON.stringify({
                  type: 'presence_heartbeat',
                  userId: joinResult.userId  // ✅ Use the server-provided userId
                }));
                console.log('💓 Sent heartbeat for:', joinResult.userId);
              }
            };

            // Send initial heartbeat
            sendHeartbeat();

            // Send heartbeat at configured interval
            heartbeatRef.current = setInterval(sendHeartbeat, PRESENCE_SETTINGS.HEARTBEAT_INTERVAL);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('📨 WebSocket message:', data);

              if (data.type === 'presence_update') {
                setPresence(data.data);
                console.log('👥 Updated presence via WebSocket:', data.data);
              }
            } catch (error) {
              console.error('❌ Failed to parse WebSocket message:', error);
            }
          };

          ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            setIsConnected(false);
            if (heartbeatRef.current) {
              clearInterval(heartbeatRef.current);
              heartbeatRef.current = null;
            }

            // Attempt to reconnect if not cleaning up and haven't exceeded max attempts
            if (!cleanup && reconnectAttemptsRef.current < PRESENCE_SETTINGS.MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current++;
              console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${PRESENCE_SETTINGS.MAX_RECONNECT_ATTEMPTS})...`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (!cleanup) {
                  initializePresence();
                }
              }, PRESENCE_SETTINGS.RECONNECT_DELAY);
            }
          };

          ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setIsConnected(false);
          };

          // 3. Initial presence fetch
          const response = await fetch(`/__realtime/presence?key=${encodeURIComponent(window.location.pathname)}`, {
            method: 'GET'
          });
          
          if (response.ok) {
            const presenceData = await response.json() as UserPresence[];
            setPresence(presenceData);
            console.log('👥 Initial presence:', presenceData);
          }
        }

      } catch (error) {
        console.error('❌ Failed to initialize presence:', error);
        setIsConnected(false);
        
        // Attempt to reconnect on error if not cleaning up
        if (!cleanup && reconnectAttemptsRef.current < PRESENCE_SETTINGS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Retrying after error (${reconnectAttemptsRef.current}/${PRESENCE_SETTINGS.MAX_RECONNECT_ATTEMPTS})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!cleanup) {
              initializePresence();
            }
          }, PRESENCE_SETTINGS.RECONNECT_DELAY);
        }
      }
    };

    initializePresence();

    // Cleanup function
    return () => {
      cleanup = true;
      
      // Clear heartbeat interval
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Send leave signal
      if (effectiveUserId) {
        fetch('/__realtime/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUserId,
            action: 'leave',
            pathname: window.location.pathname
          })
        }).catch(() => {});
      }
      
      setIsConnected(false);
      setPresence([]);
    };
  }, [userId, username, enabled]);

  const otherUsers = presence.filter(user => user.userId !== effectiveUserId);

  return {
    presence,
    otherUsers,
    isConnected,
    totalUsers: presence.length,
    currentUser: presence.find(user => user.userId === effectiveUserId),
    effectiveUserId,
    effectiveUsername,
    // Expose settings for debugging/monitoring
    settings: PRESENCE_SETTINGS
  };
}