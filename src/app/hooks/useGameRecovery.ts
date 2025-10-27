// hooks/useGameRecovery.ts
import { useState, useCallback } from 'react';
import { getGameState } from '@/app/serverActions/gameActions';

interface UseGameRecoveryOptions {
  gameId: string;
  onRecovered?: (gameState: any) => void;
  onRecoveryFailed?: (error: string) => void;
}

export function useGameRecovery({ 
  gameId, 
  onRecovered, 
  onRecoveryFailed 
}: UseGameRecoveryOptions) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastRecoveryError, setLastRecoveryError] = useState<string | null>(null);

  const attemptRecovery = useCallback(async () => {
    if (isRecovering) return false;
    
    // Check if gameId is available
    if (!gameId) {
      const errorMsg = 'Cannot recover: Game ID is missing';
      console.error('❌ ' + errorMsg);
      setLastRecoveryError(errorMsg);
      onRecoveryFailed?.(errorMsg);
      return false;
    }

    setIsRecovering(true);
    setLastRecoveryError(null);
    
    try {
      console.log(`🔄 Attempting game recovery (attempt ${recoveryAttempts + 1})`);
      
      // Try to fetch fresh game state
      const freshGameState = await getGameState(gameId);
      
      if (freshGameState && freshGameState.id) {
        console.log('✅ Game recovery successful');
        setRecoveryAttempts(0);
        onRecovered?.(freshGameState);
        return true;
      } else {
        throw new Error('Invalid game state received');
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Recovery failed';
      console.error('❌ Game recovery failed:', errorMsg);
      
      setRecoveryAttempts(prev => prev + 1);
      setLastRecoveryError(errorMsg);
      onRecoveryFailed?.(errorMsg);
      return false;
      
    } finally {
      setIsRecovering(false);
    }
  }, [gameId, recoveryAttempts, isRecovering, onRecovered, onRecoveryFailed]);

  const resetRecovery = useCallback(() => {
    setRecoveryAttempts(0);
    setLastRecoveryError(null);
  }, []);

  return {
    attemptRecovery,
    resetRecovery,
    isRecovering,
    recoveryAttempts,
    lastRecoveryError,
    canRetry: recoveryAttempts < 3
  };
}