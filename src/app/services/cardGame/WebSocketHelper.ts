// @/app/services/cardGame/WebSocketHelper.ts

export class WebSocketHelper {
    private wsToPlayer: Map<WebSocket, string> = new Map();
    private lastCursorBroadcast: Map<string, number> = new Map();
    private spectatorCount = 0;
  
    // All your logic methods
    handlePing(ws: WebSocket, data: any) {
      if (data.playerId) {
        this.wsToPlayer.set(ws, data.playerId);
      }
      return JSON.stringify({ type: 'pong', timestamp: Date.now() });
    }
  
    handleCursorUpdate(playerId: string, x: number, y: number): { shouldBroadcast: boolean, message?: any } {
      const now = Date.now();
      const lastBroadcast = this.lastCursorBroadcast.get(playerId) || 0;
      
      if (now - lastBroadcast < 16) {
        return { shouldBroadcast: false };
      }
      
      this.lastCursorBroadcast.set(playerId, now);
      
      return {
        shouldBroadcast: true,
        message: { type: 'cursor_update', playerId, x, y, timestamp: now }
      };
    }
  
    handleClose(ws: WebSocket): { wasSpectator: boolean } {
      const wasSpectator = !this.wsToPlayer.has(ws);
      this.wsToPlayer.delete(ws);
      
      if (wasSpectator) {
        this.spectatorCount--;
      }
      
      return { wasSpectator };
    }
  
    getPlayerIdForSocket(ws: WebSocket): string | undefined {
      return this.wsToPlayer.get(ws);
    }
  
    getSpectatorCount(): number {
      return this.spectatorCount;
    }
  }