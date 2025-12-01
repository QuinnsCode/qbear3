// @/app/services/cardGame/managers/SandboxManager.ts
import type { CardGameState, CardGameAction, MTGPlayer } from '../CardGameState';
import { PLAYER_POSITIONS, POSITION_COLORS, COMMANDER_STARTING_LIFE } from '../CardGameState';

export class SandboxManager {
  /**
   * Check if a player can move a card (for sandbox shared battlefield)
   */
  static canPlayerMoveCard(
    playerId: string,
    cardId: string,
    gameState: CardGameState,
    isSandbox: boolean,
    sandboxConfig: any
  ): boolean {
    const card = gameState.cards[cardId];
    if (!card) return false;
    
    // Find which player owns this card
    const cardOwner = gameState.players.find(p => 
      Object.values(p.zones).some(zone => zone.includes(cardId))
    );
    
    // Normal game: only owner can move their cards
    if (!isSandbox) {
      return cardOwner?.id === playerId;
    }
    
    // Sandbox with shared battlefield
    if (isSandbox && sandboxConfig?.SHARED_BATTLEFIELD) {
      // If card is on battlefield, anyone can move it
      const isOnBattlefield = cardOwner?.zones.battlefield.includes(cardId);
      
      if (isOnBattlefield) {
        console.log(`✅ Sandbox: allowing ${playerId} to move battlefield card ${cardId}`);
        return true; // Anyone can move battlefield cards!
      }
      
      // Can't move cards from other player's private zones (hand, library, etc)
      if (cardOwner?.id !== playerId) {
        console.log(`❌ Sandbox: ${playerId} cannot move card from ${cardOwner?.name}'s private zone`);
        return false;
      }
    }
    
    // Default: owner can always move their own cards
    return cardOwner?.id === playerId;
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