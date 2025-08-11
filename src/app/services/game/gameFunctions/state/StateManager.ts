// src/app/services/game/gameFunctions/state/StateManager.ts

import type { GameState } from '@/app/lib/GameState';

export class StateManager {
  
  // ================================
  // STATE SNAPSHOT UTILITIES
  // ================================
  
  static createStateSnapshot(gameState: GameState | null): Partial<GameState> {
    if (!gameState) return {};
    
    return {
      currentYear: gameState.currentYear,
      currentPhase: gameState.currentPhase,
      currentPlayerIndex: gameState.currentPlayerIndex,
      players: JSON.parse(JSON.stringify(gameState.players)),
      territories: JSON.parse(JSON.stringify(gameState.territories))
    };
  }

  static createInitialStateFromActions(gameState: GameState): GameState {
    if (!gameState) {
      throw new Error('No state available to create initial state from');
    }
    
    return {
      ...gameState,
      actions: [],
      currentActionIndex: -1
    };
  }
}