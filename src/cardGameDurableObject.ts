// src/cardGameDurableObject.ts
/**
 * MTG COMMANDER VIRTUAL TABLETOP - Durable Object Game State Manager
 */
import { DurableObject } from "cloudflare:workers";

// Types
import type { 
  CardGameState, 
  CardGameAction,
  MTGPlayer,
  Card
} from '@/app/services/cardGame/CardGameState'

import { 
  PLAYER_POSITIONS,
  POSITION_COLORS,
  COMMANDER_STARTING_LIFE
} from '@/app/services/cardGame/CardGameState'

// Managers
import { CardManager } from '@/app/services/cardGame/managers/CardManager';
import { ZoneManager } from '@/app/services/cardGame/managers/ZoneManager';
import { DeckImportManager } from '@/app/services/cardGame/managers/DeckImportManager';
import { SandboxManager } from '@/app/services/cardGame/managers/SandboxManager';
import { getStarterDeck } from './app/serverActions/cardGame/starterDecks';
import { WebSocketHelper } from './app/services/cardGame/WebSocketHelper';

const CURSOR_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

export class CardGameDO extends DurableObject {
  private gameState: CardGameState | null = null;
  private gameId: string | null = null;
  
  
  // ✅ Track WebSocket metadata (replaces wsManager's tracking)
  private wsToPlayer: Map<WebSocket, string> = new Map();

  //ws helper class for logic
  private wsHelper: WebSocketHelper;

  private lastCursorBroadcast: Map<string, number> = new Map();
  private spectatorCount = 0;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.wsHelper = new WebSocketHelper();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url); 
    const method = request.method;
  
    try {
      // ✅ Handle WebSocket upgrades directly in the DO
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocketUpgrade(request);
      }

      // Handle sandbox initialization
      if (url.pathname === '/init-sandbox' && method === 'POST') {
        try {
          const { starterDecks, config } = await request.json();
          
          console.log('📦 Initializing sandbox with', starterDecks.length, 'decks');
          
          // Store in DO storage
          await this.ctx.storage.put('isSandbox', true);
          await this.ctx.storage.put('sandboxConfig', config);
          await this.ctx.storage.put('starterDecks', starterDecks);
          
          console.log('✅ Sandbox initialized in DO storage');
          
          return Response.json({ success: true });
        } catch (error) {
          console.error('❌ Error initializing sandbox:', error);
          return Response.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, { status: 500 });
        }
      }

      if (url.pathname === '/reinit-sandbox' && method === 'POST') {
        try {
          console.log('🔄 Reinitializing sandbox data...');
          
          // Clear old data
          await this.ctx.storage.delete('starterDecks');
          
          console.log('✅ Cleared old sandbox data, will reinit on next game load');
          
          return Response.json({ success: true });
        } catch (error) {
          console.error('❌ Error reinitializing:', error);
          return Response.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, { status: 500 });
        }
      }
    
      // Handle DELETE - wipe storage
      if (method === 'DELETE') {
        console.log('🗑️ DELETE request received - wiping Card Game storage');
        
        try {
          // ✅ Use new broadcast method
          this.broadcast({ 
            type: 'game_deleted', 
            message: 'This game has been deleted' 
          });
          
          // ✅ Use new close method
          this.closeAllWebSockets();
          await this.ctx.storage.deleteAll();
          this.gameState = null;
          
          console.log('✅ Card Game storage completely wiped');
          return Response.json({ 
            success: true, 
            message: 'Game storage deleted successfully' 
          });
        } catch (deleteError) {
          console.error('❌ Error during deletion:', deleteError);
          return Response.json({ 
            success: false, 
            error: deleteError instanceof Error ? deleteError.message : 'Deletion failed' 
          }, { status: 500 });
        }
      }
    
      // GET - return current state
      // In the fetch() method, after "if (method === 'GET')" around line 120:
      if (method === 'GET') {
        let state = await this.getState();
        
        // 🔧 SELF-HEALING: Fix broken sandbox decks
        const isSandbox = await this.ctx.storage.get('isSandbox');
        if (isSandbox) {
          let needsHealing = false;
          
          for (const player of state.players) {
            // Detect broken deck: has deckList but library is empty
            if (player.deckList?.deckName && player.zones.library.length === 0) {
              console.log(`[HEAL] 🔧 Detected broken deck for ${player.name}, reimporting...`);
              needsHealing = true;
              
              // Auto-reimport their deck
              await this.applyAction({
                type: 'import_deck',
                playerId: player.id,
                data: {
                  deckListText: '', // Will be ignored
                  deckName: player.deckList.deckName,
                }
              });
            }
          }
          
          if (needsHealing) {
            // Reload state after healing
            state = await this.getState();
            console.log(`[HEAL] ✅ Self-healing complete`);
          }
        }
        
        return Response.json(state);
      }
      
      // POST - handle actions OR join
      if (method === 'POST') {
        const requestData = await request.json() as any;

        // Restart game
        if (requestData.action === 'restart_game') {
          const result = await this.restartGame();
          return Response.json(result);
        }
        
        console.log('📥 POST request data:', requestData);
        
        // JOIN GAME REQUEST
        if (requestData.playerId && requestData.playerName && !requestData.type) {
          console.log('👋 Join game request detected');
          const joinResult = await this.joinGame(requestData);
          return Response.json(joinResult);
        }
        
        // GAME ACTION REQUEST
        if (requestData.type) {
          console.log(`🎬 Action request detected: ${requestData.type}`);
          const result = await this.applyAction(requestData);
          return Response.json(result);
        }
        
        // Unknown POST format
        console.error('❌ Unknown POST request format:', requestData);
        return new Response('Invalid POST data - must have either (playerId + playerName) or (type + playerId + data)', { status: 400 });
      }
      
      // PUT - rewind to action
      if (method === 'PUT') {
        const { actionIndex } = await request.json() as any;
        const rewindResult = await this.rewindToAction(actionIndex);
        return Response.json(rewindResult);
      }
      
      return new Response('Method not allowed', { status: 405 });
      
    } catch (error: any) {
      console.error('CardGameDO error:', error);
      return new Response(`Error: ${error?.message || error}`, { status: 500 });
    }
  }

  // Direct WebSocket upgrade handler using Hibernation API
  private handleWebSocketUpgrade(request: Request): Response {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    
    // ✅ THIS IS THE KEY - use Hibernation API
    this.ctx.acceptWebSocket(server);
    
    // Check if spectator
    const hasAuth = request.headers.has('X-Auth-User-Id');
    const isSpectator = !hasAuth;
    
    if (isSpectator) {
      this.spectatorCount++;
      console.log(`👁️ Spectator connected. Total: ${this.spectatorCount}`);
    }
    
    console.log(`🃏 WebSocket connected (hibernation enabled)`);
    
    // Send initial state
    try {
      if (this.gameState) {
        server.send(JSON.stringify({
          type: 'state_update',
          state: this.gameState
        }));
        console.log('📤 Sent initial state to new connection');
      }
    } catch (error) {
      console.error('Failed to send initial state:', error);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let messageString: string;
    
    if (typeof message === 'string') {
      messageString = message;
    } else if (message instanceof ArrayBuffer) {
      messageString = new TextDecoder().decode(message);
    } else {
      return;
    }
    
    try {
      const data = JSON.parse(messageString);
      
      // ✅ But delegate the LOGIC to the helper
      if (data.type === 'ping') {
        const response = this.wsHelper.handlePing(ws, data);
        ws.send(response);
        return;
      }

      if (data.type === 'cursor_move' && data.playerId) {
        const result = this.wsHelper.handleCursorUpdate(data.playerId, data.x, data.y);
        if (result.shouldBroadcast) {
          this.broadcastExcept(result.message, data.playerId);
        }
        return;
      }
      
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // ✅ Delegate to helper
    const result = this.wsHelper.handleClose(ws);
    console.log(`🔌 WebSocket closed: code=${code}, wasSpectator=${result.wasSpectator}`);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('❌ WebSocket error:', error);
  }

  private handleCursorUpdate(senderWs: WebSocket, playerId: string, x: number, y: number): void {
    const now = Date.now();
    const lastBroadcast = this.lastCursorBroadcast.get(playerId) || 0;
    
    // Throttle to ~60fps (16ms)
    if (now - lastBroadcast < 16) {
      return;
    }
    
    this.lastCursorBroadcast.set(playerId, now);
    
    // Broadcast to all OTHER clients
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

  // ✅ Broadcast using ctx.getWebSockets() instead of manual tracking
  private broadcast(message: any): void {
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
      
      const sockets = this.ctx.getWebSockets();
      
      let successCount = 0;
      let failCount = 0;
      
      for (const ws of sockets) {
        try {
          ws.send(jsonString);
          successCount++;
        } catch (error) {
          console.error('Failed to send:', error);
          failCount++;
        }
      }
      
      if (failCount > 0 || message.type !== 'cursor_update') {
        console.log(`📊 Broadcast ${message.type}: ${successCount} sent, ${failCount} failed`);
      }
    } catch (error) {
      console.error('Error broadcasting:', error);
    }
  }

  private broadcastExcept(message: any, excludePlayerId: string): void {
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
      
      const sockets = this.ctx.getWebSockets();
      
      for (const ws of sockets) {
        const wsPlayerId = this.wsToPlayer.get(ws);
        if (wsPlayerId === excludePlayerId) {
          continue;
        }
        
        try {
          ws.send(jsonString);
        } catch (error) {
          console.error('Failed to send:', error);
        }
      }
    } catch (error) {
      console.error('Error broadcasting:', error);
    }
  }

  // ✅ Update closeAll for DELETE operations
  private closeAllWebSockets(): void {
    console.log(`🔌 Closing all WebSocket connections`);
    
    const sockets = this.ctx.getWebSockets();
    
    for (const ws of sockets) {
      try {
        ws.close(1000, 'Game deleted');
      } catch (error) {
        console.error('Failed to close connection:', error);
      }
    }
    
    this.wsToPlayer.clear();
    this.lastCursorBroadcast.clear();
    console.log('✅ All WebSocket connections closed');
  }

  async getState(): Promise<CardGameState> {
    if (!this.gameState) {
      await this.loadState();
    }
    
    if (!this.gameState) {
      this.gameState = await this.createDefaultGame(this.gameId || undefined);
    }
    
    return this.gameState;
  }

  async loadState(): Promise<void> {
    const stored = await this.ctx.storage.get<CardGameState>('cardGameState');
    if (stored) {
      this.gameState = stored;
      this.gameState.createdAt = new Date(this.gameState.createdAt);
      this.gameState.updatedAt = new Date(this.gameState.updatedAt);
      this.gameState.actions = this.gameState.actions.map(action => ({
        ...action,
        timestamp: new Date(action.timestamp)
      }));
    }
  }

  async createDefaultGame(gameId?: string): Promise<CardGameState> {
    const id = gameId || this.ctx.id.toString();
    
    this.gameState = {
      id,
      status: 'active',
      players: [],
      cards: {},
      actions: [],
      currentActionIndex: -1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  
    await this.persist();
    return this.gameState;
  }

  async restartGame(): Promise<CardGameState> {
    const gameId = this.ctx.id.toString()
    
    this.gameState = {
      id: gameId,
      status: 'active',
      players: [],
      cards: {},
      actions: [],
      currentActionIndex: -1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  
    await this.persist();
    
    this.broadcast({
      type: 'game_restarted', 
      state: this.gameState 
    });
  
    return this.gameState;
  }

  async joinGame(data: { playerId: string, playerName: string, gameId?: string }): Promise<CardGameState> {
    if (data.gameId) {
      this.gameId = data.gameId;
    }
    
    if (!this.gameState) {
      await this.getState();
    }
  
    // Check if player already exists
    const existingPlayer = this.gameState?.players.find(p => p.id === data.playerId);
    if (existingPlayer) {
      console.log(`✅ Player ${data.playerName} already in game`);
      console.log(`📋 Player deck status:`, {
        hasDeck: !!existingPlayer.deckList,
        deckName: existingPlayer.deckList?.deckName,
        libraryCount: existingPlayer.zones.library.length
      });
      
      // ✅ Just broadcast current state - deck is already there!
      this.broadcast({ 
        type: 'player_rejoined', 
        state: this.gameState 
      });
      
      return this.gameState;
    }
  
    // Check if sandbox mode
    const isSandbox = await this.ctx.storage.get('isSandbox');
    const sandboxConfig = await this.ctx.storage.get('sandboxConfig');
    
    // Max players check using SandboxManager
    const maxPlayers = SandboxManager.getMaxPlayers(isSandbox as boolean, sandboxConfig);
    if (this.gameState.players.length >= maxPlayers) {
      throw new Error(`Game is full (max ${maxPlayers} players)`);
    }
  
    // Auto-assign position (cycle through 4 positions)
    const assignedPosition = PLAYER_POSITIONS[this.gameState.players.length % 4];
    const cursorColor = POSITION_COLORS[assignedPosition];
  
    const newPlayer: MTGPlayer = {
      id: data.playerId,
      name: data.playerName,
      position: assignedPosition,
      cursorColor: cursorColor,
      life: COMMANDER_STARTING_LIFE,
      deckList: undefined,
      zones: {
        library: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: []
      }
    };
  
    this.gameState.players.push(newPlayer);
    this.gameState.updatedAt = new Date();
  
    await this.persist();
    
    console.log(`✅ Player ${data.playerName} joined as ${assignedPosition} (${cursorColor})`);
    this.broadcast({ 
      type: 'player_joined', 
      player: newPlayer 
    });
  
    // ✅ AUTO-ASSIGN DECK IN SANDBOX MODE (NEW PLAYERS)
    if (isSandbox) {
      await this.assignSandboxDeck(data.playerId, this.gameState.players.length - 1);
    }
  
    return this.gameState;
  }

  private async assignSandboxDeck(playerId: string, playerIndex: number): Promise<void> {
    try {
      const starterDecks = await this.ctx.storage.get('starterDecks') as any[];
      
      if (!starterDecks || starterDecks.length === 0) {
        console.error('❌ No starter decks available in storage');
        return;
      }
      
      const assignedDeck = SandboxManager.getDeckForPlayer(playerIndex, starterDecks);
      
      if (!assignedDeck) {
        console.error('❌ Failed to get deck from SandboxManager');
        return;
      }
      
      console.log(`🎴 Assigning "${assignedDeck.deckName}" to player ${playerId} (player #${playerIndex})`);
      
      const cardData = SandboxManager.buildCardDataForImport(assignedDeck);
      
      // ✅ BUILD A FAKE DECK LIST TEXT - This tricks the parser
      // The parser expects "4 Lightning Bolt\n3 Mountain\n..." format
      const fakeDeckList = assignedDeck.cards
        .reduce((acc: any[], card: any) => {
          const existing = acc.find(c => c.name === card.name);
          if (existing) {
            existing.quantity++;
          } else {
            acc.push({ name: card.name, quantity: 1 });
          }
          return acc;
        }, [])
        .map((c: any) => `${c.quantity} ${c.name}`)
        .join('\n');
      
      await this.applyAction({
        type: 'import_deck',
        playerId: playerId,
        data: {
          deckListText: fakeDeckList, // ✅ This will parse successfully now
          deckName: assignedDeck.deckName,
          cardData: cardData, // ✅ And this provides the actual card data
        }
      });
      
      console.log(`✅ Successfully assigned "${assignedDeck.deckName}" to player ${playerId}`);
      
    } catch (error) {
      console.error('❌ Failed to assign sandbox deck:', error);
    }
  }

  async applyAction(action: Omit<CardGameAction, 'id' | 'timestamp'>): Promise<CardGameState> {
    if (!this.gameState) {
      await this.getState();
    }
  
    // ✅ INJECT CARDDATA FOR SANDBOX MANUAL IMPORTS
    if (action.type === 'import_deck') {
      const isSandbox = await this.ctx.storage.get('isSandbox');
      if (isSandbox && !action.data.cardData) {
        await this.injectSandboxCardData(action);
      }
    }
  
    if (!this.gameState) {
      throw new Error('No game state found');
    }
  
    // ✅ CHECK PERMISSIONS BEFORE PROCESSING (for sandbox shared battlefield)
    const actionsRequiringPermission = [
      'move_card',
      'move_card_position',
      'tap_card',          // ✅ ADD THIS
      'untap_card',        // ✅ ADD THIS
      'flip_card',         // ✅ ADD THIS
      'rotate_card',       // ✅ ADD THIS
    ];
    
    if (actionsRequiringPermission.includes(action.type)) {
      const isSandbox = await this.ctx.storage.get('isSandbox') as boolean;
      const sandboxConfig = await this.ctx.storage.get('sandboxConfig');
      
      // ✅ Use the new canPlayerInteractWithCard method
      const canInteract = SandboxManager.canPlayerInteractWithCard(
        action.playerId, 
        action.data.cardId, 
        this.gameState,
        isSandbox,
        sandboxConfig
      );
      
      if (!canInteract) {
        console.warn(`❌ Player ${action.playerId} cannot ${action.type} card ${action.data.cardId}`);
        return this.gameState; // ✅ Reject - return unchanged state
      }
    }
  
    console.log(`🎬 Applying action: ${action.type} from ${action.playerId}`);
    console.log(`🎬 Action data:`, action.data);
  
    const gameAction: CardGameAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
  
    const newState = this.reduceAction(this.gameState, gameAction);
    
    if (newState === this.gameState) {
      console.log(`⚠️ State unchanged after ${action.type}`);
    } else {
      console.log(`✅ State changed after ${action.type}`);
    }
    
    if (newState !== this.gameState) {
      this.gameState = newState;
      this.gameState.actions.push(gameAction);
      this.gameState.currentActionIndex = this.gameState.actions.length - 1;
      this.gameState.updatedAt = new Date();
  
      await this.persist();
      
      this.broadcast({ 
        type: 'state_update', 
        state: this.gameState 
      });
    }
  
    return this.gameState;
  }

  private reduceAction(gameState: CardGameState, action: CardGameAction): CardGameState {
    // NO PERMISSION CHECK HERE - handled in applyAction
    
    switch (action.type) {
      case 'import_deck':
        console.log('📦 Processing import_deck action');
        return DeckImportManager.importDeck(gameState, action);

      case 'shuffle_library':
        console.log('🔀 Processing shuffle_library action');
        return ZoneManager.shuffleLibrary(gameState, action);

      case 'draw_cards':
        console.log('🃏 Processing draw_cards action');
        return ZoneManager.drawCards(gameState, action);

      case 'move_card':
        console.log('🚚 Processing move_card action');
        return ZoneManager.moveCardBetweenZones(gameState, action);
      
      case 'mill_cards':
        console.log('⚰️ Processing mill_cards action');
        return ZoneManager.millCards(gameState, action);
      
      case 'move_card_position':
        console.log('📍 Processing move_card_position action');
        return CardManager.moveCard(gameState, action);

      case 'tap_card':
        console.log('↩️ Processing tap_card action');
        return CardManager.tapCard(gameState, action);
      
      case 'untap_card':
        console.log('↪️ Processing untap_card action');
        return CardManager.untapCard(gameState, action);
      
      case 'flip_card':
        console.log('🔄 Processing flip_card action');
        return CardManager.flipCard(gameState, action);
      
      case 'rotate_card':
        console.log('🔃 Processing rotate_card action');
        return CardManager.rotateCard(gameState, action);
        
      case 'rotate_cards_batch': {
        const { cardIds, rotation } = action.data
        
        const updatedCards = { ...gameState.cards }
        cardIds.forEach(cardId => {
          if (updatedCards[cardId]) {
            updatedCards[cardId] = {
              ...updatedCards[cardId],
              rotation
            }
          }
        })
        
        return {
          ...gameState,
          cards: updatedCards
        }
      }
      
      case 'reset_game':
        console.log('🔄 Processing reset_game action');
        return {
          ...gameState,
          cards: {},
          actions: [],
          currentActionIndex: -1,
          players: gameState.players.map(p => ({
            ...p,
            life: 40,
            zones: {
              library: [],
              hand: [],
              battlefield: [],
              graveyard: [],
              exile: [],
              command: []
            }
          }))
        };

      default:
        console.warn(`Unknown action type: ${(action as any).type}`);
        return gameState;
    }
  }

  /**
   * Fetch and inject card data for sandbox deck imports
   */
  private async injectSandboxCardData(action: any): Promise<void> {
    const starterDecks = await this.ctx.storage.get('starterDecks') as Array<{
      name: string;
      commander: string;
      deckList: string;
    }>;
    
    if (!starterDecks?.length) return;
    
    const deck = starterDecks.find(d => d.name === action.data.deckName);
    if (!deck) return;
    
    // Use the extracted helper - no KV storage, just parsing + fetching
    const { parseDeckAndFetchCards } = await import('@/app/serverActions/deckBuilder/deckActions');
    const result = await parseDeckAndFetchCards(deck.deckList);

    if (result.success) {
      // Convert DeckCard[] to ScryfallCard[] (same as frontend does)
      action.data.cardData = result.cards.map(deckCard => ({
        id: deckCard.scryfallId || deckCard.id,
        name: deckCard.name,
        image_uris: {
          small: deckCard.imageUrl,
          normal: deckCard.imageUrl,
          large: deckCard.imageUrl
        },
        type_line: deckCard.type || '',
        mana_cost: deckCard.manaCost || '',
        colors: deckCard.colors || [],
        color_identity: deckCard.colors || [],
        set: '',
        set_name: '',
        collector_number: '',
        rarity: 'common'
      }));
    } else {
      console.error(`[DO] ❌ Failed to parse/fetch cards:`, result.errors);
    }
  }

  

  // REMOVE the old canPlayerMoveCard method - it's now in SandboxManager
  
  async rewindToAction(actionIndex: number): Promise<CardGameState> {
    if (!this.gameState) {
      await this.getState();
    }
  
    if (!this.gameState) {
      throw new Error('No game state found');
    }
  
    if (actionIndex < 0 || actionIndex >= this.gameState.actions.length) {
      throw new Error('Invalid action index');
    }
  
    console.warn('⚠️ Rewind not yet fully implemented - StateManager needed');
  
    await this.persist();
    // ✅ Use new broadcast method
    this.broadcast({ type: 'state_update', state: this.gameState });
    
    return this.gameState;
  }

  private async persist() {
    if (this.gameState) {
      await this.ctx.storage.put('cardGameState', this.gameState);
    }
  }
}

export default CardGameDO;