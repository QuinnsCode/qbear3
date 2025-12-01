// src/app/services/cardGame/WebSocketManager.ts
import type { CardGameState } from '@/app/services/cardGame/CardGameState'; // ✅ FIXED

export class WebSocketManager {
  private gameConnections: Set<WebSocket> = new Set();
  private wsToPlayer: Map<WebSocket, string> = new Map();
  private lastCursorBroadcast: Map<string, number> = new Map();
  private spectatorCount = 0

  constructor(private getGameState: () => CardGameState | null) {} // ✅ FIXED

  handleUpgrade(request: Request): Response {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
  
    server.accept();
    this.gameConnections.add(server);
    
    // Check if this is a spectator (no auth headers)
    const hasAuth = request.headers.has('X-Auth-User-Id')
    const isSpectator = !hasAuth
    
    if (isSpectator) {
      this.spectatorCount++
      console.log(`👁️ Spectator connected. Total: ${this.spectatorCount}`)
    }
    
    console.log(`🃏 Card Game WebSocket connected. Total connections: ${this.gameConnections.size}`);
  
    server.addEventListener('close', () => {
      console.log(`🔌 Card Game WebSocket closed`);
      this.gameConnections.delete(server);
      this.wsToPlayer.delete(server);
      
      if (isSpectator) {
        this.spectatorCount--
        console.log(`👁️ Spectator disconnected. Total: ${this.spectatorCount}`)
      }
    });
  
    server.addEventListener('error', () => {
      console.log(`❌ Card Game WebSocket error`);
      this.gameConnections.delete(server);
      this.wsToPlayer.delete(server);
      
      if (isSpectator) {
        this.spectatorCount--
      }
    });

    server.addEventListener('message', (event) => {
      this.handleWebSocketMessage(server, event.data);
    });

    

    try {
      const currentState = this.getGameState();
      if (server.readyState === WebSocket.OPEN && currentState) {
        server.send(JSON.stringify({
          type: 'state_update',
          state: currentState
        }));
        console.log('📤 Sent initial card game state to new connection');
      }
    } catch (error) {
      console.error('Failed to send initial state:', error);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    let messageString: string;
    
    if (typeof message === 'string') {
      messageString = message;
    } else if (message instanceof ArrayBuffer) {
      messageString = new TextDecoder().decode(message);
    } else {
      console.log('❌ Unknown message type:', typeof message);
      return;
    }
    
    try {
      const data = JSON.parse(messageString);
      console.log('📨 Card game message received:', data.type); // Less verbose
      
      // Heartbeat
      if (data.type === 'ping') {
        if (data.playerId) {
          this.wsToPlayer.set(ws, data.playerId);
        }
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
        return;
      }

      // Cursor updates (ephemeral, throttled)
      if (data.type === 'cursor_move' && data.playerId) {
        this.handleCursorUpdate(data.playerId, data.x, data.y);
        return;
      }
      
    } catch (e) {
      console.log('❌ Failed to parse card game message as JSON:', e);
    }
  }

  // Throttled cursor broadcasting
  private handleCursorUpdate(playerId: string, x: number, y: number): void {
    const now = Date.now();
    const lastBroadcast = this.lastCursorBroadcast.get(playerId) || 0;
    
    // Throttle to ~60fps (16ms)
    if (now - lastBroadcast < 16) {
      return;
    }
    
    this.lastCursorBroadcast.set(playerId, now);
    
    // Broadcast to all OTHER clients (don't echo back to sender)
    this.broadcastExcept(
      { 
        type: 'cursor_update', 
        playerId, 
        x, 
        y,
        timestamp: now 
      },
      playerId
    );
  }

  broadcast(message: any): void {
    try {
      if (!message || typeof message !== 'object') {
        console.error('❌ Invalid message object:', message);
        return;
      }
      
      const jsonString = JSON.stringify(message, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (value === undefined) {
          return null;
        }
        return value;
      });
      
      try {
        JSON.parse(jsonString);
      } catch (parseError) {
        console.error('❌ JSON serialization failed:', parseError);
        console.error('❌ Problem message:', message);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const ws of this.gameConnections) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(jsonString);
            successCount++;
          } catch (error) {
            console.error('Failed to send card game update:', error);
            this.gameConnections.delete(ws);
            this.wsToPlayer.delete(ws);
            failCount++;
          }
        } else {
          this.gameConnections.delete(ws);
          this.wsToPlayer.delete(ws);
          failCount++;
        }
      }
      
      // Only log if there were failures or if it's an important message
      if (failCount > 0 || message.type !== 'cursor_update') {
        console.log(`📊 Broadcast ${message.type}: ${successCount} sent, ${failCount} failed`);
      }
      
    } catch (error) {
      console.error('Error broadcasting card game message:', error);
      console.error('Problem message object:', message);
    }
  }

  // Broadcast to everyone EXCEPT one player (for cursor updates)
  broadcastExcept(message: any, excludePlayerId: string): void {
    try {
      const jsonString = JSON.stringify(message, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (value === undefined) {
          return null;
        }
        return value;
      });
      
      let successCount = 0;
      let failCount = 0;
      
      for (const ws of this.gameConnections) {
        // Skip the player who sent this cursor update
        const wsPlayerId = this.wsToPlayer.get(ws);
        if (wsPlayerId === excludePlayerId) {
          continue;
        }

        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(jsonString);
            successCount++;
          } catch (error) {
            console.error('Failed to send message:', error);
            this.gameConnections.delete(ws);
            this.wsToPlayer.delete(ws);
            failCount++;
          }
        } else {
          this.gameConnections.delete(ws);
          this.wsToPlayer.delete(ws);
          failCount++;
        }
      }
      
      // Don't log every cursor update (too spammy)
      // console.log(`🖱️ Cursor broadcast: ${successCount} sent, ${failCount} failed`);
      
    } catch (error) {
      console.error('Error broadcasting cursor:', error);
    }
  }

  closeAll(): void {
    console.log(`🔌 Closing all Card Game WebSocket connections (${this.gameConnections.size} total)`);
    
    for (const ws of this.gameConnections) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Card game deleted');
          console.log(`✅ Closed WebSocket connection`);
        }
      } catch (error) {
        console.error(`❌ Failed to close connection:`, error);
      }
    }
    
    this.gameConnections.clear();
    this.wsToPlayer.clear();
    console.log('✅ All Card Game WebSocket connections closed and cleared');
  }

  getSpectatorCount(): number {
    return this.spectatorCount
  }
}