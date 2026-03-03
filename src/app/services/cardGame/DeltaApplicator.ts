// @/app/services/cardGame/DeltaApplicator.ts
/**
 * Client-side Delta Applicator
 * Applies delta updates with explicit error handling
 * Falls back to full state if delta application fails
 */

import type { CardGameState, Card } from './CardGameState';
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
          throw new Error(`Unknown delta type: ${(delta as any).type}`);
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

    // Find and remove card from source zone
    const fromZone = fromPlayer.zones[delta.fromZone as keyof typeof fromPlayer.zones];
    if (!fromZone) {
      throw new Error(`Source zone not found: ${delta.fromZone}`);
    }

    const cardIndex = fromZone.findIndex((c: Card) => c.id === delta.cardId);
    if (cardIndex === -1) {
      throw new Error(`Card not found in source zone: ${delta.cardId} in ${delta.fromZone}`);
    }

    const [card] = fromZone.splice(cardIndex, 1);

    // Add card to destination zone
    const toZone = toPlayer.zones[delta.toZone as keyof typeof toPlayer.zones];
    if (!toZone) {
      throw new Error(`Destination zone not found: ${delta.toZone}`);
    }

    if (delta.position !== undefined) {
      toZone.splice(delta.position, 0, card);
    } else {
      toZone.push(card);
    }

    console.log(`✅ Delta applied: Card moved ${card.name} from ${delta.fromZone} to ${delta.toZone}`);
  }

  private applyCardTapped(state: CardGameState, delta: Delta & { type: 'card_tapped' }): void {
    const card = this.findCard(state, delta.cardId);
    if (!card) {
      throw new Error(`Card not found: ${delta.cardId}`);
    }

    card.tapped = delta.tapped;
    console.log(`✅ Delta applied: Card ${delta.tapped ? 'tapped' : 'untapped'} ${card.name}`);
  }

  private applyCardFlipped(state: CardGameState, delta: Delta & { type: 'card_flipped' }): void {
    const card = this.findCard(state, delta.cardId);
    if (!card) {
      throw new Error(`Card not found: ${delta.cardId}`);
    }

    card.faceDown = delta.faceDown;
    console.log(`✅ Delta applied: Card ${delta.faceDown ? 'flipped down' : 'flipped up'} ${card.name}`);
  }

  private applyCountersChanged(state: CardGameState, delta: Delta & { type: 'counters_changed' }): void {
    const card = this.findCard(state, delta.cardId);
    if (!card) {
      throw new Error(`Card not found: ${delta.cardId}`);
    }

    if (!card.counters) card.counters = {};
    card.counters[delta.counterType] = delta.newTotal;
    console.log(`✅ Delta applied: Counters ${card.name} ${delta.counterType} = ${delta.newTotal}`);
  }

  private applyLifeChanged(state: CardGameState, delta: Delta & { type: 'life_changed' }): void {
    const player = state.players.find(p => p.id === delta.playerId);
    if (!player) {
      throw new Error(`Player not found: ${delta.playerId}`);
    }

    player.life = delta.newLife;
    console.log(`✅ Delta applied: Life ${player.name} = ${delta.newLife} (${delta.delta > 0 ? '+' : ''}${delta.delta})`);
  }

  private applyPhaseChanged(state: CardGameState, delta: Delta & { type: 'phase_changed' }): void {
    state.currentPhase = delta.phase;
    state.activePlayerId = delta.activePlayerId;
    console.log(`✅ Delta applied: Phase ${delta.phase}`);
  }

  private applyTurnChanged(state: CardGameState, delta: Delta & { type: 'turn_changed' }): void {
    state.turnNumber = delta.turnNumber;
    state.activePlayerId = delta.activePlayerId;
    console.log(`✅ Delta applied: Turn ${delta.turnNumber}`);
  }

  /**
   * Find a card anywhere in the game state
   */
  private findCard(state: CardGameState, cardId: string): Card | undefined {
    for (const player of state.players) {
      for (const zone of Object.values(player.zones)) {
        const card = zone.find((c: Card) => c.id === cardId);
        if (card) return card;
      }
    }
    return undefined;
  }
}
