// src/app/services/game/gameFunctions/websocket/WebSocketManager.ts
import type { GameState } from '@/app/lib/GameState';

export class WebSocketManager {
  private gameConnections: Set<WebSocket> = new Set();
  private wsToPlayer: Map<WebSocket, string> = new Map();

  constructor(private getGameState: () => GameState | null) {}

  handleUpgrade(request: Request): Response {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    this.gameConnections.add(server);
    console.log(`🎮 Game WebSocket connected. Total connections: ${this.gameConnections.size}`);

    server.addEventListener('close', () => {
      console.log(`🔌 Game WebSocket closed`);
      this.gameConnections.delete(server);
      this.wsToPlayer.delete(server);
    });

    server.addEventListener('error', () => {
      console.log(`❌ Game WebSocket error`);
      this.gameConnections.delete(server);
      this.wsToPlayer.delete(server);
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
        console.log('📤 Sent initial game state to new connection');
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
      console.log('📨 Game message received:', data);
      
      if (data.type === 'ping' && data.gameId) {
        console.log('💓 Received game heartbeat:', data.gameId, data.playerId);
        
        if (data.playerId) {
          this.wsToPlayer.set(ws, data.playerId);
          console.log('🔗 Associated WebSocket with player:', data.playerId);
        }
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
        return;
      }
      
    } catch (e) {
      console.log('❌ Failed to parse game message as JSON:', e);
    }
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
            console.error('Failed to send game update:', error);
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
      
      console.log(`📊 Broadcast complete: ${successCount} sent, ${failCount} failed/closed`);
      
    } catch (error) {
      console.error('Error broadcasting game message:', error);
      console.error('Problem message object:', message);
    }
  }

  // ✅ NEW: Close all WebSocket connections (e.g., when game is deleted)
  closeAll(): void {
    console.log(`🔌 Closing all WebSocket connections (${this.gameConnections.size} total)`);
    
    for (const ws of this.gameConnections) {
      try {
        // Send close frame with code 1000 (normal closure) and reason
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Game deleted');
          console.log(`✅ Closed WebSocket connection`);
        }
      } catch (error) {
        console.error(`❌ Failed to close connection:`, error);
      }
    }
    
    // Clear both maps/sets
    this.gameConnections.clear();
    this.wsToPlayer.clear();
    console.log('✅ All WebSocket connections closed and cleared');
  }
}