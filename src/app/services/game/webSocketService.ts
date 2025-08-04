
// ===== /app/services/game/webSocketService.ts =====
export function handleWebSocketUpgrade(
  request: Request,
  gameConnections: Set<WebSocket>,
  wsToPlayer: Map<WebSocket, string>,
  messageHandler: (ws: WebSocket, message: string | ArrayBuffer) => void,
  getStateFn: () => Promise<any>
): Response {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();
  gameConnections.add(server);
  console.log(`🎮 Game WebSocket connected. Total connections: ${gameConnections.size}`);

  server.addEventListener('close', () => {
    console.log(`🔌 Game WebSocket closed`);
    gameConnections.delete(server);
    wsToPlayer.delete(server);
  });

  server.addEventListener('error', () => {
    console.log(`❌ Game WebSocket error`);
    gameConnections.delete(server);
    wsToPlayer.delete(server);
  });

  server.addEventListener('message', (event) => {
    messageHandler(server, event.data);
  });

  // Send initial state
  getStateFn().then(currentState => {
    if (server.readyState === WebSocket.OPEN) {
      server.send(JSON.stringify({
        type: 'state_update',
        state: currentState
      }));
      console.log('📤 Sent initial game state to new connection');
    }
  }).catch(error => {
    console.error('Failed to send initial state:', error);
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

export function handleWebSocketMessage(
  ws: WebSocket,
  message: string | ArrayBuffer,
  wsToPlayer: Map<WebSocket, string>
): void {
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
        wsToPlayer.set(ws, data.playerId);
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

export function broadcast(
  message: any,
  gameConnections: Set<WebSocket>,
  wsToPlayer: Map<WebSocket, string>
): void {
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
    
    for (const ws of gameConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(jsonString);
          successCount++;
        } catch (error) {
          console.error('Failed to send game update:', error);
          gameConnections.delete(ws);
          wsToPlayer.delete(ws);
          failCount++;
        }
      } else {
        gameConnections.delete(ws);
        wsToPlayer.delete(ws);
        failCount++;
      }
    }
    
    console.log(`📊 Broadcast complete: ${successCount} sent, ${failCount} failed/closed`);
    
  } catch (error) {
    console.error('Error broadcasting game message:', error);
    console.error('Problem message object:', message);
  }
}