# Qconn Implementation Guide

**Target:** 10,000 concurrent users, 6-person sessions, server-first architecture
**Stack:** Cloudflare Workers SSR → Durable Objects → Client Hydration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Implementation](#server-implementation)
3. [Durable Object Implementation](#durable-object-implementation)
4. [Client Implementation](#client-implementation)
5. [Deployment & Scaling](#deployment--scaling)
6. [Testing Strategy](#testing-strategy)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Request Flow (Server-First)
```
User Request → Worker (SSR) → HTML with hydration data → Client JS boots
                ↓
         Check subscription
                ↓
         Render Qconn UI state
                ↓
         Client hydrates → WebSocket → Durable Object → WebRTC P2P
```

### Directory Structure
```
app/
└── qconn/
    ├── index.ts                    # Public API exports
    ├── server/
    │   ├── worker.ts               # Worker request handler
    │   ├── qconn-room.ts          # Durable Object
    │   ├── managers/
    │   │   ├── connection-manager.ts
    │   │   ├── signaling-manager.ts
    │   │   └── media-state-manager.ts
    │   └── auth.ts                 # Auth validation
    ├── client/
    │   ├── index.ts                # Client SDK exports
    │   ├── QconnProvider.tsx       # React Context Provider
    │   ├── useQconn.ts            # Main hook
    │   ├── hooks/
    │   │   ├── usePeerConnection.ts
    │   │   ├── useMediaStream.ts
    │   │   └── useSignaling.ts
    │   ├── components/
    │   │   ├── QconnPanel.tsx
    │   │   ├── VideoGrid.tsx
    │   │   └── MediaControls.tsx
    │   └── lib/
    │       ├── peer-connection-manager.ts
    │       ├── media-manager.ts
    │       └── signaling-client.ts
    └── shared/
        ├── types.ts
        ├── messages.ts
        └── constants.ts
```

---

## Server Implementation

### Phase 1: Worker Request Handler

**File:** `qconn/server/worker.ts`

#### Responsibilities
- Route Qconn requests
- Validate authentication
- SSR initial UI state
- Provide WebSocket upgrade endpoint

#### Implementation Steps

**Step 1.1: Route Handler**
```typescript
// qconn/server/worker.ts

import { validateAuth } from './auth';
import type { Env } from '@/types';

export async function handleQconnRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  
  const url = new URL(request.url);
  
  // Route 1: WebSocket upgrade for signaling
  if (url.pathname.match(/^\/qconn\/rooms\/[a-zA-Z0-9-]+$/)) {
    return handleWebSocketUpgrade(request, env);
  }
  
  // Route 2: TURN credentials
  if (url.pathname === '/qconn/turn-credentials') {
    return handleTurnCredentials(request, env);
  }
  
  // Route 3: Room state (for SSR)
  if (url.pathname.match(/^\/qconn\/rooms\/[a-zA-Z0-9-]+\/state$/)) {
    return handleRoomState(request, env);
  }
  
  return new Response('Not Found', { status: 404 });
}
```

**Step 1.2: WebSocket Upgrade Handler**
```typescript
async function handleWebSocketUpgrade(
  request: Request,
  env: Env
): Promise<Response> {
  
  // Extract gameId from URL
  const gameId = new URL(request.url).pathname.split('/').pop()!;
  
  // Validate auth token
  const authResult = await validateAuth(request, env);
  if (!authResult.valid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { userId, hasQconn } = authResult;
  
  // Check subscription
  if (!hasQconn) {
    return new Response('Qconn subscription required', { status: 403 });
  }
  
  // Get or create Durable Object
  const roomId = env.QCONN_ROOMS.idFromName(gameId);
  const room = env.QCONN_ROOMS.get(roomId);
  
  // Forward request with auth context
  const authedRequest = new Request(request.url, {
    ...request,
    headers: new Headers({
      ...Object.fromEntries(request.headers),
      'X-User-Id': userId,
      'X-Game-Id': gameId,
    })
  });
  
  return room.fetch(authedRequest);
}
```

**Step 1.3: Auth Validation**
```typescript
// qconn/server/auth.ts

export async function validateAuth(
  request: Request,
  env: Env
): Promise<AuthResult> {
  
  // Get auth token from cookie or header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    || getCookie(request, 'auth_token');
  
  if (!token) {
    return { valid: false };
  }
  
  // Validate JWT (your existing auth logic)
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    // Check Qconn subscription from your DB
    const user = await env.DB.prepare(
      'SELECT id, has_qconn FROM users WHERE id = ?'
    ).bind(payload.userId).first<{ id: string; has_qconn: number }>();
    
    return {
      valid: true,
      userId: user.id,
      hasQconn: user.has_qconn === 1
    };
  } catch (err) {
    return { valid: false };
  }
}

interface AuthResult {
  valid: boolean;
  userId?: string;
  hasQconn?: boolean;
}
```

**Step 1.4: SSR Room State Handler**
```typescript
async function handleRoomState(
  request: Request,
  env: Env
): Promise<Response> {
  
  const gameId = new URL(request.url).pathname.split('/')[3];
  
  // Get room DO
  const roomId = env.QCONN_ROOMS.idFromName(gameId);
  const room = env.QCONN_ROOMS.get(roomId);
  
  // Request state via HTTP (not WebSocket)
  const stateRequest = new Request(`https://internal/state`, {
    method: 'GET'
  });
  
  const response = await room.fetch(stateRequest);
  return response;
}
```

**Step 1.5: TURN Credentials**
```typescript
async function handleTurnCredentials(
  request: Request,
  env: Env
): Promise<Response> {
  
  // Validate auth
  const authResult = await validateAuth(request, env);
  if (!authResult.valid || !authResult.hasQconn) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Generate Cloudflare Calls TURN credentials
  // https://developers.cloudflare.com/calls/turn/
  
  const ttl = 86400; // 24 hours
  const username = `${authResult.userId}-${Date.now()}`;
  
  // Call Cloudflare TURN API
  const turnResponse = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.CLOUDFLARE_ACCOUNT_ID}/credentials/generate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl })
    }
  );
  
  const credentials = await turnResponse.json<TurnCredentials>();
  
  return Response.json({
    iceServers: [
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: credentials.iceServers.urls,
        username: credentials.iceServers.username,
        credential: credentials.iceServers.credential
      }
    ]
  });
}

interface TurnCredentials {
  iceServers: {
    urls: string | string[];
    username: string;
    credential: string;
  };
}
```

---

### Phase 2: Integrate with Main Worker

**File:** Update your existing `app/server/worker.ts`
```typescript
import { handleQconnRequest } from '@/qconn/server/worker';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    
    const url = new URL(request.url);
    
    // Delegate all /qconn/* routes
    if (url.pathname.startsWith('/qconn/')) {
      return handleQconnRequest(request, env, ctx);
    }
    
    // Your existing routes
    // ...
  }
}
```

**Wrangler Configuration Update**
```toml
# wrangler.toml

# Add Durable Object binding
[[durable_objects.bindings]]
name = "QCONN_ROOMS"
class_name = "QconnRoom"
script_name = "your-worker-name"

[[migrations]]
tag = "v1"
new_classes = ["QconnRoom"]

# Add environment variables
[vars]
# Your existing vars...

# Secrets (add via wrangler secret put)
# CLOUDFLARE_API_TOKEN
# CLOUDFLARE_ACCOUNT_ID
# JWT_SECRET
```

---

## Durable Object Implementation

### Phase 3: QconnRoom Durable Object

**File:** `qconn/server/qconn-room.ts`

#### Responsibilities
- Accept WebSocket connections (max 6 per room)
- Relay WebRTC signaling messages
- Track participant state in SQLite
- Hibernate when idle
- Handle reconnections

#### Implementation Steps

**Step 3.1: Base DO Structure**
```typescript
// qconn/server/qconn-room.ts

import { DurableObject } from 'cloudflare:workers';
import { ConnectionManager } from './managers/connection-manager';
import { SignalingManager } from './managers/signaling-manager';
import { MediaStateManager } from './managers/media-state-manager';
import type { ClientMessage, ServerMessage } from '../shared/messages';

export class QconnRoom extends DurableObject {
  
  private connectionManager: ConnectionManager;
  private signalingManager: SignalingManager;
  private mediaStateManager: MediaStateManager;
  
  private gameId: string = '';
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // Initialize managers
    this.connectionManager = new ConnectionManager(ctx, env);
    this.signalingManager = new SignalingManager(ctx, env);
    this.mediaStateManager = new MediaStateManager(ctx, env);
    
    // Enable WebSocket hibernation
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(
        JSON.stringify({ type: 'ping' }),
        JSON.stringify({ type: 'pong' })
      )
    );
  }
  
  async fetch(request: Request): Promise<Response> {
    
    const url = new URL(request.url);
    
    // HTTP route: Get room state (for SSR)
    if (url.pathname === '/state') {
      return this.handleStateRequest();
    }
    
    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    return new Response('Bad Request', { status: 400 });
  }
  
  private async handleWebSocket(request: Request): Promise<Response> {
    
    // Extract auth context (set by worker)
    const userId = request.headers.get('X-User-Id')!;
    const gameId = request.headers.get('X-Game-Id')!;
    
    this.gameId = gameId;
    
    // Check room capacity
    const participantCount = await this.connectionManager.getParticipantCount();
    if (participantCount >= 6) {
      return new Response('Room full', { status: 403 });
    }
    
    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    // Accept WebSocket
    this.ctx.acceptWebSocket(server);
    
    // Track connection
    await this.connectionManager.addParticipant(server, userId);
    
    // Send current room state to new participant
    const participants = await this.connectionManager.getParticipants();
    this.send(server, {
      type: 'room-state',
      participants: participants.filter(p => p.userId !== userId)
    });
    
    // Notify others of new participant
    const participant = await this.connectionManager.getParticipant(userId);
    this.broadcast({
      type: 'participant-joined',
      participant
    }, server);
    
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
  
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    
    // Parse message
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message as string);
    } catch {
      return; // Invalid message, ignore
    }
    
    // Route to appropriate manager (reducer pattern)
    switch (msg.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        await this.signalingManager.handleSignal(ws, msg);
        break;
        
      case 'media-state':
        await this.mediaStateManager.handleMediaState(ws, msg);
        break;
        
      case 'leave':
        await this.handleLeave(ws);
        break;
        
      default:
        console.warn('Unknown message type:', (msg as any).type);
    }
  }
  
  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    await this.handleLeave(ws);
  }
  
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('WebSocket error:', error);
    await this.handleLeave(ws);
  }
  
  private async handleLeave(ws: WebSocket) {
    const participant = await this.connectionManager.removeParticipant(ws);
    
    if (participant) {
      // Notify others
      this.broadcast({
        type: 'participant-left',
        userId: participant.userId
      });
    }
    
    ws.close();
  }
  
  private async handleStateRequest(): Promise<Response> {
    const participants = await this.connectionManager.getParticipants();
    
    return Response.json({
      gameId: this.gameId,
      participantCount: participants.length,
      participants
    });
  }
  
  // Helper: Send to specific WebSocket
  private send(ws: WebSocket, message: ServerMessage) {
    ws.send(JSON.stringify(message));
  }
  
  // Helper: Broadcast to all except sender
  private broadcast(message: ServerMessage, except?: WebSocket) {
    const sockets = this.ctx.getWebSockets();
    
    for (const socket of sockets) {
      if (socket !== except) {
        this.send(socket, message);
      }
    }
  }
}
```

**Step 3.2: Initialize SQLite Schema**
```typescript
// Add to QconnRoom constructor

async initializeStorage() {
  // Create tables if not exist
  await this.ctx.storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      user_id TEXT PRIMARY KEY,
      peer_id TEXT NOT NULL,
      websocket_id INTEGER NOT NULL,
      media_audio INTEGER DEFAULT 1,
      media_video INTEGER DEFAULT 1,
      media_screen INTEGER DEFAULT 0,
      joined_at INTEGER NOT NULL
    )
  `);
  
  await this.ctx.storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS room_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

// Call in constructor
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  
  this.ctx.blockConcurrencyWhile(async () => {
    await this.initializeStorage();
  });
  
  // Rest of constructor...
}
```

---

### Phase 4: Manager Classes

**Step 4.1: ConnectionManager**

**File:** `qconn/server/managers/connection-manager.ts`
```typescript
import type { DurableObjectState } from 'cloudflare:workers';
import type { QconnParticipant } from '../../shared/types';

export class ConnectionManager {
  
  // Map WebSocket to userId for quick lookup
  private wsToUserId = new Map<WebSocket, string>();
  
  constructor(
    private ctx: DurableObjectState,
    private env: Env
  ) {}
  
  async addParticipant(ws: WebSocket, userId: string): Promise<void> {
    
    // Generate peer ID
    const peerId = crypto.randomUUID();
    
    // Get WebSocket ID (Cloudflare internal tracking)
    const wsId = this.getWebSocketId(ws);
    
    // Store in SQLite
    await this.ctx.storage.sql.exec(
      `INSERT INTO participants 
       (user_id, peer_id, websocket_id, joined_at)
       VALUES (?, ?, ?, ?)`,
      userId,
      peerId,
      wsId,
      Date.now()
    );
    
    // Track in memory
    this.wsToUserId.set(ws, userId);
  }
  
  async removeParticipant(ws: WebSocket): Promise<QconnParticipant | null> {
    
    const userId = this.wsToUserId.get(ws);
    if (!userId) return null;
    
    // Get participant data before deletion
    const participant = await this.getParticipant(userId);
    
    // Delete from SQLite
    await this.ctx.storage.sql.exec(
      `DELETE FROM participants WHERE user_id = ?`,
      userId
    );
    
    // Remove from memory
    this.wsToUserId.delete(ws);
    
    return participant;
  }
  
  async getParticipant(userId: string): Promise<QconnParticipant | null> {
    
    const result = await this.ctx.storage.sql.exec<ParticipantRow>(
      `SELECT * FROM participants WHERE user_id = ?`,
      userId
    ).toArray();
    
    if (result.length === 0) return null;
    
    return this.rowToParticipant(result[0]);
  }
  
  async getParticipants(): Promise<QconnParticipant[]> {
    
    const result = await this.ctx.storage.sql.exec<ParticipantRow>(
      `SELECT * FROM participants ORDER BY joined_at ASC`
    ).toArray();
    
    return result.map(row => this.rowToParticipant(row));
  }
  
  async getParticipantCount(): Promise<number> {
    
    const result = await this.ctx.storage.sql.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM participants`
    ).toArray();
    
    return result[0]?.count || 0;
  }
  
  getWebSocketByUserId(userId: string): WebSocket | null {
    for (const [ws, id] of this.wsToUserId.entries()) {
      if (id === userId) return ws;
    }
    return null;
  }
  
  private getWebSocketId(ws: WebSocket): number {
    // Cloudflare provides this via getWebSockets()
    const sockets = this.ctx.getWebSockets();
    return sockets.indexOf(ws);
  }
  
  private rowToParticipant(row: ParticipantRow): QconnParticipant {
    return {
      userId: row.user_id,
      peerId: row.peer_id,
      mediaState: {
        audio: row.media_audio === 1,
        video: row.media_video === 1,
        screen: row.media_screen === 1
      },
      connectionState: 'connected',
      joinedAt: row.joined_at
    };
  }
}

interface ParticipantRow {
  user_id: string;
  peer_id: string;
  websocket_id: number;
  media_audio: number;
  media_video: number;
  media_screen: number;
  joined_at: number;
}
```

**Step 4.2: SignalingManager**

**File:** `qconn/server/managers/signaling-manager.ts`
```typescript
import type { DurableObjectState } from 'cloudflare:workers';
import type { ClientMessage } from '../../shared/messages';
import { ConnectionManager } from './connection-manager';

export class SignalingManager {
  
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
    private connectionManager: ConnectionManager
  ) {}
  
  async handleSignal(ws: WebSocket, msg: ClientMessage) {
    
    // Validate message has target
    if (!('targetPeer' in msg)) {
      console.error('Signal message missing targetPeer');
      return;
    }
    
    // Find target participant
    const targetUserId = await this.findUserByPeerId(msg.targetPeer);
    if (!targetUserId) {
      console.error('Target peer not found:', msg.targetPeer);
      return;
    }
    
    // Get target WebSocket
    const targetWs = this.connectionManager.getWebSocketByUserId(targetUserId);
    if (!targetWs) {
      console.error('Target WebSocket not found');
      return;
    }
    
    // Get sender info
    const senderUserId = this.connectionManager.getUserIdByWebSocket(ws);
    if (!senderUserId) return;
    
    const sender = await this.connectionManager.getParticipant(senderUserId);
    if (!sender) return;
    
    // Relay signal to target
    const signalMessage = {
      type: 'signal' as const,
      fromPeer: sender.peerId,
      signal: this.extractSignalData(msg)
    };
    
    targetWs.send(JSON.stringify(signalMessage));
  }
  
  private async findUserByPeerId(peerId: string): Promise<string | null> {
    
    const result = await this.ctx.storage.sql.exec<{ user_id: string }>(
      `SELECT user_id FROM participants WHERE peer_id = ?`,
      peerId
    ).toArray();
    
    return result[0]?.user_id || null;
  }
  
  private extractSignalData(msg: ClientMessage) {
    
    switch (msg.type) {
      case 'offer':
        return { type: 'offer', sdp: msg.sdp };
        
      case 'answer':
        return { type: 'answer', sdp: msg.sdp };
        
      case 'ice-candidate':
        return { type: 'ice-candidate', candidate: msg.candidate };
        
      default:
        return {};
    }
  }
}
```

**Step 4.3: MediaStateManager**

**File:** `qconn/server/managers/media-state-manager.ts`
```typescript
import type { DurableObjectState } from 'cloudflare:workers';
import type { ClientMessage } from '../../shared/messages';
import { ConnectionManager } from './connection-manager';

export class MediaStateManager {
  
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
    private connectionManager: ConnectionManager
  ) {}
  
  async handleMediaState(ws: WebSocket, msg: ClientMessage & { type: 'media-state' }) {
    
    // Get user ID
    const userId = this.connectionManager.getUserIdByWebSocket(ws);
    if (!userId) return;
    
    // Update in SQLite
    await this.ctx.storage.sql.exec(
      `UPDATE participants 
       SET media_audio = ?, media_video = ?, media_screen = ?
       WHERE user_id = ?`,
      msg.audio ? 1 : 0,
      msg.video ? 1 : 0,
      msg.screen ? 1 : 0,
      userId
    );
    
    // Broadcast to all other participants
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      if (socket !== ws) {
        socket.send(JSON.stringify({
          type: 'media-state-changed',
          userId,
          state: {
            audio: msg.audio,
            video: msg.video,
            screen: msg.screen
          }
        }));
      }
    }
  }
}
```

**Step 4.4: Update QconnRoom to Pass Managers**
```typescript
// In QconnRoom constructor

this.connectionManager = new ConnectionManager(ctx, env);
this.signalingManager = new SignalingManager(
  ctx, 
  env, 
  this.connectionManager
);
this.mediaStateManager = new MediaStateManager(
  ctx,
  env,
  this.connectionManager
);
```

**Step 4.5: Add getUserIdByWebSocket Helper**
```typescript
// In ConnectionManager class

getUserIdByWebSocket(ws: WebSocket): string | null {
  return this.wsToUserId.get(ws) || null;
}
```

---

## Client Implementation

### Phase 5: Client SDK (Server-Rendered First)

**Step 5.1: Shared Types**

**File:** `qconn/shared/types.ts`
```typescript
export interface QconnParticipant {
  userId: string;
  peerId: string;
  mediaState: MediaState;
  connectionState: ConnectionState;
  joinedAt: number;
}

export interface MediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'reconnecting';

export interface QconnError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface QconnAPI {
  // State
  isEnabled: boolean;
  isConnected: boolean;
  connectionState: ConnectionState;
  participants: QconnParticipant[];
  localStream: MediaStream | null;
  error: QconnError | null;
  
  // Actions
  enable(): Promise<void>;
  disable(): void;
  toggleAudio(): void;
  toggleVideo(): void;
  startScreenShare(): Promise<void>;
  stopScreenShare(): void;
}
```

**Step 5.2: Message Protocol**

**File:** `qconn/shared/messages.ts`
```typescript
import type { QconnParticipant, MediaState } from './types';

// Client → Server messages
export type ClientMessage = 
  | { type: 'offer'; targetPeer: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; targetPeer: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; targetPeer: string; candidate: RTCIceCandidateInit }
  | { type: 'media-state'; audio: boolean; video: boolean; screen: boolean }
  | { type: 'leave' }
  | { type: 'ping' };

// Server → Client messages
export type ServerMessage =
  | { type: 'room-state'; participants: QconnParticipant[] }
  | { type: 'participant-joined'; participant: QconnParticipant }
  | { type: 'participant-left'; userId: string }
  | { type: 'signal'; fromPeer: string; signal: SignalData }
  | { type: 'media-state-changed'; userId: string; state: MediaState }
  | { type: 'error'; error: { code: string; message: string } }
  | { type: 'pong' };

export type SignalData =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };
```

**Step 5.3: Constants**

**File:** `qconn/shared/constants.ts`
```typescript
export const QCONN_CONFIG = {
  // Paths
  WEBSOCKET_PATH: '/qconn/rooms',
  API_PATH: '/qconn',
  
  // Limits
  MAX_PARTICIPANTS: 6,
  MAX_RECONNECT_ATTEMPTS: 3,
  
  // Timeouts
  SIGNALING_TIMEOUT_MS: 10000,
  RECONNECT_DELAY_MS: 2000,
  ICE_GATHERING_TIMEOUT_MS: 5000,
  
  // Media defaults
  DEFAULT_VIDEO_QUALITY: '480p' as const,
  DEFAULT_AUDIO_BITRATE: 50000, // 50 kbps
  DEFAULT_VIDEO_BITRATE: 500000, // 500 kbps
  
  // WebRTC
  ICE_SERVERS: [
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
} as const;

export const VIDEO_CONSTRAINTS = {
  '240p': { width: 426, height: 240, frameRate: 15 },
  '360p': { width: 640, height: 360, frameRate: 20 },
  '480p': { width: 854, height: 480, frameRate: 24 },
  '720p': { width: 1280, height: 720, frameRate: 30 }
} as const;
```

---

### Phase 6: Client Library Core

**Step 6.1: SignalingClient**

**File:** `qconn/client/lib/signaling-client.ts`
```typescript
import { QCONN_CONFIG } from '../../shared/constants';
import type { ClientMessage, ServerMessage } from '../../shared/messages';

export class SignalingClient {
  
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private messageQueue: ClientMessage[] = [];
  
  private eventHandlers = new Map<string, Set<Function>>();
  
  constructor(
    private gameId: string,
    private userId: string
  ) {}
  
  async connect(): Promise<void> {
    
    return new Promise((resolve, reject) => {
      
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${QCONN_CONFIG.WEBSOCKET_PATH}/${this.gameId}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[Qconn] WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Send queued messages
        this.flushQueue();
        
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('[Qconn] WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = (event) => {
        console.log('[Qconn] WebSocket closed:', event.code, event.reason);
        this.handleDisconnect();
      };
    });
  }
  
  disconnect(): void {
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  send(message: ClientMessage): void {
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when reconnected
      this.messageQueue.push(message);
    }
  }
  
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  private handleMessage(data: string): void {
    
    let message: ServerMessage;
    try {
      message = JSON.parse(data);
    } catch {
      console.error('[Qconn] Invalid message:', data);
      return;
    }
    
    // Emit event
    this.emit(message.type, message);
  }
  
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  private handleDisconnect(): void {
    
    // Attempt reconnect
    if (this.reconnectAttempts < QCONN_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      
      console.log(`[Qconn] Reconnecting (attempt ${this.reconnectAttempts})...`);
      
      this.reconnectTimer = window.setTimeout(() => {
        this.connect().catch(err => {
          console.error('[Qconn] Reconnect failed:', err);
        });
      }, QCONN_CONFIG.RECONNECT_DELAY_MS);
      
    } else {
      console.error('[Qconn] Max reconnect attempts reached');
      this.emit('connection-failed', {
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: 'Could not reconnect to signaling server'
      });
    }
  }
  
  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }
}
```

**Step 6.2: MediaManager**

**File:** `qconn/client/lib/media-manager.ts`
```typescript
import { QCONN_CONFIG, VIDEO_CONSTRAINTS } from '../../shared/constants';
import type { MediaState } from '../../shared/types';

export class MediaManager {
  
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  
  private mediaState: MediaState = {
    audio: true,
    video: true,
    screen: false
  };
  
  private onStateChange?: (state: MediaState) => void;
  
  async initialize(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    
    // Default constraints
    const defaultConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: VIDEO_CONSTRAINTS[QCONN_CONFIG.DEFAULT_VIDEO_QUALITY]
    };
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );
      
      return this.localStream;
      
    } catch (err) {
      console.error('[Qconn] Failed to get media:', err);
      throw new Error('Could not access camera/microphone');
    }
  }
  
  toggleAudio(): void {
    if (!this.localStream) return;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.mediaState.audio = audioTrack.enabled;
      this.notifyStateChange();
    }
  }
  
  toggleVideo(): void {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.mediaState.video = videoTrack.enabled;
      this.notifyStateChange();
    }
  }
  
  async startScreenShare(): Promise<void> {
    
    try {
      // @ts-ignore - getDisplayMedia not in all TS versions
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: false
      });
      
      // Handle user stopping screen share via browser UI
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });
      
      this.mediaState.screen = true;
      this.notifyStateChange();
      
    } catch (err) {
      console.error('[Qconn] Screen share failed:', err);
      throw err;
    }
  }
  
  stopScreenShare(): void {
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      this.mediaState.screen = false;
      this.notifyStateChange();
    }
  }
  
  stop(): void {
    
    // Stop all tracks
    this.localStream?.getTracks().forEach(track => track.stop());
    this.screenStream?.getTracks().forEach(track => track.stop());
    
    this.localStream = null;
    this.screenStream = null;
    
    this.mediaState = {
      audio: false,
      video: false,
      screen: false
    };
  }
  
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }
  
  getMediaState(): MediaState {
    return { ...this.mediaState };
  }
  
  setStateChangeHandler(handler: (state: MediaState) => void): void {
    this.onStateChange = handler;
  }
  
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getMediaState());
    }
  }
}
```

**Step 6.3: PeerConnectionManager**

**File:** `qconn/client/lib/peer-connection-manager.ts`
```typescript
import { QCONN_CONFIG } from '../../shared/constants';

export class PeerConnectionManager {
  
  private connections = new Map<string, RTCPeerConnection>();
  private iceServers: RTCIceServer[] = QCONN_CONFIG.ICE_SERVERS;
  
  private onTrack?: (peerId: string, stream: MediaStream) => void;
  private onIceCandidate?: (peerId: string, candidate: RTCIceCandidate) => void;
  private onConnectionStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
  
  async setIceServers(servers: RTCIceServer[]): Promise<void> {
    this.iceServers = servers;
  }
  
  createConnection(
    peerId: string,
    localStream: MediaStream
  ): RTCPeerConnection {
    
    // Don't recreate if exists
    if (this.connections.has(peerId)) {
      return this.connections.get(peerId)!;
    }
    
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers
    });
    
    // Add local tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('[Qconn] Received track from', peerId);
      if (this.onTrack) {
        this.onTrack(peerId, event.streams[0]);
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(peerId, event.candidate);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[Qconn] Connection state:', peerId, pc.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, pc.connectionState);
      }
    };
    
    this.connections.set(peerId, pc);
    return pc;
  }
  
  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    
    const pc = this.connections.get(peerId);
    if (!pc) throw new Error('No connection for peer');
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    return offer;
  }
  
  async createAnswer(peerId: string): Promise<RTCSessionDescriptionInit> {
    
    const pc = this.connections.get(peerId);
    if (!pc) throw new Error('No connection for peer');
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    return answer;
  }
  
  async handleOffer(
    peerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    
    const pc = this.connections.get(peerId);
    if (!pc) throw new Error('No connection for peer');
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
  }
  
  async handleAnswer(
    peerId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    
    const pc = this.connections.get(peerId);
    if (!pc) throw new Error('No connection for peer');
    
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
  
  async handleIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    
    const pc = this.connections.get(peerId);
    if (!pc) throw new Error('No connection for peer');
    
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
  
  closeConnection(peerId: string): void {
    
    const pc = this.connections.get(peerId);
    if (pc) {
      pc.close();
      this.connections.delete(peerId);
    }
  }
  
  closeAll(): void {
    this.connections.forEach((pc, peerId) => {
      pc.close();
    });
    this.connections.clear();
  }
  
  setTrackHandler(handler: (peerId: string, stream: MediaStream) => void): void {
    this.onTrack = handler;
  }
  
  setIceCandidateHandler(handler: (peerId: string, candidate: RTCIceCandidate) => void): void {
    this.onIceCandidate = handler;
  }
  
  setConnectionStateChangeHandler(handler: (peerId: string, state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChange = handler;
  }
}
```

---

### Phase 7: React Integration

**Step 7.1: QconnProvider**

**File:** `qconn/client/QconnProvider.tsx`
```typescript
'use client';

import { createContext, useEffect, useState, useCallback } from 'react';
import { SignalingClient } from './lib/signaling-client';
import { MediaManager } from './lib/media-manager';
import { PeerConnectionManager } from './lib/peer-connection-manager';
import type { QconnAPI, QconnParticipant, MediaState, QconnError } from '../shared/types';
import type { ServerMessage } from '../shared/messages';

interface QconnProviderProps {
  gameId: string;
  userId: string;
  children: React.ReactNode;
}

export const QconnContext = createContext<QconnAPI | null>(null);

export function QconnProvider({ gameId, userId, children }: QconnProviderProps) {
  
  // Managers (singleton instances)
  const [signaling] = useState(() => new SignalingClient(gameId, userId));
  const [mediaManager] = useState(() => new MediaManager());
  const [peerManager] = useState(() => new PeerConnectionManager());
  
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<QconnParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [error, setError] = useState<QconnError | null>(null);
  
  // Fetch TURN credentials
  useEffect(() => {
    fetch('/qconn/turn-credentials')
      .then(res => res.json())
      .then(data => {
        peerManager.setIceServers(data.iceServers);
      })
      .catch(err => {
        console.error('[Qconn] Failed to get TURN credentials:', err);
      });
  }, []);
  
  // Setup signaling handlers
  useEffect(() => {
    
    signaling.on('room-state', (msg: ServerMessage & { type: 'room-state' }) => {
      console.log('[Qconn] Room state:', msg.participants);
      setParticipants(msg.participants);
      
      // Create peer connections to existing participants
      if (localStream) {
        msg.participants.forEach(p => {
          createOfferToPeer(p.peerId);
        });
      }
    });
    
    signaling.on('participant-joined', (msg: ServerMessage & { type: 'participant-joined' }) => {
      console.log('[Qconn] Participant joined:', msg.participant);
      setParticipants(prev => [...prev, msg.participant]);
    });
    
    signaling.on('participant-left', (msg: ServerMessage & { type: 'participant-left' }) => {
      console.log('[Qconn] Participant left:', msg.userId);
      setParticipants(prev => prev.filter(p => p.userId !== msg.userId));
      
      // Find and close peer connection
      const participant = participants.find(p => p.userId === msg.userId);
      if (participant) {
        peerManager.closeConnection(participant.peerId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(participant.peerId);
          return next;
        });
      }
    });
    
    signaling.on('signal', async (msg: ServerMessage & { type: 'signal' }) => {
      console.log('[Qconn] Signal from', msg.fromPeer, msg.signal.type);
      await handleSignal(msg.fromPeer, msg.signal);
    });
    
    signaling.on('media-state-changed', (msg: ServerMessage & { type: 'media-state-changed' }) => {
      console.log('[Qconn] Media state changed:', msg.userId, msg.state);
      setParticipants(prev => 
        prev.map(p => 
          p.userId === msg.userId 
            ? { ...p, mediaState: msg.state }
            : p
        )
      );
    });
    
    signaling.on('connection-failed', (err: QconnError) => {
      setError(err);
      setIsConnected(false);
    });
    
  }, [localStream, participants]);
  
  // Setup peer connection handlers
  useEffect(() => {
    
    peerManager.setTrackHandler((peerId, stream) => {
      console.log('[Qconn] Received stream from', peerId);
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
    });
    
    peerManager.setIceCandidateHandler((peerId, candidate) => {
      signaling.send({
        type: 'ice-candidate',
        targetPeer: peerId,
        candidate: candidate.toJSON()
      });
    });
    
    peerManager.setConnectionStateChangeHandler((peerId, state) => {
      // Update participant connection state
      setParticipants(prev =>
        prev.map(p =>
          p.peerId === peerId
            ? { ...p, connectionState: state as any }
            : p
        )
      );
    });
    
  }, []);
  
  // Setup media state change handler
  useEffect(() => {
    mediaManager.setStateChangeHandler((state: MediaState) => {
      // Notify server
      signaling.send({
        type: 'media-state',
        ...state
      });
    });
  }, []);
  
  // Helper: Create offer to peer
  const createOfferToPeer = useCallback(async (peerId: string) => {
    
    if (!localStream) return;
    
    const pc = peerManager.createConnection(peerId, localStream);
    const offer = await peerManager.createOffer(peerId);
    
    signaling.send({
      type: 'offer',
      targetPeer: peerId,
      sdp: offer
    });
    
  }, [localStream]);
  
  // Helper: Handle incoming signals
  const handleSignal = useCallback(async (
    fromPeer: string,
    signal: any
  ) => {
    
    if (!localStream) return;
    
    switch (signal.type) {
      
      case 'offer':
        // Create connection if not exists
        if (!peerManager.createConnection) {
          peerManager.createConnection(fromPeer, localStream);
        }
        
        await peerManager.handleOffer(fromPeer, signal.sdp);
        const answer = await peerManager.createAnswer(fromPeer);
        
        signaling.send({
          type: 'answer',
          targetPeer: fromPeer,
          sdp: answer
        });
        break;
        
      case 'answer':
        await peerManager.handleAnswer(fromPeer, signal.sdp);
        break;
        
      case 'ice-candidate':
        await peerManager.handleIceCandidate(fromPeer, signal.candidate);
        break;
    }
    
  }, [localStream]);
  
  // API: Enable Qconn
  const enable = useCallback(async () => {
    
    try {
      // Get media
      const stream = await mediaManager.initialize();
      setLocalStream(stream);
      
      // Connect signaling
      await signaling.connect();
      setIsConnected(true);
      setIsEnabled(true);
      
    } catch (err) {
      console.error('[Qconn] Enable failed:', err);
      setError({
        code: 'ENABLE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        recoverable: true
      });
    }
    
  }, []);
  
  // API: Disable Qconn
  const disable = useCallback(() => {
    
    mediaManager.stop();
    peerManager.closeAll();
    signaling.disconnect();
    
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsEnabled(false);
    setIsConnected(false);
    
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disable();
    };
  }, []);
  
  // Build API object
  const api: QconnAPI = {
    isEnabled,
    isConnected,
    connectionState: isConnected ? 'connected' : 'disconnected',
    participants,
    localStream,
    error,
    
    enable,
    disable,
    toggleAudio: () => mediaManager.toggleAudio(),
    toggleVideo: () => mediaManager.toggleVideo(),
    startScreenShare: () => mediaManager.startScreenShare(),
    stopScreenShare: () => mediaManager.stopScreenShare()
  };
  
  return (
    <QconnContext.Provider value={api}>
      {children}
    </QconnContext.Provider>
  );
}
```

**Step 7.2: useQconn Hook**

**File:** `qconn/client/useQconn.ts`
```typescript
'use client';

import { useContext } from 'react';
import { QconnContext } from './QconnProvider';
import type { QconnAPI } from '../shared/types';

export function useQconn(): QconnAPI {
  
  const context = useContext(QconnContext);
  
  if (!context) {
    throw new Error('useQconn must be used within QconnProvider');
  }
  
  return context;
}
```

---

### Phase 8: UI Components

**Step 8.1: QconnPanel (Main UI)**

**File:** `qconn/client/components/QconnPanel.tsx`
```typescript
'use client';

import { useQconn } from '../useQconn';
import { VideoGrid } from './VideoGrid';
import { MediaControls } from './MediaControls';

export function QconnPanel() {
  
  const qconn = useQconn();
  
  if (!qconn.isEnabled) {
    return (
      <div className="qconn-panel qconn-disabled">
        <button 
          onClick={qconn.enable}
          className="qconn-enable-button"
        >
          Enable Voice & Video
        </button>
      </div>
    );
  }
  
  return (
    <div className="qconn-panel qconn-enabled">
      
      {qconn.error && (
        <div className="qconn-error">
          {qconn.error.message}
        </div>
      )}
      
      <VideoGrid />
      
      <MediaControls />
      
    </div>
  );
}
```

**Step 8.2: VideoGrid**

**File:** `qconn/client/components/VideoGrid.tsx`
```typescript
'use client';

import { useQconn } from '../useQconn';
import { useEffect, useRef } from 'react';

export function VideoGrid() {
  
  const qconn = useQconn();
  
  return (
    <div className="qconn-video-grid">
      
      {/* Local video */}
      {qconn.localStream && (
        <VideoTile
          stream={qconn.localStream}
          userId="You"
          muted
          mirrored
        />
      )}
      
      {/* Remote videos */}
      {qconn.participants.map(participant => (
        <RemoteVideoTile
          key={participant.userId}
          participant={participant}
        />
      ))}
      
    </div>
  );
}

function VideoTile({ 
  stream, 
  userId, 
  muted = false,
  mirrored = false 
}: { 
  stream: MediaStream;
  userId: string;
  muted?: boolean;
  mirrored?: boolean;
}) {
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  return (
    <div className="qconn-video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={mirrored ? 'mirrored' : ''}
      />
      <div className="qconn-video-label">{userId}</div>
    </div>
  );
}

function RemoteVideoTile({ 
  participant 
}: { 
  participant: any 
}) {
  
  // Get remote stream for this participant
  // You'll need to expose remoteStreams from QconnProvider
  
  return (
    <div className="qconn-video-tile">
      {/* Implement based on your state management */}
    </div>
  );
}
```

**Step 8.3: MediaControls**

**File:** `qconn/client/components/MediaControls.tsx`
```typescript
'use client';

import { useQconn } from '../useQconn';

export function MediaControls() {
  
  const qconn = useQconn();
  
  return (
    <div className="qconn-media-controls">
      
      <button onClick={qconn.toggleAudio}>
        {/* Audio icon - implement based on qconn.mediaState */}
        Audio
      </button>
      
      <button onClick={qconn.toggleVideo}>
        {/* Video icon */}
        Video
      </button>
      
      <button onClick={qconn.startScreenShare}>
        {/* Screen share icon */}
        Share Screen
      </button>
      
      <button onClick={qconn.disable}>
        Leave
      </button>
      
    </div>
  );
}
```

---

## Deployment & Scaling

### Phase 9: Deployment Checklist

**Step 9.1: Environment Setup**
```bash
# Add secrets
wrangler secret put JWT_SECRET
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID

# Deploy
wrangler deploy
```

**Step 9.2: Monitoring Setup**

Track these metrics in Workers Analytics:
```
- WebSocket connections per minute
- Durable Object duration (GB-seconds)
- Requests to /qconn/* endpoints
- Error rates
- Bandwidth usage (via Realtime dashboard)
```

**Step 9.3: Cost Alerts**

Set up alerts when:
- DO duration > $100/day
- Bandwidth > 1TB/day  
- WebSocket errors > 5%

---

## Testing Strategy

### Phase 10: Testing Plan

**Step 10.1: Local Testing**
```bash
# Start local dev
wrangler dev

# Test in browser
# Open http://localhost:8787/game/[gameId]
# Open in 2 browser tabs
# Enable Qconn in both
# Verify video/audio connection
```

**Step 10.2: Integration Tests**
```typescript
// Test DO signaling
test('QconnRoom accepts connections', async () => {
  const id = env.QCONN_ROOMS.idFromName('test-game');
  const room = env.QCONN_ROOMS.get(id);
  
  // Mock WebSocket upgrade
  const response = await room.fetch(mockWebSocketRequest);
  expect(response.status).toBe(101);
});

// Test connection limit
test('QconnRoom enforces 6 player limit', async () => {
  // Add 6 players
  // 7th should fail with 403
});
```

**Step 10.3: Load Testing**
```typescript
// Simulate 100 concurrent rooms (600 users)
// Monitor:
// - DO creation time
// - Message relay latency
// - Connection success rate
```

---

## Troubleshooting

### Common Issues

**Issue 1: WebSocket fails to connect**

Check:
- [ ] Auth token is valid
- [ ] User has Qconn subscription
- [ ] Correct WebSocket URL (wss://)
- [ ] DO binding configured

**Issue 2: Video not appearing**

Check:
- [ ] getUserMedia permission granted
- [ ] localStream successfully created
- [ ] Peer connection established
- [ ] ICE candidates exchanged
- [ ] Check browser console for errors

**Issue 3: High DO costs**

Check:
- [ ] WebSocket hibernation enabled
- [ ] Auto-response configured
- [ ] Stale connections cleaned up
- [ ] Message batching implemented

**Issue 4: Connection fails (symmetric NAT)**

Check:
- [ ] TURN credentials fetched
- [ ] TURN server accessible
- [ ] ICE servers configured correctly

---

## Roadblocks & Solutions

### Known Limitations

**Limitation 1: SQLite billing starts Jan 7, 2026**

Solution: Monitor storage usage, implement auto-cleanup

**Limitation 2: 128MB memory per DO**

Solution: Current design uses ~10MB per room, well within limit

**Limitation 3: WebSocket message size limits**

Solution: Don't send large data over signaling, use data channels

---

## Next Steps After MVP

1. Add screen share support
2. Add recording to R2
3. Implement quality auto-adjustment
4. Add network stats UI
5. Implement peer-hosted SFU mode
6. Add analytics dashboard

---

## Success Criteria

- [ ] 2 players can video chat in a game
- [ ] 6 players can video chat simultaneously
- [ ] Connection success rate >90%
- [ ] Time to first video <5 seconds
- [ ] Cost per session <$0.10
- [ ] Works on Chrome, Firefox, Safari
- [ ] Mobile responsive (desktop first, mobile later)

---

## File Checklist

Server:
- [ ] `qconn/server/worker.ts`
- [ ] `qconn/server/auth.ts`
- [ ] `qconn/server/qconn-room.ts`
- [ ] `qconn/server/managers/connection-manager.ts`
- [ ] `qconn/server/managers/signaling-manager.ts`
- [ ] `qconn/server/managers/media-state-manager.ts`

Client:
- [ ] `qconn/client/QconnProvider.tsx`
- [ ] `qconn/client/useQconn.ts`
- [ ] `qconn/client/lib/signaling-client.ts`
- [ ] `qconn/client/lib/media-manager.ts`
- [ ] `qconn/client/lib/peer-connection-manager.ts`
- [ ] `qconn/client/components/QconnPanel.tsx`
- [ ] `qconn/client/components/VideoGrid.tsx`
- [ ] `qconn/client/components/MediaControls.tsx`

Shared:
- [ ] `qconn/shared/types.ts`
- [ ] `qconn/shared/messages.ts`
- [ ] `qconn/shared/constants.ts`

Config:
- [ ] `wrangler.toml` updated
- [ ] Secrets configured
- [ ] README.md written

---

End of Implementation Guide