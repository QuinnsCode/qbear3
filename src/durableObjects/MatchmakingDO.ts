// src/durableObjects/MatchmakingDO.ts
/**
 * MATCHMAKING DURABLE OBJECT
 * Manages regional 1v1 PVP matchmaking queues.
 *
 * Uses the WebSocket Hibernation API. Every socket carries its connectionId as a
 * serialized attachment so the in-memory connection map can be rebuilt after the
 * object wakes up; queue entries whose socket is gone are purged before matching.
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

export interface MatchmakingMessage {
  type: 'join_queue' | 'leave_queue' | 'queue_status' | 'match_found' | 'error' | 'ping' | 'pong';
  userId?: string;
  deckId?: string;
  userName?: string;
  deckName?: string;
  deckExportedAt?: number;
  position?: number;
  queueSize?: number;
  /** Seconds the longest-waiting player has been in queue */
  longestWaitSeconds?: number;
  error?: string;
  matchId?: string;
  opponentName?: string;
  region?: string;
}

interface SocketAttachment {
  connectionId: string;
}

export class MatchmakingDO extends DurableObject {
  private region: Region | null = null;
  private queue: QueueEntry[] = [];
  private connections: Map<string, WebSocket> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    this.ctx.blockConcurrencyWhile(async () => {
      this.region = await this.ctx.storage.get<Region>('region') || null;
      this.queue = (await this.ctx.storage.get<QueueEntry[]>('queue')) || [];

      // Rebuild the connection map from hibernated sockets
      for (const ws of this.ctx.getWebSockets()) {
        const id = this.connectionIdOf(ws);
        if (id) this.connections.set(id, ws);
      }

      // Drop queue entries whose socket did not survive
      const before = this.queue.length;
      this.queue = this.queue.filter(e => this.connections.has(e.connectionId));
      if (this.queue.length !== before) await this.saveQueue();
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (!this.region) {
      const regionParam = url.searchParams.get('region');
      if (regionParam) {
        this.region = regionParam as Region;
        await this.ctx.storage.put('region', this.region);
      }
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const connectionId = crypto.randomUUID();
      server.serializeAttachment({ connectionId } satisfies SocketAttachment);
      this.ctx.acceptWebSocket(server);
      this.connections.set(connectionId, server);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.includes('/stats')) {
      const live = this.liveQueue();
      const oldest = live[0]?.joinedAt;
      return Response.json({
        region: this.region,
        queueSize: live.length,
        activeConnections: this.connections.size,
        longestWaitSeconds: oldest ? Math.floor((Date.now() - oldest) / 1000) : 0,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;

    const connectionId = this.connectionIdOf(ws);
    if (!connectionId) {
      ws.send(JSON.stringify({ type: 'error', error: 'Unknown connection' }));
      return;
    }
    // Make sure a woken-up socket is tracked
    if (!this.connections.has(connectionId)) this.connections.set(connectionId, ws);

    try {
      const data: MatchmakingMessage = JSON.parse(message);

      switch (data.type) {
        case 'join_queue':
          await this.handleJoinQueue(ws, connectionId, data);
          break;
        case 'leave_queue':
          await this.handleLeaveQueue(connectionId, data.userId);
          break;
        case 'queue_status':
          this.sendQueueStatus(ws, data.userId);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('Error processing matchmaking message:', error);
      ws.send(JSON.stringify({ type: 'error', error: 'Failed to process message' }));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.dropConnection(this.connectionIdOf(ws));
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.dropConnection(this.connectionIdOf(ws));
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private connectionIdOf(ws: WebSocket): string | undefined {
    try {
      return (ws.deserializeAttachment() as SocketAttachment | null)?.connectionId;
    } catch {
      return undefined;
    }
  }

  private liveQueue(): QueueEntry[] {
    return this.queue.filter(e => this.connections.has(e.connectionId));
  }

  private async dropConnection(connectionId: string | undefined): Promise<void> {
    if (!connectionId) return;
    this.connections.delete(connectionId);

    const before = this.queue.length;
    this.queue = this.queue.filter(e => e.connectionId !== connectionId);
    if (this.queue.length !== before) {
      await this.saveQueue();
      this.broadcastQueueStatus();
    }
  }

  private async handleJoinQueue(ws: WebSocket, connectionId: string, data: MatchmakingMessage): Promise<void> {
    const { userId, deckId, userName, deckName, deckExportedAt } = data;

    if (!userId || !deckId || !userName || !deckName || !deckExportedAt) {
      ws.send(JSON.stringify({ type: 'error', error: 'Missing required fields' }));
      return;
    }

    const now = Date.now();
    if (now - deckExportedAt > PVP_DECK_EXPIRY_MS) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Deck is too old. Please export a fresh deck within the last 4 hours.'
      }));
      return;
    }

    // Already queued (reconnect from another socket) → move entry to this socket
    const existing = this.queue.find(e => e.userId === userId);
    if (existing) {
      if (existing.connectionId !== connectionId) {
        const old = this.connections.get(existing.connectionId);
        if (old && old !== ws) {
          try { old.close(1000, 'Replaced by a newer connection'); } catch {}
        }
        this.connections.delete(existing.connectionId);
        existing.connectionId = connectionId;
        existing.deckId = deckId;
        existing.deckName = deckName;
        existing.deckExportedAt = deckExportedAt;
        await this.saveQueue();
      }
      this.sendQueueStatus(ws, userId);
      await this.tryMatch();
      return;
    }

    this.queue.push({ userId, deckId, userName, deckName, deckExportedAt, joinedAt: now, connectionId });
    await this.saveQueue();
    console.log(`User ${userId} joined ${this.region} queue. Queue size: ${this.queue.length}`);

    this.broadcastQueueStatus();
    await this.tryMatch();
  }

  private async handleLeaveQueue(connectionId: string, userId?: string): Promise<void> {
    const before = this.queue.length;
    this.queue = this.queue.filter(e => !(e.connectionId === connectionId || (userId && e.userId === userId)));
    if (before !== this.queue.length) {
      await this.saveQueue();
      this.broadcastQueueStatus();
    }
  }

  private async tryMatch(): Promise<void> {
    // Purge ghosts first so nobody gets matched against a dead socket
    const live = this.liveQueue();
    if (live.length !== this.queue.length) {
      this.queue = live;
      await this.saveQueue();
    }
    if (this.queue.length < 2) return;

    const [player1, player2] = this.queue.slice(0, 2);
    this.queue = this.queue.slice(2);
    await this.saveQueue();

    console.log(`Creating match between ${player1.userName} and ${player2.userName}`);
    const matchId = await this.createPvpGame(player1, player2);

    const ws1 = this.connections.get(player1.connectionId);
    const ws2 = this.connections.get(player2.connectionId);

    if (!matchId) {
      const err = JSON.stringify({ type: 'error', error: 'Failed to create match. Please try again.' });
      ws1?.send(err);
      ws2?.send(err);
      // Put them back at the front of the line
      this.queue.unshift(player1, player2);
      await this.saveQueue();
      this.broadcastQueueStatus();
      return;
    }

    ws1?.send(JSON.stringify({ type: 'match_found', matchId, opponentName: player2.userName } satisfies MatchmakingMessage));
    ws2?.send(JSON.stringify({ type: 'match_found', matchId, opponentName: player1.userName } satisfies MatchmakingMessage));

    this.broadcastQueueStatus();

    // Let the clients navigate away, then close
    setTimeout(() => {
      for (const [id, ws] of [[player1.connectionId, ws1], [player2.connectionId, ws2]] as const) {
        this.connections.delete(id);
        try { ws?.close(1000, 'Match found'); } catch {}
      }
    }, 2500);
  }

  private async createPvpGame(player1: QueueEntry, player2: QueueEntry): Promise<string | null> {
    try {
      const gameId = `pvp-${this.region}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const workerHost: string = (env as any).WORKER_HOST || 'qntbr.com';
      const scheme = workerHost.includes('localhost') ? 'http' : 'https';
      const initUrl = `${scheme}://${workerHost}/api/pvp/initialize`;

      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          region: this.region,
          players: [
            { userId: player1.userId, userName: player1.userName, deckId: player1.deckId, position: 0 },
            { userId: player2.userId, userName: player2.userName, deckId: player2.deckId, position: 1 }
          ]
        })
      });

      if (!initResponse.ok) {
        console.error('Failed to initialize PVP game via API');
        return null;
      }

      const result = await initResponse.json() as { success: boolean; error?: string };
      if (!result.success) {
        console.error('PVP initialization failed:', result.error);
        return null;
      }

      console.log(`✅ Created PVP match: ${gameId}`);
      return gameId;
    } catch (error) {
      console.error('Error creating PVP game:', error);
      return null;
    }
  }

  private statusFor(userId?: string): MatchmakingMessage {
    const live = this.liveQueue();
    const position = userId ? live.findIndex(e => e.userId === userId) : -1;
    const oldest = live[0]?.joinedAt;
    return {
      type: 'queue_status',
      position: position >= 0 ? position + 1 : undefined,
      queueSize: live.length,
      longestWaitSeconds: oldest ? Math.floor((Date.now() - oldest) / 1000) : 0,
      region: this.region || undefined,
    };
  }

  private sendQueueStatus(ws: WebSocket, userId?: string): void {
    try { ws.send(JSON.stringify(this.statusFor(userId))); } catch {}
  }

  private broadcastQueueStatus(): void {
    for (const entry of this.queue) {
      const ws = this.connections.get(entry.connectionId);
      if (ws) this.sendQueueStatus(ws, entry.userId);
    }
  }

  private async saveQueue(): Promise<void> {
    await this.ctx.storage.put('queue', this.queue);
  }
}
