// src/durableObjects/presenceDurableObject.ts
import { RealtimeDurableObject } from "rwsdk/realtime/durableObject";
// import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

// Server-side presence configuration - adjust these as needed
const PRESENCE_SERVER_SETTINGS = {
  // How often to cleanup stale connections (in milliseconds)
  CLEANUP_INTERVAL: 30000, // 30 seconds
  
  // How long before a user is considered stale/inactive (in milliseconds)
  STALE_THRESHOLD: 30000, // 30 seconds (reduced from 1 minute as noted in original)
  
  // Username generation settings
  USERNAME_CONFIG: {
    dictionaries: [adjectives, animals] as string[][],
    separator: '-',
    length: 2,
    style: 'lowerCase' as const
  },
  
  // Connection limits (for potential future use)
  MAX_CONNECTIONS_PER_ROOM: 100,
  
  // Heartbeat tolerance - how long to wait for heartbeats before cleanup
  HEARTBEAT_TIMEOUT: 45000, // 45 seconds (should be > client heartbeat interval)
  
  // Broadcast throttling - minimum time between broadcasts
  MIN_BROADCAST_INTERVAL: 100, // 100ms to prevent spam
} as const;

interface UserPresence {
  userId: string;
  username: string;
  joinedAt: number;
  lastSeen: number;
}

export class PresenceDurableObject extends RealtimeDurableObject {
  private presence: Map<string, UserPresence> = new Map();
  private wsToUser: Map<WebSocket, string> = new Map();
  private usernames: Map<string, string> = new Map();
  private lastBroadcast: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    
    console.log('⚙️ Presence Durable Object initialized with settings:', PRESENCE_SERVER_SETTINGS);
    
    // Clean up stale connections at configured interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, PRESENCE_SERVER_SETTINGS.CLEANUP_INTERVAL);
  }

  // Clean up interval when object is destroyed
  async alarm(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    // Only call super.alarm() if it exists
    if (super.alarm) {
      await super.alarm();
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle presence API calls
    if (url.pathname === '/__realtime/presence') {
      return this.handlePresenceAPI(request);
    }
    
    // Handle WebSocket upgrades
    if (request.headers.get("Upgrade") === "websocket") {
      const response = await super.fetch(request);
      
      // Track the WebSocket connection for broadcasting
      if (response.webSocket) {
        // Check connection limits
        if (this.wsToUser.size >= PRESENCE_SERVER_SETTINGS.MAX_CONNECTIONS_PER_ROOM) {
          console.log(`⚠️ Maximum connections reached (${PRESENCE_SERVER_SETTINGS.MAX_CONNECTIONS_PER_ROOM})`);
          response.webSocket.close(1008, 'Room at capacity');
          return response;
        }

        // We'll associate this WebSocket with a user when they send presence info
        response.webSocket.addEventListener('close', () => {
          const userId = this.wsToUser.get(response.webSocket!);
          if (userId) {
            console.log(`🔌 WebSocket closed for user: ${userId}`);
            this.removeUserPresence(userId);
            this.wsToUser.delete(response.webSocket!);
          }
        });

        response.webSocket.addEventListener('error', () => {
          const userId = this.wsToUser.get(response.webSocket!);
          if (userId) {
            console.log(`❌ WebSocket error for user: ${userId}`);
            this.removeUserPresence(userId);
            this.wsToUser.delete(response.webSocket!);
          }
        });
      }
      
      return response;
    }
    
    return super.fetch(request);
  }

  private async handlePresenceAPI(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      try {
        const data = await request.json() as {
          userId?: string; // Make optional for anonymous users
          username?: string;
          action: 'join' | 'leave';
          pathname: string;
        };
        
        if (data.action === 'join') {
          // Generate anonymous user if no userId provided
          const effectiveUserId = data.userId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          const result = this.addUserPresence(effectiveUserId, data.username);
          
          // Return the user info (including generated ID and username)
          return new Response(JSON.stringify({
            success: true,
            userId: effectiveUserId,
            username: result.username
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (data.action === 'leave') {
          this.removeUserPresence(data.userId!);
          return new Response(JSON.stringify({ success: true }));
        }
        
        return new Response('Invalid action', { status: 400 });
      } catch (error) {
        return new Response('Invalid JSON', { status: 400 });
      }
    }
    
    // Handle GET requests to return current presence
    if (request.method === 'GET') {
      const presenceList = Array.from(this.presence.values());
      return new Response(JSON.stringify(presenceList), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Method not allowed', { status: 405 });
  }

  private getOrGenerateUsername(userId: string): string {
    if (!this.usernames.has(userId)) {
      const name = uniqueNamesGenerator(PRESENCE_SERVER_SETTINGS.USERNAME_CONFIG);
      this.usernames.set(userId, name);
    }
    return this.usernames.get(userId)!;
  }

  private addUserPresence(userId: string, username?: string): UserPresence {
    const now = Date.now();
    const existing = this.presence.get(userId);
    
    // Use provided username OR generate anonymous name as fallback
    const displayName = username || this.getOrGenerateUsername(userId);
    
    const userPresence: UserPresence = {
      userId,
      username: displayName,
      joinedAt: existing?.joinedAt || now,
      lastSeen: now
    };
    
    this.presence.set(userId, userPresence);
    
    console.log(`👋 User ${displayName} joined presence`);
    this.broadcastPresenceUpdate();
    
    return userPresence; // Return the created presence object
  }

  private removeUserPresence(userId: string) {
    const user = this.presence.get(userId);
    if (user) {
      this.presence.delete(userId);
      // Clean up generated username if it was anonymous
      if (this.usernames.has(userId)) {
        this.usernames.delete(userId);
      }
      console.log(`👋 User ${user.username} left presence`);
      this.broadcastPresenceUpdate();
    }
  }

  private broadcastPresenceUpdate() {
    const now = Date.now();
    
    // Throttle broadcasts to prevent spam
    if (now - this.lastBroadcast < PRESENCE_SERVER_SETTINGS.MIN_BROADCAST_INTERVAL) {
      return;
    }
    this.lastBroadcast = now;

    const presenceList = Array.from(this.presence.values());
    
    console.log(`📡 Broadcasting presence update to ${this.wsToUser.size} connections:`, 
                presenceList.map(p => p.username));
    
    // Broadcast to all connected WebSockets
    for (const [ws, userId] of this.wsToUser.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'presence_update',
            data: presenceList
          }));
        } catch (error) {
          console.error('Failed to send presence update:', error);
          // Remove failed connections
          this.wsToUser.delete(ws);
        }
      } else {
        // Clean up closed connections
        this.wsToUser.delete(ws);
      }
    }
  }

  // Override to handle custom messages
  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const messageLength = typeof message === 'string' ? message.length : message.byteLength;
    console.log('📨 WebSocket message received, type:', typeof message, 'length:', messageLength);
    
    let messageString: string;
    
    // Handle different message types
    if (typeof message === 'string') {
      messageString = message;
    } else if (message instanceof ArrayBuffer) {
      messageString = new TextDecoder().decode(message);
    } else {
      console.log('❌ Unknown message type:', typeof message);
      return await super.webSocketMessage(ws, message as ArrayBuffer);
    }
    
    console.log('📨 Message content:', messageString);
    
    try {
      const data = JSON.parse(messageString);
      console.log('📨 Parsed message:', data);
      
      if (data.type === 'presence_heartbeat' && data.userId) {
        console.log('💓 Received heartbeat from user:', data.userId);
        
        // Update last seen time
        const user = this.presence.get(data.userId);
        if (user) {
          user.lastSeen = Date.now();
          // Associate this WebSocket with the user
          this.wsToUser.set(ws, data.userId);
          console.log('🔗 Associated WebSocket with user:', data.userId);
          console.log('🔗 Total WebSocket connections:', this.wsToUser.size);
          
          // Send current presence to this newly connected user
          this.sendPresenceToConnection(ws);
          
          // Broadcast updated presence to all connections
          this.broadcastPresenceUpdate();
        } else {
          console.log('❌ User not found in presence map:', data.userId);
        }
        return; // Don't pass heartbeat messages to parent
      }
    } catch (e) {
      console.log('❌ Failed to parse message as JSON:', e);
      // Not a JSON message or parsing failed, pass to parent
    }
    
    // Call parent handler for other messages
    return await super.webSocketMessage(ws, message as ArrayBuffer);
  }

  // Helper method to send presence to a specific connection
  private sendPresenceToConnection(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
      const presenceList = Array.from(this.presence.values());
      try {
        ws.send(JSON.stringify({
          type: 'presence_update',
          data: presenceList
        }));
        console.log('📤 Sent presence update to connection:', presenceList.map(p => p.username));
      } catch (error) {
        console.error('Failed to send presence to connection:', error);
      }
    }
  }

  // Cleanup stale connections periodically
  private cleanupStaleConnections() {
    const now = Date.now();
    
    for (const [userId, presence] of this.presence.entries()) {
      if (now - presence.lastSeen > PRESENCE_SERVER_SETTINGS.STALE_THRESHOLD) {
        console.log(`🧹 Cleaning up stale presence for user ${presence.username} (inactive for ${now - presence.lastSeen}ms)`);
        this.removeUserPresence(userId);
      }
    }
    
    // Also check for heartbeat timeouts (more lenient than stale threshold)
    for (const [userId, presence] of this.presence.entries()) {
      if (now - presence.lastSeen > PRESENCE_SERVER_SETTINGS.HEARTBEAT_TIMEOUT) {
        console.log(`💔 User ${presence.username} missed heartbeat timeout, removing`);
        this.removeUserPresence(userId);
      }
    }
  }
}