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
import { TokenManager } from '@/app/services/cardGame/managers/TokenManager';
import { getStarterDeck } from './app/serverActions/cardGame/starterDecks';
import { WebSocketHelper } from './app/services/cardGame/WebSocketHelper';
import { env } from "cloudflare:workers";

// ✅ Storage-only state (actions stored separately)
type StoredGameState = Omit<CardGameState, 'actions' | 'currentActionIndex'>;

const CURSOR_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

// ✅ Cleanup configuration
const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;   // Run cleanup every 24 hours

export class CardGameDO extends DurableObject {
  private gameState: CardGameState | null = null;
  private gameId: string | null = null;

  //ws helper class for logic
  private wsHelper: WebSocketHelper;

  private lastCursorBroadcast: Map<string, number> = new Map();
  private spectatorCount = 0;

  // ✅ Track player activity for cleanup
  private playerActivity: Map<string, number> = new Map();

  private starterDecks: any[] | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.wsHelper = new WebSocketHelper();
  
    this.ctx.blockConcurrencyWhile(async () => {
      const initialized = await this.ctx.storage.get('initialized');
      if (!initialized) {
        await this.ctx.storage.put('initialized', true);
        await this.ctx.storage.put('createdAt', Date.now());
      }
      
      const isSandbox = await this.ctx.storage.get('isSandbox');
      if (isSandbox) {
        // ✅ Load starter decks into memory
        this.starterDecks = await this.ctx.storage.get('starterDecks') as any[];
        
        const hasAlarm = await this.ctx.storage.get('cleanupScheduled');
        if (!hasAlarm) {
          await this.ctx.storage.setAlarm(Date.now() + CLEANUP_INTERVAL);
          await this.ctx.storage.put('cleanupScheduled', true);
          console.log('⏰ Scheduled first cleanup alarm for sandbox game');
        }
      }
      
      const storedActivity = await this.ctx.storage.get<Record<string, number>>('playerActivity');
      if (storedActivity) {
        this.playerActivity = new Map(Object.entries(storedActivity));
      }
    });
  }

  /**
   * ✅ ALARM HANDLER - Called automatically every 24 hours
   * Removes inactive players from sandbox games
   */
  async alarm(): Promise<void> {
    const isSandbox = await this.ctx.storage.get('isSandbox');
    
    if (!isSandbox) {
      console.log('⏰ Alarm fired but not sandbox - skipping cleanup');
      return;
    }
    
    console.log('🧹 Running sandbox cleanup...');
    
    const state = await this.getState();
    const now = Date.now();
    let removedCount = 0;
    
    // Check each player's last activity
    const activePlayers = state.players.filter(player => {
      const lastActivity = this.playerActivity.get(player.id) || 0;
      const timeSinceActivity = now - lastActivity;
      
      if (timeSinceActivity > INACTIVE_THRESHOLD) {
        console.log(`🗑️ Removing inactive player: ${player.name} (inactive for ${Math.round(timeSinceActivity / 1000 / 60 / 60)} hours)`);
        removedCount++;
        return false; // Remove this player
      }
      
      return true; // Keep this player
    });
    
    if (removedCount > 0) {
      // Update game state
      this.gameState = {
        ...state,
        players: activePlayers,
        updatedAt: new Date()
      };
      
      // Clean up their cards from the battlefield
      const activePlayerIds = new Set(activePlayers.map(p => p.id));
      const updatedCards: Record<string, Card> = {};
      
      for (const [cardId, card] of Object.entries(state.cards)) {
        if (activePlayerIds.has(card.ownerId)) {
          updatedCards[cardId] = card;
        }
      }
      
      this.gameState.cards = updatedCards;
      
      // Persist changes
      this.persist();
      
      // Clean up activity tracking
      for (const player of state.players) {
        if (!activePlayers.find(p => p.id === player.id)) {
          this.playerActivity.delete(player.id);
        }
      }
      await this.ctx.storage.put('playerActivity', Object.fromEntries(this.playerActivity));

      // Broadcast update
      this.broadcast({
        type: 'players_cleaned_up',
        state: this.gameState,
        removedCount
      });
      
      console.log(`✅ Cleanup complete: removed ${removedCount} inactive player(s)`);
    } else {
      console.log('✅ Cleanup complete: all players active');
    }
    
    // Schedule next cleanup
    await this.ctx.storage.setAlarm(Date.now() + CLEANUP_INTERVAL);
    console.log('⏰ Scheduled next cleanup in 24 hours');
  }

  /**
   * ✅ Update player activity timestamp on ANY action
   */
  private updatePlayerActivity(playerId: string): void {
    this.playerActivity.set(playerId, Date.now());
    // Persist activity (no await - output gate handles it)
    this.ctx.storage.put('playerActivity', Object.fromEntries(this.playerActivity));
  }

  /**
   * Initialize this DO as a sandbox game with pre-loaded starter decks
   * Called once when creating/accessing a sandbox game
   * This is an RPC method callable from the Worker
   */
  async initializeSandbox(config: { 
    starterDecks: any[] 
  }): Promise<{ success: boolean; alreadyInitialized?: boolean }> {
    const alreadyInit = await this.ctx.storage.get('isSandbox');
    
    if (alreadyInit) {
      console.log('✅ Sandbox already initialized, skipping');
      return { success: true, alreadyInitialized: true };
    }
    
    console.log('🎮 Initializing sandbox with', config.starterDecks.length, 'starter decks');
    
    // ✅ Import here instead of at module level
    if (!config.starterDecks || config.starterDecks.length === 0) {
      const { EDH_SANDBOX_STARTER_DECK_DATA } = await import('@/app/components/CardGame/Sandbox/starterDeckData');
      config.starterDecks = EDH_SANDBOX_STARTER_DECK_DATA;
    }
    
    this.ctx.storage.put('isSandbox', true);
    this.ctx.storage.put('starterDecks', config.starterDecks);
    this.ctx.storage.put('sandboxConfig', {
      maxPlayers: 256,
      sharedBattlefield: true,
    });
    
    // ✅ Schedule cleanup alarm
    await this.ctx.storage.setAlarm(Date.now() + CLEANUP_INTERVAL);
    await this.ctx.storage.put('cleanupScheduled', true);
    console.log('⏰ Scheduled cleanup alarm');
    
    console.log('✅ Sandbox initialized successfully');
    return { success: true, alreadyInitialized: false };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url); 
    const method = request.method;
  
    try {
      // ✅ Handle WebSocket upgrades directly in the DO
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocketUpgrade(request);
      }

      // Handle DELETE - wipe storage
      if (method === 'DELETE') {
        console.log('🗑️ DELETE request received - wiping Card Game storage');
        
        try {
          // ✅ Cancel cleanup alarm
          await this.ctx.storage.deleteAlarm();
          
          // ✅ Use new broadcast method
          this.broadcast({ 
            type: 'game_deleted', 
            message: 'This game has been deleted' 
          });
          
          // ✅ Use new close method
          this.closeAllWebSockets();
          await this.ctx.storage.deleteAll();
          this.gameState = null;
          this.playerActivity.clear();
          
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
      if (method === 'GET') {
        const state = await this.getState();
        return Response.json(state);
      }

      if (method === 'POST' && url.pathname === '/init-sandbox') {
        const data = await request.json() as any;
        const result = await this.initializeSandbox(data);
        return Response.json(result);
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
          // ✅ Update activity on join
          this.updatePlayerActivity(requestData.playerId);
          return Response.json(joinResult);
        }
        
        // GAME ACTION REQUEST
        if (requestData.type) {
          console.log(`🎬 Action request detected: ${requestData.type}`);
          try {
            const result = await this.applyAction(requestData);
            // ✅ Update activity on any action
            if (requestData.playerId) {
              this.updatePlayerActivity(requestData.playerId);
            }
            return Response.json(result);
          } catch (error) {
            console.error('❌ Action failed:', error);
            return Response.json(
              { error: error instanceof Error ? error.message : 'Unknown error' },
              { status: 500 }
            );
          }
        }
        
        // Unknown POST format
        console.error('❌ Unknown POST request format:', requestData);
        return new Response('Invalid POST data - must have either (playerId + playerName) or (type + playerId + data)', { status: 400 });
      }
      
      // PUT - rewind to action (only for non-sandbox)
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
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    
    // ✅ EXTRACT IDENTITY FROM REQUEST HEADERS (set by Worker middleware)
    const playerId = request.headers.get('X-Auth-User-Id') || `guest-${crypto.randomUUID()}`;
    const playerName = request.headers.get('X-Auth-User-Name') || 'Guest';
    const isSpectator = !request.headers.has('X-Auth-User-Id');
    
    // ✅ ADD TAGS - This is the key change
    this.ctx.acceptWebSocket(server, [
      'player',                    // Tag[0]: type
      playerId,                    // Tag[1]: unique ID
      playerName,                  // Tag[2]: display name
      isSpectator ? '1' : '0'      // Tag[3]: spectator flag
    ]);
    
    // Rest stays the same
    if (isSpectator) {
      this.spectatorCount++;
    }

    const state = await this.getState();
    server.send(JSON.stringify({ type: 'state_update', state }));

    return new Response(null, { status: 101, webSocket: client });
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
    
    // ✅ GET IDENTITY FROM PLATFORM, NOT CLIENT
    const tags = this.ctx.getTags(ws);
    const playerId = tags[1];
    const playerName = tags[2];
    const isSpectator = tags[3] === '1';
    
    try {
      const data = JSON.parse(messageString);
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }
  
      // ✅ USE PLATFORM'S PLAYERID, NOT data.playerId
      if (data.type === 'cursor_move') {
        if (isSpectator) return; // Spectators don't get cursors
        
        this.updatePlayerActivity(playerId); // ✅ Platform's ID
        
        const result = this.wsHelper.handleCursorUpdate(playerId, data.x, data.y);
        if (result.shouldBroadcast) {
          this.broadcastExcept(result.message, playerId);
        }
        return;
      }
      
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // ✅ GET IDENTITY FROM TAGS
    const tags = this.ctx.getTags(ws);
    const playerId = tags[1];
    const playerName = tags[2];
    const isSpectator = tags[3] === '1';
    
    if (isSpectator) {
      this.spectatorCount--;
      console.log(`👁️ Spectator ${playerName} disconnected (${this.spectatorCount} remaining)`);
    } else {
      console.log(`🔌 Player ${playerName} (${playerId}) disconnected`);
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('❌ WebSocket error:', error);
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
        if (value instanceof Date) return value.toISOString();
        if (value === undefined) return null;
        return value;
      });
      
      const sockets = this.ctx.getWebSockets();
      
      for (const ws of sockets) {
        // ✅ GET PLAYER ID FROM TAGS INSTEAD OF MAP
        const tags = this.ctx.getTags(ws);
        const wsPlayerId = tags[1];
        
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

  /**
   * ✅ UPDATED: Load state and handle migration from old format
   */
  async loadState(): Promise<void> {
    const stored = await this.ctx.storage.get<CardGameState>('cardGameState');
    
    if (stored) {
      // ✅ MIGRATION: If old format has actions, move them to separate storage
      if ('actions' in stored && Array.isArray(stored.actions)) {
        console.log('🔄 Migrating old format: moving actions to separate storage');
        
        const isSandbox = await this.ctx.storage.get('isSandbox');
        
        // Only store actions for non-sandbox games
        if (!isSandbox && stored.actions.length > 0) {
          await this.ctx.storage.put('gameActions', stored.actions);
          console.log(`✅ Migrated ${stored.actions.length} actions to separate storage`);
        } else {
          console.log(`✅ Sandbox game - discarded ${stored.actions.length} actions`);
        }
        
        // Remove actions from state object
        const { actions, currentActionIndex, ...cleanState } = stored as any;
        
        // Store cleaned state
        await this.ctx.storage.put('cardGameState', cleanState);
        
        this.gameState = {
          ...cleanState,
          actions: [], // Empty for in-memory compatibility
          currentActionIndex: -1
        };
      } else {
        // ✅ Already clean format
        this.gameState = {
          ...stored,
          actions: [], // Always empty in memory
          currentActionIndex: -1
        };
      }

      if (!this.gameState) throw Error('bad game state in cardgamedurableobject')
      
      // Ensure Dates are proper Date objects
      this.gameState.createdAt = new Date(this.gameState.createdAt);
      this.gameState.updatedAt = new Date(this.gameState.updatedAt);
    }
  }

  async createDefaultGame(gameId?: string): Promise<CardGameState> {
    const id = gameId || this.ctx.id.toString();
    
    this.gameState = {
      id,
      status: 'active',
      players: [],
      cards: {},
      actions: [], // Empty in memory
      currentActionIndex: -1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  
    this.persist();
    return this.gameState;
  }

  async restartGame(): Promise<CardGameState> {
    const gameId = this.ctx.id.toString()
    
    this.gameState = {
      id: gameId,
      status: 'active',
      players: [],
      cards: {},
      actions: [], // Empty in memory
      currentActionIndex: -1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  
    // ✅ Clear activity tracking on restart
    this.playerActivity.clear();
    await this.ctx.storage.put('playerActivity', {});
    
    // ✅ Clear actions on restart
    const isSandbox = await this.ctx.storage.get('isSandbox');
    if (!isSandbox) {
      await this.ctx.storage.delete('gameActions');
    }
  
    this.persist();

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
      // ✅ AUTO-MIGRATE: Add gameStateInfo if missing
      if (!existingPlayer.hasOwnProperty('gameStateInfo')) {
        existingPlayer.gameStateInfo = undefined;
        
        // ✅ Null check before persist
        if (this.gameState) {
          this.persist();
        }
      }
      
      console.log(`✅ Player ${data.playerName} already in game`);
      console.log(`📋 Player deck status:`, {
        hasDeck: !!existingPlayer.deckList,
        deckName: existingPlayer.deckList?.deckName,
        libraryCount: existingPlayer.zones.library.length
      });
      
      // ✅ Null check before broadcast and return
      if (!this.gameState) {
        throw new Error('Game state is null');
      }

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
  
    this.persist();

    console.log(`✅ Player ${data.playerName} joined as ${assignedPosition} (${cursorColor})`);

    // ✅ AUTO-ASSIGN DECK IN SANDBOX MODE (NEW PLAYERS) - BEFORE broadcast and return!
    if (isSandbox) {
      await this.assignSandboxDeck(data.playerId, this.gameState.players.length - 1);
    }

    this.broadcast({
      type: 'player_joined',
      player: newPlayer
    });

    return this.gameState;
  }

  // Add this method to the class
  private validateSandboxDecks(decks: any): boolean {
    if (!Array.isArray(decks) || decks.length === 0) {
      console.warn('⚠️ Deck validation failed: Not an array or empty');
      return false;
    }
    
    // Check first deck has required structure
    const deck = decks[0];
    const isValid = !!(
      deck?.name &&
      deck?.deckList &&
      Array.isArray(deck?.cards) &&
      deck.cards.length > 0 &&
      deck.cards[0]?.id &&
      deck.cards[0]?.name
    );
    
    if (!isValid) {
      console.warn('⚠️ Deck validation failed:', {
        hasName: !!deck?.name,
        hasDeckList: !!deck?.deckList,
        hasCards: Array.isArray(deck?.cards),
        cardCount: deck?.cards?.length || 0,
        firstCardValid: !!(deck?.cards?.[0]?.id && deck?.cards?.[0]?.name)
      });
    }
    
    return isValid;
  }

  private async assignSandboxDeck(playerId: string, playerIndex: number): Promise<void> {
    try {
      let starterDecks = await this.ctx.storage.get('starterDecks') as any[];
      
      if (!this.validateSandboxDecks(starterDecks)) {
        console.warn('⚠️ Corrupted deck data detected - self-healing...');
        
        const { EDH_SANDBOX_STARTER_DECK_DATA } = await import('@/app/components/CardGame/Sandbox/starterDeckData');
        
        await this.ctx.storage.put('starterDecks', EDH_SANDBOX_STARTER_DECK_DATA);
        starterDecks = EDH_SANDBOX_STARTER_DECK_DATA;
        
        console.log('✅ Self-healed:', starterDecks.length, 'valid decks');
      }
      
      const assignedDeck = starterDecks[playerIndex % starterDecks.length];
      
      console.log(`🎴 Assigning "${assignedDeck.name}" to player ${playerId}`);
      
      // Import deck
      await this.applyAction({
        type: 'import_deck',
        playerId: playerId,
        data: {
          deckListText: assignedDeck.deckList,
          deckName: assignedDeck.name,
          cardData: assignedDeck.cards
        }
      });
      
      // Auto-shuffle library
      await this.applyAction({
        type: 'shuffle_library',
        playerId: playerId,
        data: {}
      });
      
      // Auto-draw 7 cards
      await this.applyAction({
        type: 'draw_cards',
        playerId: playerId,
        data: { count: 7 }
      });
      
      console.log(`✅ Assigned "${assignedDeck.name}", shuffled, drew 7`);
      
    } catch (error) {
      console.error('❌ Failed to assign sandbox deck:', error);
      throw error;
    }
  }

  /**
   * ✅ UPDATED: Store actions separately, only for non-sandbox games
   */
  async applyAction(action: Omit<CardGameAction, 'id' | 'timestamp'>): Promise<CardGameState> {
    if (!this.gameState) {
      await this.getState();
    }
  
    if (!this.gameState) {
      throw new Error('No game state found');
    }
  
    // ✅ CHECK PERMISSIONS BEFORE PROCESSING (for sandbox shared battlefield)
    const actionsRequiringPermission = [
      'move_card',
      'move_card_position',
      'tap_card',
      'untap_card',
      'flip_card',
      'rotate_card',
    ];
    
    if (actionsRequiringPermission.includes(action.type)) {
      const isSandbox = await this.ctx.storage.get('isSandbox') as boolean;
      const sandboxConfig = await this.ctx.storage.get('sandboxConfig');
      
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
      this.gameState.updatedAt = new Date();

      // ✅ ONLY STORE ACTIONS FOR NON-SANDBOX GAMES
      const isSandbox = await this.ctx.storage.get('isSandbox');
      if (!isSandbox) {
        // Append action to separate storage
        const existingActions = await this.ctx.storage.get<CardGameAction[]>('gameActions') || [];
        existingActions.push(gameAction);
        this.ctx.storage.put('gameActions', existingActions);
        console.log(`📝 Action stored (total: ${existingActions.length})`);
      }

      this.persist();

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

      case 'import_deck_direct':
        console.log('📦 Processing import_deck_direct action (no text parsing)');
        return DeckImportManager.importDeckDirect(gameState, action);

      case 'import_sandbox_deck':
        console.log('📦 Processing import_sandbox_deck action');
        
        if (!this.starterDecks) {
          console.error('❌ Starter decks not loaded');
          return gameState;
        }
        
        return DeckImportManager.importSandboxDeck(gameState, action, this.starterDecks);
  
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

      case 'update_life':
        console.log('💚 Processing update_life action');
        return {
          ...gameState,
          players: gameState.players.map(p =>
            p.id === action.playerId
              ? { ...p, life: action.data.life }
              : p
          )
        };
      
        case 'update_game_state_info':
          console.log('📊 Processing update_game_state_info action');
          const targetPlayer = gameState.players.find(p => p.id === action.playerId);
          if (!targetPlayer) {
            console.warn(`Player ${action.playerId} not found`);
            return gameState;
          }
          
          return {
            ...gameState,
            players: gameState.players.map(p =>
              p.id === action.playerId
                ? { ...p, gameStateInfo: action.data.gameStateInfo }
                : p
            )
          };

      case 'reset_game':
        console.log('🔄 Processing reset_game action');
        return {
          ...gameState,
          cards: {},
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

      case 'create_token':
        console.log('🪙 Processing create_token action');
        return TokenManager.createToken(gameState, action);

      default:
        console.warn(`Unknown action type: ${(action as any).type}`);
        return gameState;
    }
  }

  /**
   * ✅ UPDATED: Rewind only works for non-sandbox games with stored actions
   */
  async rewindToAction(actionIndex: number): Promise<CardGameState> {
    if (!this.gameState) {
      await this.getState();
    }
  
    if (!this.gameState) {
      throw new Error('No game state found');
    }
    
    // ✅ Check if sandbox
    const isSandbox = await this.ctx.storage.get('isSandbox');
    if (isSandbox) {
      throw new Error('Rewind not available for sandbox games');
    }
    
    // ✅ Load actions from storage
    const actions = await this.ctx.storage.get<CardGameAction[]>('gameActions') || [];
    
    if (actionIndex < 0 || actionIndex >= actions.length) {
      throw new Error('Invalid action index');
    }
  
    console.warn('⚠️ Rewind not yet fully implemented - StateManager needed');
    // TODO: Implement full rewind logic by replaying actions 0..actionIndex

    this.persist();
    this.broadcast({ type: 'state_update', state: this.gameState });

    return this.gameState;
  }

  /**
   * ✅ UPDATED: Never store actions field, only store StoredGameState
   */
  private persist() {
    if (this.gameState) {
      // ✅ Remove actions and currentActionIndex before persisting
      const { actions, currentActionIndex, ...storedState } = this.gameState;
      this.ctx.storage.put('cardGameState', storedState as StoredGameState);
    }
  }
}

export default CardGameDO;