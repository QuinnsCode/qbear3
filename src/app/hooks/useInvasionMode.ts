// app/hooks/useInvasionMode.ts
import { useState, useCallback } from 'react';

interface InvasionState {
  isActive: boolean;
  fromTerritoryId: string | null;
  toTerritoryId: string | null;
}

interface GameState {
  territories: Record<string, any>;
  players: any[];
  currentPlayerIndex: number;
  status: string;
  currentPhase: number;
}

interface UseInvasionModeProps {
  gameState: GameState | null; // ✅ Already handles null
  currentUserId: string;
  onInvadeTerritory: (fromId: string, toId: string, units: number, commanders: string[]) => Promise<void>;
  onMoveIntoEmpty: (fromId: string, toId: string, units: number) => Promise<void>;
  onConfirmConquest: (additionalUnits: number) => Promise<void>;
  onError: (error: string) => void;
}

export const useInvasionMode = ({
  gameState,
  currentUserId,
  onInvadeTerritory,
  onMoveIntoEmpty,
  onConfirmConquest,
  onError
}: UseInvasionModeProps) => {
  const [invasionState, setInvasionState] = useState<InvasionState | null>(null);

  const validateAttackingTerritory = useCallback((territoryId: string): { valid: boolean; reason?: string } => {
    // ✅ Early null check
    if (!gameState) return { valid: false, reason: 'Game state not available' };

    const territory = gameState.territories?.[territoryId]; // ✅ Optional chaining
    if (!territory) return { valid: false, reason: 'Territory not found' };

    if (territory.ownerId !== currentUserId) {
      return { valid: false, reason: 'You must select your own territory to attack from' };
    }

    // Check if territory is attack-locked
    const myPlayer = gameState.players?.find(p => p.id === currentUserId); // ✅ Optional chaining
    const attackLockedTerritories = myPlayer?.invasionStats?.territoriesAttackedFrom || [];

    if (attackLockedTerritories.includes(territoryId)) {
      return { valid: false, reason: 'This territory has already attacked this turn and is locked down' };
    }

    if (territory.machineCount <= 1) {
      return { valid: false, reason: 'This territory needs more than 1 unit to attack (must leave 1 behind)' };
    }

    return { valid: true };
  }, [gameState, currentUserId]);

  const validateDefendingTerritory = useCallback((territoryId: string): { valid: boolean; reason?: string } => {
    // ✅ Early null check
    if (!gameState) return { valid: false, reason: 'Game state not available' };

    const territory = gameState.territories?.[territoryId]; // ✅ Optional chaining
    if (!territory) return { valid: false, reason: 'Territory not found' };

    // Can attack any territory that's not your own
    if (territory.ownerId === currentUserId) {
      return { valid: false, reason: 'Cannot attack your own territory' };
    }

    return { valid: true };
  }, [gameState, currentUserId]);

  const startAttackSelection = useCallback((fromTerritoryId: string): boolean => {
    const validation = validateAttackingTerritory(fromTerritoryId);
    if (!validation.valid) {
      onError(validation.reason || 'Invalid attacking territory');
      return false;
    }

    setInvasionState({
      isActive: false, // Not fully active until target is selected
      fromTerritoryId,
      toTerritoryId: null
    });

    return true;
  }, [validateAttackingTerritory, onError]);

  const selectAttackTarget = useCallback((toTerritoryId: string): boolean => {
    if (!invasionState?.fromTerritoryId) {
      onError('No attacking territory selected');
      return false;
    }

    const validation = validateDefendingTerritory(toTerritoryId);
    if (!validation.valid) {
      onError(validation.reason || 'Invalid target territory');
      return false;
    }

    setInvasionState({
      isActive: true,
      fromTerritoryId: invasionState.fromTerritoryId,
      toTerritoryId
    });

    return true;
  }, [invasionState, validateDefendingTerritory, onError]);

  const handleAttackClick = useCallback((territoryId: string, selectedTerritory: string | null): string | null => {
    // ✅ Early null check with optional chaining
    if (!gameState || gameState.status !== 'playing' || gameState.currentPhase !== 5) {
      return selectedTerritory;
    }

    const territory = gameState.territories?.[territoryId]; // ✅ Optional chaining
    if (!territory) return selectedTerritory;

    if (!selectedTerritory) {
      // First click - select attacking territory
      if (territory.ownerId === currentUserId) {
        const success = startAttackSelection(territoryId);
        return success ? territoryId : null;
      } else {
        onError('You must select your own territory to attack from');
        return null;
      }
    } else {
      // Second click
      if (territoryId === selectedTerritory) {
        // Cancel attack
        cancelInvasion();
        return null;
      } else if (territory.ownerId === currentUserId) {
        // Switch attacking territory
        const success = startAttackSelection(territoryId);
        return success ? territoryId : selectedTerritory;
      } else {
        // Attack target
        const success = selectAttackTarget(territoryId);
        return success ? selectedTerritory : selectedTerritory;
      }
    }
  }, [gameState, currentUserId, startAttackSelection, selectAttackTarget, onError]);

  const handleInvade = useCallback(async (attackingUnits: number, commanderTypes: string[]) => {
    if (!invasionState?.fromTerritoryId || !invasionState?.toTerritoryId) {
      onError('Invasion state not properly set');
      return;
    }

    try {
      await onInvadeTerritory(
        invasionState.fromTerritoryId,
        invasionState.toTerritoryId,
        attackingUnits,
        commanderTypes
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Combat failed: ${errorMessage}`);
      setInvasionState(null);
    }
  }, [invasionState, onInvadeTerritory, onError]);

  const handleMoveIntoEmpty = useCallback(async (movingUnits: number) => {
    if (!invasionState?.fromTerritoryId || !invasionState?.toTerritoryId) {
      onError('Invasion state not properly set');
      return;
    }

    try {
      await onMoveIntoEmpty(
        invasionState.fromTerritoryId,
        invasionState.toTerritoryId,
        movingUnits
      );
      setInvasionState(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Movement failed: ${errorMessage}`);
    }
  }, [invasionState, onMoveIntoEmpty, onError]);

  const handleConfirmConquest = useCallback(async (additionalUnits: number) => {
    try {
      await onConfirmConquest(additionalUnits);
      setInvasionState(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Conquest confirmation failed: ${errorMessage}`);
    }
  }, [onConfirmConquest, onError]);

  const cancelInvasion = useCallback(() => {
    setInvasionState(null);
  }, []);

  const isInvasionActive = invasionState?.isActive || false;
  const hasSelectedAttacker = invasionState?.fromTerritoryId !== null;
  const attackingTerritoryId = invasionState?.fromTerritoryId || null;
  const targetTerritoryId = invasionState?.toTerritoryId || null;

  return {
    // State
    invasionState,
    isInvasionActive,
    hasSelectedAttacker,
    attackingTerritoryId,
    targetTerritoryId,

    // Actions
    handleAttackClick,
    handleInvade,
    handleMoveIntoEmpty,
    handleConfirmConquest,
    cancelInvasion,

    // Validation utilities
    validateAttackingTerritory,
    validateDefendingTerritory
  };
};