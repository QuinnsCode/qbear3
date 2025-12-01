// src/app/services/cardGame/managers/CardManager.ts
import type { CardGameState, CardGameAction, Card } from '@/app/services/cardGame/CardGameState'

/**
 * CardManager - Handles card manipulation (move, tap, flip, rotate)
 */
export class CardManager {
  
  /**
   * Move a card to a new position on the battlefield
   */
  static moveCard(gameState: CardGameState, action: CardGameAction): CardGameState {
    const card = gameState.cards[action.data.cardId]
    if (!card) {
      console.error('Card not found:', action.data.cardId)
      return gameState
    }
    
    return {
      ...gameState,
      cards: {
        ...gameState.cards,
        [action.data.cardId]: {
          ...card,
          position: action.data.position
        }
      }
    }
  }
  
  /**
   * Rotate a card (for tapping/untapping)
   */
  static rotateCard(gameState: CardGameState, action: CardGameAction): CardGameState {
    const card = gameState.cards[action.data.cardId]
    if (!card) {
      console.error('Card not found:', action.data.cardId)
      return gameState
    }
    
    // Validate rotation value
    const rotation = action.data.rotation
    if (rotation !== 0 && rotation !== 90 && rotation !== 180 && rotation !== 270) {
      console.error('Invalid rotation value:', rotation)
      return gameState
    }
    
    console.log(`🔃 Rotating card ${action.data.cardId} to ${rotation}°`)
    
    return {
      ...gameState,
      cards: {
        ...gameState.cards,
        [action.data.cardId]: {
          ...card,
          rotation: rotation as 0 | 90 | 180 | 270
        }
      }
    }
  }
  
  /**
   * Tap a card (rotate 90 degrees)
   */
  static tapCard(gameState: CardGameState, action: CardGameAction): CardGameState {
    const card = gameState.cards[action.data.cardId]
    if (!card) {
      console.error('Card not found:', action.data.cardId)
      return gameState
    }
    
    console.log(`↩️ Tapping card ${action.data.cardId}`)
    
    return {
      ...gameState,
      cards: {
        ...gameState.cards,
        [action.data.cardId]: {
          ...card,
          rotation: 90
        }
      }
    }
  }
  
  /**
   * Untap a card (rotate back to 0 degrees)
   */
  static untapCard(gameState: CardGameState, action: CardGameAction): CardGameState {
    const card = gameState.cards[action.data.cardId]
    if (!card) {
      console.error('Card not found:', action.data.cardId)
      return gameState
    }
    
    console.log(`↪️ Untapping card ${action.data.cardId}`)
    
    return {
      ...gameState,
      cards: {
        ...gameState.cards,
        [action.data.cardId]: {
          ...card,
          rotation: 0
        }
      }
    }
  }
  
  /**
   * Flip a card face up/down
   */
  static flipCard(gameState: CardGameState, action: CardGameAction): CardGameState {
    const card = gameState.cards[action.data.cardId]
    if (!card) {
      console.error('Card not found:', action.data.cardId)
      return gameState
    }
    
    const newFaceUpState = action.data.isFaceUp !== undefined 
      ? action.data.isFaceUp 
      : !card.isFaceUp
    
    console.log(`🔄 Flipping card ${action.data.cardId} to ${newFaceUpState ? 'face up' : 'face down'}`)
    
    return {
      ...gameState,
      cards: {
        ...gameState.cards,
        [action.data.cardId]: {
          ...card,
          isFaceUp: newFaceUpState
        }
      }
    }
  }
}