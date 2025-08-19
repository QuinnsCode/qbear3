// hooks/useGameActions.ts - Centralized game action handling
import { useState, useCallback } from 'react';
import type { GameState } from '@/app/lib/GameState';
import * as gameActions from '@/app/serverActions/gameActions';

interface UseGameActionsOptions {
  gameId: string;
  currentUserId: string;
  onStateUpdate?: (newState: GameState) => void;
  onError?: (error: string) => void;
}

interface GameAction {
  type: string;
  playerId: string;
  data: any;
}

export function useGameActions({ 
  gameId, 
  currentUserId, 
  onStateUpdate, 
  onError 
}: UseGameActionsOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const executeAction = useCallback(async (action: GameAction): Promise<GameState | null> => {
    if (isProcessing) {
      console.log('Action already in progress, skipping:', action.type);
      return null;
    }

    setIsProcessing(true);
    setLastError(null);

    try {
      console.log('🎮 Executing action:', action);
      
      let result: GameState;

      // Route action to appropriate server action
      switch (action.type) {
        case 'place_unit':
          result = await gameActions.placeUnit(
            gameId,
            action.playerId,
            action.data.territoryId,
            action.data.count || 1
          );
          break;

        case 'invade_territory':
          const { gameState, invasionResult } = await gameActions.invadeTerritory(
            gameId,
            action.playerId,
            action.data.fromTerritoryId,
            action.data.toTerritoryId,
            action.data.attackingUnits,
            action.data.commanderTypes
          );

          // Use `gameState` as the main result
          result = gameState;

          // Optionally, handle `invasionResult` if you need to do something with it
          // For example, update state or log it
          console.log('~~~Invasion result:', invasionResult);
          break;
        case 'fortify_territory':
          result = await gameActions.fortifyTerritory(
            gameId,
            action.playerId,
            action.data.fromTerritoryId,
            action.data.toTerritoryId,
            action.data.unitCount
          );
          break;

        case 'deploy_machines':
          result = await gameActions.deployMachines(
            gameId,
            action.playerId,
            action.data.territoryId,
            action.data.count
          );
          break;

        case 'advance_phase':
          result = await gameActions.advancePhase(gameId, action.playerId);
          break;

        // case 'advance_setup_turn':
        //   result = await gameActions.advanceSetupTurn(gameId, action.playerId);
        //   break;

        case 'advance_turn':
          result = await gameActions.advanceTurn(gameId, action.playerId);
          break;

        case 'player_decision':
          result = await gameActions.makePlayerDecision(
            gameId,
            action.playerId,
            action.data.decision
          );
          break;

        case 'play_card':
          result = await gameActions.playCard(
            gameId,
            action.playerId,
            action.data.cardId,
            action.data.targets
          );
          break;

        case 'get_state':
          result = await gameActions.getGameState(gameId);
          break;

        case 'process_ai_turn':
          // For AI turns, we might need special handling
          console.log('🤖 Processing AI turn for player:', action.playerId);
          result = await gameActions.getGameState(gameId); // Get fresh state
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      console.log('✅ Action completed successfully:', action.type);
      
      // Update state if callback provided
      if (onStateUpdate && result) {
        onStateUpdate(result);
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Action failed';
      console.error('❌ Action failed:', action.type, errorMsg);
      
      setLastError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [gameId, currentUserId, onStateUpdate, onError, isProcessing]);

  // Convenience methods for common actions
  const actions = {
    placeUnit: (territoryId: string, count: number = 1) =>
      executeAction({
        type: 'place_unit',
        playerId: currentUserId,
        data: { territoryId, count }
      }),

    attack: (fromTerritoryId: string, toTerritoryId: string, attackingUnits: number) =>
      executeAction({
        type: 'invade_territory',
        playerId: currentUserId,
        data: { fromTerritoryId, toTerritoryId, attackingUnits }
      }),

    fortify: (fromTerritoryId: string, toTerritoryId: string, unitCount: number) =>
      executeAction({
        type: 'fortify_territory',
        playerId: currentUserId,
        data: { fromTerritoryId, toTerritoryId, unitCount }
      }),

    deployMachines: (territoryId: string, count: number) =>
      executeAction({
        type: 'deploy_machines',
        playerId: currentUserId,
        data: { territoryId, count }
      }),

    advancePhase: () =>
      executeAction({
        type: 'advance_phase',
        playerId: currentUserId,
        data: {}
      }),

    makeDecision: (decision: any) =>
      executeAction({
        type: 'player_decision',
        playerId: currentUserId,
        data: { decision }
      }),

    playCard: (cardId: string, targets?: string[]) =>
      executeAction({
        type: 'play_card',
        playerId: currentUserId,
        data: { cardId, targets }
      }),

    processAITurn: (playerId: string) =>
      executeAction({
        type: 'process_ai_turn',
        playerId,
        data: {}
      }),

    refreshState: () =>
      executeAction({
        type: 'get_state',
        playerId: currentUserId,
        data: {}
      })
  };

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    executeAction,
    actions,
    isProcessing,
    lastError,
    clearError
  };
}