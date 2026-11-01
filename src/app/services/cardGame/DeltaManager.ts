// @/app/services/cardGame/DeltaManager.ts
/**
 * Delta Update Manager - Generates minimal delta messages
 * Used alongside full state for testing and gradual rollout
 */

import type { CardGameState, CardGameAction } from './CardGameState';

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
   * Generate delta from a CardGameAction.
   * Real actions (snake_case types such as tap_card) do not produce deltas yet,
   * so clients always take the full state. Returns null.
   */
  generateDeltaFromAction(_action: CardGameAction, _state: CardGameState): Delta | null {
    return null;
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
}
