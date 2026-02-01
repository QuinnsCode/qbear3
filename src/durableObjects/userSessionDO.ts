// @/durableObjects/userSessionDO.ts
/**
 * User Session Durable Object - Hibernation API
 *
 * Coordinates user state across multiple devices using WebSocket with hibernation.
 * Only charges for active processing time (~50ms per message), not connection time.
 *
 * Features:
 * - Multi-device session sync
 * - Active games tracking
 * - Cross-device logout
 * - Presence management
 * - Event broadcasting to all user's devices
 *
 * Cost: ~$0.75/month for 10k users (hibernates 99.9% of the time)
 */

import type { DurableObject } from "cloudflare:workers";

interface UserSessionState {
  userId: string;
  activeGames: string[];
  presence: 'online' | 'away' | 'offline';
  lastActive: number;
}

interface WebSocketMessage {
  type: 'join_game' | 'leave_game' | 'logout_all' | 'update_presence' | 'ping' | 'sync_state';
  gameId?: string;
  presence?: 'online' | 'away' | 'offline';
  deviceId?: string;
}

export class UserSessionDO implements DurableObject {
  private state: DurableObjectState;
  private userId: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    // HTTP API for state queries
    const path = url.pathname;

    if (path === '/state') {
      return this.getState();
    }

    if (path === '/clear') {
      await this.clearState();
      return Response.json({ success: true });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Handle WebSocket upgrade with Hibernation API
   */
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const deviceId = url.searchParams.get('deviceId') || 'unknown';

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    // Store userId for this DO instance
    this.userId = userId;

    // Create WebSocket pair
    const { 0: client, 1: server } = new WebSocketPair();

    // Use Hibernation API - DO will hibernate when no messages
    this.state.acceptWebSocket(server, [deviceId]); // Tag with deviceId

    // Send initial state to newly connected device
    const currentState = await this.loadState();
    server.send(JSON.stringify({
      type: 'initial_state',
      ...currentState,
      deviceId
    }));

    server.accept();

    // DO hibernates immediately after this (NO COST!)
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Wakes from hibernation when message arrives
   * Only active for ~10-50ms while processing
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as WebSocketMessage;
      const [deviceId] = this.state.getTags(ws);

      console.log(`[UserSessionDO] Message from device ${deviceId}:`, data.type);

      switch (data.type) {
        case 'join_game':
          if (data.gameId) {
            await this.handleJoinGame(data.gameId);
          }
          break;

        case 'leave_game':
          if (data.gameId) {
            await this.handleLeaveGame(data.gameId);
          }
          break;

        case 'logout_all':
          await this.handleLogoutAll();
          break;

        case 'update_presence':
          if (data.presence) {
            await this.handleUpdatePresence(data.presence);
          }
          break;

        case 'ping':
          // Simple ping/pong to keep connection alive
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'sync_state':
          // Send current state to requesting device
          const state = await this.loadState();
          ws.send(JSON.stringify({ type: 'state', ...state }));
          break;

        default:
          console.warn('[UserSessionDO] Unknown message type:', data.type);
      }

      // Update last active timestamp
      await this.state.storage.put('lastActive', Date.now());

    } catch (error) {
      console.error('[UserSessionDO] Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }

    // Hibernates automatically after this function returns (FREE!)
  }

  /**
   * Wakes when WebSocket closes
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const [deviceId] = this.state.getTags(ws);
    console.log(`[UserSessionDO] Device ${deviceId} disconnected`);

    // Check if any devices still connected
    const connectedDevices = this.state.getWebSockets();
    if (connectedDevices.length === 0) {
      // No devices connected - update presence to offline
      await this.state.storage.put('presence', 'offline');
    }
  }

  /**
   * Handle user joining a game
   */
  private async handleJoinGame(gameId: string) {
    const games = await this.state.storage.get<string[]>('activeGames') || [];

    if (!games.includes(gameId)) {
      games.push(gameId);
      await this.state.storage.put('activeGames', games);

      // Broadcast to all user's devices
      this.broadcastToAllDevices({
        type: 'game_joined',
        gameId,
        activeGames: games
      });
    }
  }

  /**
   * Handle user leaving a game
   */
  private async handleLeaveGame(gameId: string) {
    const games = await this.state.storage.get<string[]>('activeGames') || [];
    const updatedGames = games.filter(id => id !== gameId);

    await this.state.storage.put('activeGames', updatedGames);

    // Broadcast to all user's devices
    this.broadcastToAllDevices({
      type: 'game_left',
      gameId,
      activeGames: updatedGames
    });
  }

  /**
   * Handle logout from all devices
   */
  private async handleLogoutAll() {
    // Close all WebSocket connections
    const sockets = this.state.getWebSockets();
    sockets.forEach(ws => {
      ws.close(1000, 'Logged out from all devices');
    });

    // Clear state
    await this.clearState();

    console.log('[UserSessionDO] All devices logged out');
  }

  /**
   * Handle presence update
   */
  private async handleUpdatePresence(presence: 'online' | 'away' | 'offline') {
    await this.state.storage.put('presence', presence);

    // Broadcast to all user's devices
    this.broadcastToAllDevices({
      type: 'presence_updated',
      presence
    });
  }

  /**
   * Broadcast message to all connected devices
   */
  private broadcastToAllDevices(message: any) {
    const data = JSON.stringify(message);
    const sockets = this.state.getWebSockets();

    sockets.forEach(ws => {
      try {
        ws.send(data);
      } catch (error) {
        console.error('[UserSessionDO] Failed to send to device:', error);
      }
    });
  }

  /**
   * Load current state from storage
   */
  private async loadState(): Promise<UserSessionState> {
    const [activeGames, presence, lastActive] = await Promise.all([
      this.state.storage.get<string[]>('activeGames'),
      this.state.storage.get<'online' | 'away' | 'offline'>('presence'),
      this.state.storage.get<number>('lastActive')
    ]);

    return {
      userId: this.userId || '',
      activeGames: activeGames || [],
      presence: presence || 'offline',
      lastActive: lastActive || Date.now()
    };
  }

  /**
   * Get current state (HTTP API)
   */
  private async getState(): Promise<Response> {
    const state = await this.loadState();
    const connectedDevices = this.state.getWebSockets().length;

    return Response.json({
      ...state,
      connectedDevices,
      isHibernating: connectedDevices === 0
    });
  }

  /**
   * Clear all state
   */
  private async clearState(): Promise<void> {
    await this.state.storage.deleteAll();
  }
}
