// hooks/useCardPlayMode.ts
import { useState, useCallback } from 'react';

interface CardPlayMode {
  active: boolean;
  cardId: string;
  cardTitle: string;
  cardType: string;
  validTerritoryTypes: string[];
}

interface UseCardPlayModeOptions {
  gameState: any | null; // ✅ Allow null
  currentUserId: string;
  onPlayCard: (cardId: string, targets: string[]) => Promise<void>;
  onError?: (error: string) => void;
}

export function useCardPlayMode({
  gameState,
  currentUserId,
  onPlayCard,
  onError
}: UseCardPlayModeOptions) {
  const [cardPlayMode, setCardPlayMode] = useState<CardPlayMode | null>(null);
  const [cardSelectedTerritories, setCardSelectedTerritories] = useState<string[]>([]);

  const enterCardPlayMode = useCallback((cardId: string, cardData: any) => {
    console.log('🎴 Card play mode data:', {
      cardId,
      cardData,
      cardTitle: cardData?.cardTitle,
      commanderType: cardData?.commanderType || cardData?.cardType
    });

    const cardType = cardData.commanderType || cardData.cardType;
    let validTypes: string[] = [];
    
    switch (cardData.cardTitle) {
      case 'Assemble MODs':
      case 'Territorial Station':
        validTypes = cardType === 'naval' ? ['water'] : ['land'];
        break;
      default:
        validTypes = ['land', 'water'];
    }
    
    setCardPlayMode({
      active: true,
      cardId: cardId,
      cardTitle: cardData.cardTitle,
      cardType: cardType,
      validTerritoryTypes: validTypes
    });
    setCardSelectedTerritories([]);
  }, []);

  const exitCardPlayMode = useCallback(() => {
    setCardPlayMode(null);
    setCardSelectedTerritories([]);
  }, []);

  const clearSelection = useCallback(() => {
    setCardSelectedTerritories([]);
  }, []);

  const getRequiredTargetCount = useCallback((cardTitle: string) => {
    switch (cardTitle) {
      case 'Assemble MODs':
      case 'Territorial Station':
        return 1;
      case 'Reinforcements':
        return 3;
      default:
        return 1;
    }
  }, []);

  const getCardEffect = useCallback((cardMode: CardPlayMode | null) => {
    if (!cardMode) return '';
    
    switch (cardMode.cardTitle) {
      case 'Assemble MODs':
        return "Place 3 MODs on the selected territory";
      case 'Reinforcements':
        return "Place 1 MOD on each of the 3 selected territories";
      case 'Colony Influence':
        return "Move your score marker ahead 3 spaces";
      case 'Territorial Station':
        return "Place a space station on the selected territory";
      case 'Scout Forces':
        return "Draw a land territory card and place 5 MODs on it";
      case 'Stealth MODs':
        return "Place 3 additional defending MODs";
      default:
        return "Apply card effect";
    }
  }, []);

  const canSelectTerritory = useCallback((territoryId: string): { canSelect: boolean; reason?: string } => {
    if (!cardPlayMode) {
      return { canSelect: false, reason: 'Not in card play mode' };
    }

    // ✅ Early null check for gameState
    if (!gameState) {
      return { canSelect: false, reason: 'Game state not loaded' };
    }

    // ✅ Safe access with optional chaining
    if (!gameState?.territories) {
      return { canSelect: false, reason: 'No territories available' };
    }

    const territory = gameState.territories[territoryId];
    if (!territory) {
      return { canSelect: false, reason: 'Invalid territory selected' };
    }
    
    if (territory.ownerId !== currentUserId) {
      return { canSelect: false, reason: 'You can only target territories you control' };
    }
    
    if (!cardPlayMode.validTerritoryTypes.includes(territory.type)) {
      return { 
        canSelect: false, 
        reason: `This card requires a ${cardPlayMode.validTerritoryTypes.join(' or ')} territory` 
      };
    }

    const requiredTargets = getRequiredTargetCount(cardPlayMode.cardTitle);
    const isAlreadySelected = cardSelectedTerritories.includes(territoryId);
    
    if (!isAlreadySelected && cardSelectedTerritories.length >= requiredTargets) {
      return { 
        canSelect: false, 
        reason: `This card only requires ${requiredTargets} territories. Deselect one first.` 
      };
    }

    return { canSelect: true };
  }, [cardPlayMode, gameState, currentUserId, cardSelectedTerritories, getRequiredTargetCount]);

  const handleTerritorySelection = useCallback(async (territoryId: string) => {
    if (!cardPlayMode) return;

    const { canSelect, reason } = canSelectTerritory(territoryId);
    if (!canSelect) {
      onError?.(reason || 'Cannot select territory');
      return;
    }

    const requiredTargets = getRequiredTargetCount(cardPlayMode.cardTitle);
    const isAlreadySelected = cardSelectedTerritories.includes(territoryId);
    
    let newSelectedTerritories: string[];
    
    if (isAlreadySelected) {
      // Remove if already selected
      newSelectedTerritories = cardSelectedTerritories.filter(id => id !== territoryId);
    } else {
      // Add if not selected
      newSelectedTerritories = [...cardSelectedTerritories, territoryId];
    }
    
    setCardSelectedTerritories(newSelectedTerritories);
    
    // If we have enough territories, show confirmation
    if (newSelectedTerritories.length === requiredTargets) {
      // ✅ Add null check for gameState
      if (!gameState?.territories) {
        onError?.('Game state not loaded');
        return;
      }

      const territoryNames = newSelectedTerritories
        .map(id => gameState.territories[id]?.name || id)
        .join(', ');
      
      const confirmPlay = confirm(
        `Play ${cardPlayMode.cardTitle} on: ${territoryNames}?\n\n${getCardEffect(cardPlayMode)}`
      );
      
      if (confirmPlay) {
        try {
          // Play the card with all selected territories
          await onPlayCard(cardPlayMode.cardId, newSelectedTerritories);
          
          // Reset card play mode on success
          exitCardPlayMode();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          onError?.(`Failed to play card: ${errorMessage}`);
        }
      }
    }
  }, [
    cardPlayMode, 
    canSelectTerritory, 
    cardSelectedTerritories, 
    getRequiredTargetCount, 
    gameState, 
    getCardEffect, 
    onPlayCard, 
    exitCardPlayMode, 
    onError
  ]);

  const getSelectionProgress = useCallback(() => {
    if (!cardPlayMode) return null;
    
    const required = getRequiredTargetCount(cardPlayMode.cardTitle);
    const selected = cardSelectedTerritories.length;
    
    return {
      selected,
      required,
      isComplete: selected === required,
      remaining: required - selected
    };
  }, [cardPlayMode, cardSelectedTerritories, getRequiredTargetCount]);

  const getSelectedTerritoryNames = useCallback(() => {
    // ✅ Add null check for gameState with optional chaining
    if (!gameState?.territories) {
      return '';
    }
    
    return cardSelectedTerritories
      .map(id => gameState.territories[id]?.name || id)
      .join(', ');
  }, [cardSelectedTerritories, gameState]);

  const getInstructionText = useCallback(() => {
    if (!cardPlayMode) return '';
    
    const progress = getSelectionProgress();
    if (!progress) return '';
    
    if (progress.isComplete) {
      return 'All territories selected! Click a territory to confirm or deselect to change.';
    } else {
      return `Tap ${progress.remaining} more ${cardPlayMode.validTerritoryTypes.join('/')} territories you control`;
    }
  }, [cardPlayMode, getSelectionProgress]);

  return {
    // State
    cardPlayMode,
    cardSelectedTerritories,
    
    // Actions
    enterCardPlayMode,
    exitCardPlayMode,
    clearSelection,
    handleTerritorySelection,
    
    // Validation
    canSelectTerritory,
    
    // Utilities
    getRequiredTargetCount,
    getCardEffect,
    getSelectionProgress,
    getSelectedTerritoryNames,
    getInstructionText
  };
}