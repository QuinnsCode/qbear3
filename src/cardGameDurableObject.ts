// src/cardGameDurableObject.ts
/**
 * MTG COMMANDER VIRTUAL TABLETOP - Durable Object Game State Manager
 */
import { WebSocketManager } from '@/app/services/cardGame/WebSocketManager';
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

const CURSOR_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

export class CardGameDO extends DurableObject {
  
  private gameState: CardGameState | null = null;
  private wsManager: WebSocketManager;
  private gameId: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.wsManager = new WebSocketManager(() => this.gameState);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url); 
    const method = request.method;
  
    try {
      // Handle WebSocket upgrades
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.wsManager.handleUpgrade(request);
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
    
      // Handle DELETE - wipe storage
      if (method === 'DELETE') {
        console.log('🗑️ DELETE request received - wiping Card Game storage');
        
        try {
          this.wsManager.broadcast({ 
            type: 'game_deleted', 
            message: 'This game has been deleted' 
          });
          
          this.wsManager.closeAll();
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
      if (method === 'GET') {
        const state = await this.getState();
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
    
    this.wsManager.broadcast({ 
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
    const existingPlayer = this.gameState.players.find(p => p.id === data.playerId);
    if (existingPlayer) {
      console.log(`Player ${data.playerName} already in game`);
      
      // ✅ CHECK: Does this player have a deck?
      const isSandbox = await this.ctx.storage.get('isSandbox');
      const hasDeck = existingPlayer.deckList !== undefined;
      
      if (isSandbox && !hasDeck) {
        console.log(`🔄 Existing player ${data.playerName} has no deck - assigning starter deck...`);
        
        try {
          const starterDeck = await getStarterDeck();
          
          const cardData = starterDeck.cards.map(card => ({
            id: card.scryfallId || card.id,
            name: card.name,
            image_uris: {
              small: card.imageUrl,
              normal: card.imageUrl,
              large: card.imageUrl,
            },
            type_line: card.type || '',
            mana_cost: card.manaCost || '',
            colors: card.colors || [],
            color_identity: card.colors || [],
            set: '',
            set_name: '',
            collector_number: '',
            rarity: 'common'
          }));
          
          await this.applyAction({
            type: 'import_deck',
            playerId: data.playerId,
            data: {
              deckListText: '',
              deckName: starterDeck.name,
              cardData,
            }
          });
          
          console.log(`✅ Retroactively assigned deck to ${data.playerName}`);
          
        } catch (error) {
          console.error('❌ Failed to assign deck to existing player:', error);
        }
      }
      
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
    this.wsManager.broadcast({ 
      type: 'player_joined', 
      player: newPlayer 
    });
  
    // AUTO-ASSIGN DECK IN SANDBOX MODE (NEW PLAYERS)
    if (isSandbox) {
      console.log(`🎴 Auto-assigning Hei Bai starter deck to ${data.playerName}`);
      
      try {
        const starterDeck = await getStarterDeck();

        console.log(`📦 Loaded starter deck: ${starterDeck.name} (${starterDeck.totalCards} cards)`);
        
        const cardData = starterDeck.cards.map(card => ({
          id: card.scryfallId || card.id,
          name: card.name,
          image_uris: {
            small: card.imageUrl,
            normal: card.imageUrl,
            large: card.imageUrl,
          },
          type_line: card.type || '',
          mana_cost: card.manaCost || '',
          colors: card.colors || [],
          color_identity: card.colors || [],
          set: '',
          set_name: '',
          collector_number: '',
          rarity: 'common'
        }));
        
        await this.applyAction({
          type: 'import_deck',
          playerId: data.playerId,
          data: {
            deckListText: '',
            deckName: starterDeck.name,
            cardData,
          }
        });
        
        console.log(`✅ Auto-imported ${starterDeck.name} for ${data.playerName}`);
        
      } catch (error) {
        console.error('❌ Failed to auto-import starter deck:', error);
      }
    }
  
    return this.gameState;
  }

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
      
      this.wsManager.broadcast({ 
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
    this.wsManager.broadcast({ type: 'state_update', state: this.gameState });
    
    return this.gameState;
  }

  private async persist() {
    if (this.gameState) {
      await this.ctx.storage.put('cardGameState', this.gameState);
    }
  }
}

export default CardGameDO;