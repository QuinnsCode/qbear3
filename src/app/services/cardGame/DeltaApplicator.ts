// @/app/services/cardGame/DeltaApplicator.ts
/**
 * Client-side Delta Applicator
 * Applies delta updates with explicit error handling
 * Falls back to full state if delta application fails
 */

import type { CardGameState, Card, MTGPlayer } from './CardGameState';
import type { Delta } from './DeltaManager';

export class DeltaApplicator {
  /**
   * Apply a delta update to the current game state
   * Throws error with details if delta application fails
   */
  applyDelta(currentState: CardGameState, delta: Delta): CardGameState {
    // Create a new state object
    const newState = JSON.parse(JSON.stringify(currentState)) as CardGameState;
    newState.updatedAt = new Date(delta.timestamp);

    try {
      switch (delta.type) {
        case 'card_moved':
          this.applyCardMoved(newState, delta);
          break;

        case 'card_tapped':
          this.applyCardTapped(newState, delta);
          break;

        case 'card_flipped':
          this.applyCardFlipped(newState, delta);
          break;

        case 'counters_changed':
          this.applyCountersChanged(newState, delta);
          break;

        case 'life_changed':
          this.applyLifeChanged(newState, delta);
          break;

        case 'phase_changed':
          this.applyPhaseChanged(newState, delta);
          break;

        case 'turn_changed':
          this.applyTurnChanged(newState, delta);
          break;

        case 'player_joined':
          // Player join is handled via full state update
          console.log('Player joined delta received, using full state');
          break;

        case 'token_created':
          // Token creation is handled via full state update
          console.log('Token created delta received, using full state');
          break;

        default:
          return assertNever(delta);
      }

      return newState;
    } catch (error) {
      const errorMsg = `Delta application failed for ${delta.type} (action: ${delta.actionType}): ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ ' + errorMsg);
      console.error('Delta that failed:', delta);
      throw new Error(errorMsg);
    }
  }

  private applyCardMoved(state: CardGameState, delta: Delta & { type: 'card_moved' }): void {
    const fromPlayer = state.players.find(p => p.id === delta.fromPlayerId);
    const toPlayer = state.players.find(p => p.id === delta.toPlayerId);

    if (!fromPlayer) {
      throw new Error(`Source player not found: ${delta.fromPlayerId}`);
    }
    if (!toPlayer) {
      throw new Error(`Destination player not found: ${delta.toPlayerId}`);
    }

    const fromZone = zoneOf(fromPlayer, delta.fromZone);
    if (!fromZone) {
      throw new Error(`Source zone not found: ${delta.fromZone}`);
    }
    const toZone = zoneOf(toPlayer, delta.toZone);
    if (!toZone) {
      throw new Error(`Destination zone not found: ${delta.toZone}`);
    }

    const cardIndex = fromZone.indexOf(delta.cardId);
    if (cardIndex === -1) {
      throw new Error(`Card not found in source zone: ${delta.cardId} in ${delta.fromZone}`);
    }
    fromZone.splice(cardIndex, 1);

    if (delta.position !== undefined) {
      toZone.splice(delta.position, 0, delta.cardId);
    } else {
      toZone.push(delta.cardId);
    }

    console.log(`✅ Delta applied: Card moved ${delta.cardId} from ${delta.fromZone} to ${delta.toZone}`);
  }

  private applyCardTapped(state: CardGameState, delta: Delta & { type: 'card_tapped' }): void {
    const card = this.findCard(state, delta.cardId);
    card.rotation = delta.tapped ? 90 : 0;
    console.log(`✅ Delta applied: Card ${delta.tapped ? 'tapped' : 'untapped'} ${delta.cardId}`);
  }

  private applyCardFlipped(state: CardGameState, delta: Delta & { type: 'card_flipped' }): void {
    const card = this.findCard(state, delta.cardId);
    card.isFaceUp = !delta.faceDown;
    console.log(`✅ Delta applied: Card ${delta.faceDown ? 'flipped down' : 'flipped up'} ${delta.cardId}`);
  }

  private applyCountersChanged(state: CardGameState, delta: Delta & { type: 'counters_changed' }): void {
    const card = this.findCard(state, delta.cardId);
    if (!card.counters) card.counters = {};
    card.counters[delta.counterType] = delta.newTotal;
    console.log(`✅ Delta applied: Counters ${delta.cardId} ${delta.counterType} = ${delta.newTotal}`);
  }

  private applyLifeChanged(state: CardGameState, delta: Delta & { type: 'life_changed' }): void {
    const player = state.players.find(p => p.id === delta.playerId);
    if (!player) {
      throw new Error(`Player not found: ${delta.playerId}`);
    }

    player.life = delta.newLife;
    console.log(`✅ Delta applied: Life ${player.name} = ${delta.newLife} (${delta.delta > 0 ? '+' : ''}${delta.delta})`);
  }

  private applyPhaseChanged(_state: CardGameState, delta: Delta & { type: 'phase_changed' }): void {
    // Game state tracks no phase; the caller falls back to the full state.
    throw new Error(`Phase changes are not tracked in game state: ${delta.phase}`);
  }

  private applyTurnChanged(_state: CardGameState, delta: Delta & { type: 'turn_changed' }): void {
    // Game state tracks no turn; the caller falls back to the full state.
    throw new Error(`Turn changes are not tracked in game state: ${delta.turnNumber}`);
  }

  private findCard(state: CardGameState, cardId: string): Card {
    const card = state.cards[cardId];
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }
    return card;
  }
}

function zoneOf(player: MTGPlayer, zone: string): string[] | undefined {
  switch (zone) {
    case 'library': return player.zones.library;
    case 'hand': return player.zones.hand;
    case 'battlefield': return player.zones.battlefield;
    case 'graveyard': return player.zones.graveyard;
    case 'exile': return player.zones.exile;
    case 'command': return player.zones.command;
    case 'sideboard': return player.zones.sideboard;
    default: return undefined;
  }
}

function assertNever(delta: never): never {
  throw new Error(`Unknown delta type: ${JSON.stringify(delta)}`);
}
