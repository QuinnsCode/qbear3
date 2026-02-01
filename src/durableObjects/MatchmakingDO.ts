// src/durableObjects/MatchmakingDO.ts
/**
 * MATCHMAKING DURABLE OBJECT
 * Manages regional 1v1 PVP matchmaking queues
 */
import { DurableObject } from "cloudflare:workers";
import { env } from "cloudflare:workers";
import type { Region } from '@/app/lib/constants/regions';
import { PVP_DECK_EXPIRY_MS } from '@/app/lib/constants/regions';

interface QueueEntry {
  userId: string;
  deckId: string;
  userName: string;
  deckName: string;
  deckExportedAt: number;
  joinedAt: number;
  connectionId: string; // Unique ID for this WebSocket connection
}

interface MatchmakingMessage {
  type: 'join_queue' | 'leave_queue' | 'queue_status' | 'match_found' | 'error';
  userId?: string;
  deckId?: string;
  userName?: string;
  deckName?: string;
  deckExportedAt?: number;
  position?: number;
  queueSize?: number;
  error?: string;
  matchId?: string;
  opponentName?: string;
}

export class MatchmakingDO extends DurableObject {
  private region: Region | null = null;
  private queue: QueueEntry[] = [];
  private connections: Map<string, WebSocket> = new Map();
  private userToConnection: Map<string, string> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    this.ctx.blockConcurrencyWhile(async () => {
      // Load region from storage
      this.region = await this.ctx.storage.get<Region>('region') || null;

      // Load queue from storage
      const storedQueue = await this.ctx.storage.get<QueueEntry[]>('queue');
      if (storedQueue) {
        this.queue = storedQueue;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize region if not set
    if (!this.region) {
      const regionParam = url.searchParams.get('region');
      if (regionParam) {
        this.region = regionParam as Region;
        await this.ctx.storage.put('region', this.region);
      }
    }

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      const connectionId = crypto.randomUUID();
      this.connections.set(connectionId, server);

      // Store connection ID in server for later reference
      (server as any).connectionId = connectionId;

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // HTTP endpoints
    if (url.pathname.includes('/stats')) {
      return new Response(JSON.stringify({
        region: this.region,
        queueSize: this.queue.length,
        activeConnections: this.connections.size,
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;

    try {
      const data: MatchmakingMessage = JSON.parse(message);
      const connectionId = (ws as any).connectionId;

      switch (data.type) {
        case 'join_queue':
          await this.handleJoinQueue(ws, connectionId, data);
          break;
        case 'leave_queue':
          await this.handleLeaveQueue(connectionId, data.userId);
          break;
        case 'queue_status':
          await this.sendQueueStatus(ws, data.userId);
          break;
      }
    } catch (error) {
      console.error('Error processing matchmaking message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const connectionId = (ws as any).connectionId;

    if (connectionId) {
      this.connections.delete(connectionId);

      // Remove user from queue if they had this connection
      const entry = this.queue.find(e => e.connectionId === connectionId);
      if (entry) {
        this.queue = this.queue.filter(e => e.connectionId !== connectionId);
        this.userToConnection.delete(entry.userId);
        await this.saveQueue();
        console.log(`User ${entry.userId} removed from queue due to disconnect`);
      }
    }
  }

  private async handleJoinQueue(
    ws: WebSocket,
    connectionId: string,
    data: MatchmakingMessage
  ): Promise<void> {
    const { userId, deckId, userName, deckName, deckExportedAt } = data;

    if (!userId || !deckId || !userName || !deckName || !deckExportedAt) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Missing required fields'
      }));
      return;
    }

    // Validate deck freshness (4 hours)
    const now = Date.now();
    const deckAge = now - deckExportedAt;

    if (deckAge > PVP_DECK_EXPIRY_MS) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Deck is too old. Please export a fresh deck within the last 4 hours.'
      }));
      return;
    }

    // Check if user is already in queue
    const existingEntry = this.queue.find(e => e.userId === userId);
    if (existingEntry) {
      // Update connection if reconnecting
      const oldConnectionId = existingEntry.connectionId;
      if (oldConnectionId !== connectionId) {
        this.connections.delete(oldConnectionId);
        existingEntry.connectionId = connectionId;
        this.userToConnection.set(userId, connectionId);
        await this.saveQueue();
      }

      await this.sendQueueStatus(ws, userId);
      return;
    }

    // Add to queue
    const entry: QueueEntry = {
      userId,
      deckId,
      userName,
      deckName,
      deckExportedAt,
      joinedAt: now,
      connectionId
    };

    this.queue.push(entry);
    this.userToConnection.set(userId, connectionId);
    await this.saveQueue();

    console.log(`User ${userId} joined ${this.region} queue. Queue size: ${this.queue.length}`);

    // Send confirmation
    await this.sendQueueStatus(ws, userId);

    // Try to find a match
    await this.tryMatch();
  }

  private async handleLeaveQueue(connectionId: string, userId?: string): Promise<void> {
    const sizeBefore = this.queue.length;

    this.queue = this.queue.filter(e => {
      const shouldRemove = e.connectionId === connectionId || (userId && e.userId === userId);
      if (shouldRemove) {
        this.userToConnection.delete(e.userId);
      }
      return !shouldRemove;
    });

    if (sizeBefore !== this.queue.length) {
      await this.saveQueue();
      console.log(`User removed from queue. Queue size: ${this.queue.length}`);
    }
  }

  private async tryMatch(): Promise<void> {
    // Need at least 2 players
    if (this.queue.length < 2) {
      return;
    }

    // Get the two oldest entries (FIFO)
    const [player1, player2] = this.queue.slice(0, 2);

    // Remove them from queue
    this.queue = this.queue.slice(2);
    this.userToConnection.delete(player1.userId);
    this.userToConnection.delete(player2.userId);
    await this.saveQueue();

    console.log(`Creating match between ${player1.userName} and ${player2.userName}`);

    // Create a new CardGame for this match
    const matchId = await this.createPvpGame(player1, player2);

    if (!matchId) {
      // Match creation failed, notify players and re-queue
      const ws1 = this.connections.get(player1.connectionId);
      const ws2 = this.connections.get(player2.connectionId);

      if (ws1) {
        ws1.send(JSON.stringify({
          type: 'error',
          error: 'Failed to create match. Please try again.'
        }));
      }
      if (ws2) {
        ws2.send(JSON.stringify({
          type: 'error',
          error: 'Failed to create match. Please try again.'
        }));
      }

      // Re-add to queue
      this.queue.unshift(player2, player1);
      this.userToConnection.set(player1.userId, player1.connectionId);
      this.userToConnection.set(player2.userId, player2.connectionId);
      await this.saveQueue();
      return;
    }

    // Notify both players
    const ws1 = this.connections.get(player1.connectionId);
    const ws2 = this.connections.get(player2.connectionId);

    const matchFoundMessage1: MatchmakingMessage = {
      type: 'match_found',
      matchId,
      opponentName: player2.userName
    };

    const matchFoundMessage2: MatchmakingMessage = {
      type: 'match_found',
      matchId,
      opponentName: player1.userName
    };

    if (ws1) {
      ws1.send(JSON.stringify(matchFoundMessage1));
    }
    if (ws2) {
      ws2.send(JSON.stringify(matchFoundMessage2));
    }

    // Close connections after notifying
    setTimeout(() => {
      this.connections.delete(player1.connectionId);
      this.connections.delete(player2.connectionId);
    }, 1000);
  }

  private async createPvpGame(player1: QueueEntry, player2: QueueEntry): Promise<string | null> {
    try {
      // Generate unique game ID
      const gameId = `pvp-${this.region}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // We'll need to call the CardGameDO to initialize it
      // For now, just store the match metadata in KV
      const matchMetadata = {
        gameId,
        region: this.region,
        players: [
          {
            userId: player1.userId,
            userName: player1.userName,
            deckId: player1.deckId,
            deckName: player1.deckName,
          },
          {
            userId: player2.userId,
            userName: player2.userName,
            deckId: player2.deckId,
            deckName: player2.deckName,
          }
        ],
        createdAt: Date.now(),
        status: 'active'
      };

      // Store in KV (we'll need to add PVP_MATCHES_KV binding)
      await env.DECKS_KV.put(
        `pvp:match:${gameId}`,
        JSON.stringify(matchMetadata),
        { expirationTtl: 24 * 60 * 60 } // 24 hours
      );

      console.log(`Created PVP match: ${gameId}`);
      return gameId;
    } catch (error) {
      console.error('Error creating PVP game:', error);
      return null;
    }
  }

  private async sendQueueStatus(ws: WebSocket, userId?: string): Promise<void> {
    let position = -1;

    if (userId) {
      position = this.queue.findIndex(e => e.userId === userId);
    }

    const statusMessage: MatchmakingMessage = {
      type: 'queue_status',
      position: position >= 0 ? position + 1 : undefined,
      queueSize: this.queue.length
    };

    ws.send(JSON.stringify(statusMessage));
  }

  private async saveQueue(): Promise<void> {
    await this.ctx.storage.put('queue', this.queue);
  }
}
