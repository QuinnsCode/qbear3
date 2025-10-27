// hooks/useGameInteraction.ts
import { useState, useCallback } from 'react';

interface UseGameInteractionOptions {
  gameState: any | null; // ✅ Allow null
  currentUserId: string;
  onError?: (error: string) => void;
}

export function useGameInteraction({ gameState, currentUserId, onError }: UseGameInteractionOptions) {
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState('info');
  const [territoryActionInProgress, setTerritoryActionInProgress] = useState(false);

  const handleModeChange = useCallback((mode: string) => {
    setInteractionMode(mode);
    setSelectedTerritory(null);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedTerritory(null);
    setTerritoryActionInProgress(false);
  }, []);

  const canInteractWithTerritory = useCallback((territoryId: string, action: string): { canInteract: boolean; reason?: string } => {
    // ✅ Early null check for gameState
    if (!gameState) {
      return { canInteract: false, reason: 'Game state is not loaded yet' };
    }
    
    // ✅ Safe access with optional chaining
    if (!gameState?.territories) {
      return { canInteract: false, reason: 'No territories available' };
    }
    
    const territory = gameState.territories[territoryId];
    if (!territory) {
      return { canInteract: false, reason: 'Territory not found' };
    }

    const currentPlayer = gameState?.players?.[gameState.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === currentUserId;

    if (!isMyTurn && gameState.status !== 'setup') {
      return { canInteract: false, reason: "It's not your turn!" };
    }

    // Setup phase validations
    if (gameState.status === 'setup') {
      if (territory.ownerId !== currentUserId) {
        return { canInteract: false, reason: "You can only interact with your own territories during setup!" };
      }
    }

    return { canInteract: true };
  }, [gameState, currentUserId]);

  return {
    selectedTerritory,
    setSelectedTerritory,
    interactionMode,
    setInteractionMode,
    territoryActionInProgress,
    setTerritoryActionInProgress,
    handleModeChange,
    resetSelection,
    canInteractWithTerritory
  };
}