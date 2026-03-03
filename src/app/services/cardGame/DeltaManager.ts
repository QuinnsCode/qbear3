// @/app/services/cardGame/DeltaManager.ts
/**
 * Delta Update Manager - Generates minimal delta messages
 * Used alongside full state for testing and gradual rollout
 */

import type { CardGameState, CardGameAction, Card } from './CardGameState';

export type DeltaType =
  | 'card_moved'
  | 'card_tapped'
  | 'card_flipped'
  | 'counters_changed'
  | 'life_changed'
  | 'phase_changed'
  | 'turn_changed'
  | 'player_joined'
  | 'token_created';

export interface BaseDelta {
  type: DeltaType;
  timestamp: number;
  actionType: string; // Original action type for debugging
}

export interface CardMovedDelta extends BaseDelta {
  type: 'card_moved';
  cardId: string;
  fromZone: string;
  toZone: string;
  fromPlayerId: string;
  toPlayerId: string;
  position?: number;
}

export interface CardTappedDelta extends BaseDelta {
  type: 'card_tapped';
  cardId: string;
  tapped: boolean;
  playerId: string;
}

export interface CardFlippedDelta extends BaseDelta {
  type: 'card_flipped';
  cardId: string;
  faceDown: boolean;
  playerId: string;
}

export interface CountersChangedDelta extends BaseDelta {
  type: 'counters_changed';
  cardId: string;
  counterType: string;
  delta: number;
  newTotal: number;
  playerId: string;
}

export interface LifeChangedDelta extends BaseDelta {
  type: 'life_changed';
  playerId: string;
  delta: number;
  newLife: number;
}

export interface PhaseChangedDelta extends BaseDelta {
  type: 'phase_changed';
  phase: string;
  activePlayerId: string;
}

export interface TurnChangedDelta extends BaseDelta {
  type: 'turn_changed';
  turnNumber: number;
  activePlayerId: string;
}

export interface PlayerJoinedDelta extends BaseDelta {
  type: 'player_joined';
  playerId: string;
  playerName: string;
}

export interface TokenCreatedDelta extends BaseDelta {
  type: 'token_created';
  tokenId: string;
  playerId: string;
  zone: string;
}

export type Delta =
  | CardMovedDelta
  | CardTappedDelta
  | CardFlippedDelta
  | CountersChangedDelta
  | LifeChangedDelta
  | PhaseChangedDelta
  | TurnChangedDelta
  | PlayerJoinedDelta
  | TokenCreatedDelta;

export class DeltaManager {
  /**
   * Generate delta from a CardGameAction
   * Returns null if no delta can be generated for this action
   */
  generateDeltaFromAction(action: CardGameAction, state: CardGameState): Delta | null {
    const timestamp = Date.now();

    try {
      switch (action.type) {
        case 'MOVE_CARD': {
          return {
            type: 'card_moved',
            cardId: action.payload.cardId,
            fromZone: action.payload.fromZone,
            toZone: action.payload.toZone,
            fromPlayerId: action.payload.fromPlayerId || action.playerId,
            toPlayerId: action.payload.toPlayerId || action.playerId,
            position: action.payload.position,
            timestamp,
            actionType: action.type
          };
        }

        case 'TAP_CARD':
        case 'UNTAP_CARD': {
          return {
            type: 'card_tapped',
            cardId: action.payload.cardId,
            tapped: action.type === 'TAP_CARD',
            playerId: action.playerId,
            timestamp,
            actionType: action.type
          };
        }

        case 'FLIP_CARD': {
          return {
            type: 'card_flipped',
            cardId: action.payload.cardId,
            faceDown: action.payload.faceDown,
            playerId: action.playerId,
            timestamp,
            actionType: action.type
          };
        }

        case 'ADD_COUNTER':
        case 'REMOVE_COUNTER': {
          const card = this.findCard(state, action.payload.cardId);
          const counterType = action.payload.counterType;
          const delta = action.type === 'ADD_COUNTER' ? 1 : -1;
          const newTotal = (card?.counters?.[counterType] || 0) + delta;

          return {
            type: 'counters_changed',
            cardId: action.payload.cardId,
            counterType,
            delta,
            newTotal,
            playerId: action.playerId,
            timestamp,
            actionType: action.type
          };
        }

        case 'CHANGE_LIFE': {
          const player = state.players.find(p => p.id === action.playerId);
          if (player) {
            return {
              type: 'life_changed',
              playerId: action.playerId,
              delta: action.payload.amount,
              newLife: player.life + action.payload.amount,
              timestamp,
              actionType: action.type
            };
          }
          return null;
        }

        case 'CHANGE_PHASE': {
          return {
            type: 'phase_changed',
            phase: action.payload.phase,
            activePlayerId: state.activePlayerId,
            timestamp,
            actionType: action.type
          };
        }

        case 'NEXT_TURN': {
          return {
            type: 'turn_changed',
            turnNumber: state.turnNumber + 1,
            activePlayerId: action.payload.nextPlayerId,
            timestamp,
            actionType: action.type
          };
        }

        case 'CREATE_TOKEN': {
          if (action.payload.token) {
            return {
              type: 'token_created',
              tokenId: action.payload.token.id,
              playerId: action.playerId,
              zone: action.payload.zone || 'battlefield',
              timestamp,
              actionType: action.type
            };
          }
          return null;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error('Error generating delta:', error);
      return null;
    }
  }

  /**
   * Generate delta for player joining
   */
  generatePlayerJoinedDelta(playerId: string, playerName: string): PlayerJoinedDelta {
    return {
      type: 'player_joined',
      playerId,
      playerName,
      timestamp: Date.now(),
      actionType: 'PLAYER_JOIN'
    };
  }

  /**
   * Find a card in the game state
   */
  private findCard(state: CardGameState, cardId: string): Card | undefined {
    for (const player of state.players) {
      for (const zone of Object.values(player.zones)) {
        const card = zone.find(c => c.id === cardId);
        if (card) return card;
      }
    }
    return undefined;
  }
}
