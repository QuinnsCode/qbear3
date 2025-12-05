// @/app/services/cardGame/managers/SandboxManager.ts
import type { CardGameState, CardGameAction, MTGPlayer } from '../CardGameState';
import { PLAYER_POSITIONS, POSITION_COLORS, COMMANDER_STARTING_LIFE } from '../CardGameState';

export class SandboxManager {
  /**
   * Check if a player can interact with a card (move, tap, flip, rotate, etc.)
   * 
   * Rules:
   * - Normal game: Only owner can interact with their cards
   * - Sandbox with shared battlefield:
   *   - Battlefield cards: ANYONE can interact (chaos!)
   *   - Private zones (hand, library, graveyard, exile): Only owner
   */
  static canPlayerInteractWithCard(
    playerId: string,
    cardId: string,
    gameState: CardGameState,
    isSandbox: boolean,
    sandboxConfig: any
  ): boolean {
    const card = gameState.cards[cardId];
    if (!card) {
      console.warn(`⚠️ Card ${cardId} not found in game state`);
      return false;
    }
    
    // Find which player owns this card
    const cardOwner = gameState.players.find(p => 
      Object.values(p.zones).some(zone => zone.includes(cardId))
    );
    
    if (!cardOwner) {
      console.warn(`⚠️ No owner found for card ${cardId}`);
      return false;
    }
    
    // Normal game: only owner can interact with their cards
    if (!isSandbox) {
      const canInteract = cardOwner.id === playerId;
      if (!canInteract) {
        console.log(`❌ Normal mode: ${playerId} cannot interact with ${cardOwner.name}'s card`);
      }
      return canInteract;
    }
    
    // Sandbox with shared battlefield
    if (isSandbox && sandboxConfig?.SHARED_BATTLEFIELD) {
      // If card is on battlefield, anyone can interact with it
      const isOnBattlefield = cardOwner.zones.battlefield.includes(cardId);
      
      if (isOnBattlefield) {
        console.log(`✅ Sandbox: allowing ${playerId} to interact with battlefield card ${cardId}`);
        return true; // CHAOS MODE: Anyone can tap/untap/flip/move battlefield cards!
      }
      
      // Can't interact with cards in other player's private zones
      if (cardOwner.id !== playerId) {
        console.log(`❌ Sandbox: ${playerId} cannot interact with card in ${cardOwner.name}'s private zone`);
        return false;
      }
    }
    
    // Default: owner can always interact with their own cards
    return cardOwner.id === playerId;
  }

  /**
   * @deprecated Use canPlayerInteractWithCard instead
   * Kept for backwards compatibility
   */
  static canPlayerMoveCard(
    playerId: string,
    cardId: string,
    gameState: CardGameState,
    isSandbox: boolean,
    sandboxConfig: any
  ): boolean {
    return this.canPlayerInteractWithCard(playerId, cardId, gameState, isSandbox, sandboxConfig);
  }

  /**
   * Build card data for deck import from sandbox starter deck
   */
  static buildCardDataForImport(assignedDeck: any): any[] {
    return assignedDeck.cards.map((card: any) => ({
      id: card.scryfallId,
      name: card.name,
      image_uris: {
        small: card.imageUrl,
        normal: card.imageUrl,
        large: card.imageUrl,
      },
      type_line: card.type,
      mana_cost: card.manaCost,
      colors: card.colors,
      cmc: card.cmc,
    }));
  }

  /**
   * Get the deck to assign to a player (round-robin)
   */
  static getDeckForPlayer(
    playerIndex: number,
    starterDecks: any[]
  ): any | null {
    if (!starterDecks || starterDecks.length === 0) {
      return null;
    }
    
    const deckIndex = playerIndex % starterDecks.length;
    return starterDecks[deckIndex];
  }

  /**
   * Get max players for a game (sandbox or normal)
   */
  static getMaxPlayers(isSandbox: boolean, sandboxConfig: any): number {
    return isSandbox && sandboxConfig ? sandboxConfig.MAX_PLAYERS : 4;
  }
}