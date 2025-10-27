// hooks/useGameSaveLoad.ts
import { useState } from 'react';

interface GameSaveLoadOptions {
  gameId: string;
  currentUserId: string;
  onLoadSuccess?: (gameState: any) => void;
  onLoadError?: (error: string) => void;
  onSaveSuccess?: (fileSizeKB: number) => void;
  onSaveError?: (error: string) => void;
}

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export function useGameSaveLoad({
  gameId,
  currentUserId,
  onLoadSuccess,
  onLoadError,
  onSaveSuccess,
  onSaveError
}: GameSaveLoadOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Validate game state before saving or loading
   */
  const validateGameState = (gameState: any): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    
    // ✅ Already has null check
    if (!gameState) {
      issues.push({ type: 'error', message: 'Game state is null or undefined' });
      return issues;
    }
    
    // Critical validations (errors)
    if (!gameState.players || gameState.players.length === 0) {
      issues.push({ type: 'error', message: 'No players found' });
    }
    
    if (!gameState.territories || Object.keys(gameState.territories).length === 0) {
      issues.push({ type: 'error', message: 'No territories found' });
    }
    
    if (!gameState.status) {
      issues.push({ type: 'error', message: 'Game status missing' });
    }
    
    // Check for negative unit counts
    if (gameState.territories) {
      Object.entries(gameState.territories).forEach(([id, territory]: [string, any]) => {
        if (territory.machineCount < 0) {
          issues.push({ 
            type: 'error', 
            message: `Territory ${territory.name || id} has negative units (${territory.machineCount})` 
          });
        }
      });
    }
    
    // Warning validations
    if (gameState.pendingConquest) {
      const pc = gameState.pendingConquest;
      if (!gameState.territories[pc.fromTerritoryId] || !gameState.territories[pc.toTerritoryId]) {
        issues.push({ 
          type: 'warning', 
          message: 'Pending conquest references invalid territories' 
        });
      }
    }
    
    // Check for version compatibility
    if (gameState.version && gameState.version !== "1.0") {
      issues.push({ 
        type: 'warning', 
        message: `Save file version ${gameState.version} may not be compatible with current version 1.0` 
      });
    }
    
    return issues;
  };

  /**
   * Save current game state to a downloadable JSON file
   */
  const saveGameState = async (gameState: any) => {
    setIsSaving(true);
    
    try {
      // ✅ Already has null check
      if (!gameState) {
        const errorMessage = 'Cannot save: Game state is null or undefined';
        console.error(errorMessage);
        onSaveError?.(errorMessage);
        return;
      }
      
      // ✅ Already has required props check
      if (!gameId) {
        const errorMessage = 'Cannot save: Game ID is missing';
        console.error(errorMessage);
        onSaveError?.(errorMessage);
        return;
      }
      
      if (!currentUserId) {
        const errorMessage = 'Cannot save: User ID is missing';
        console.error(errorMessage);
        onSaveError?.(errorMessage);
        return;
      }
      
      // Validate before saving
      const issues = validateGameState(gameState);
      const errors = issues.filter(i => i.type === 'error');
      
      if (errors.length > 0) {
        const errorMessage = `Cannot save game with errors:\n${errors.map(e => `• ${e.message}`).join('\n')}`;
        onSaveError?.(errorMessage);
        return;
      }
      
      // Show warnings but allow save
      const warnings = issues.filter(i => i.type === 'warning');
      if (warnings.length > 0) {
        const warningMessage = `Save file has warnings:\n${warnings.map(w => `• ${w.message}`).join('\n')}\n\nContinue saving?`;
        if (!confirm(warningMessage)) {
          return;
        }
      }
      
      // Prepare game state for saving
      const gameStateToSave = {
        ...gameState,
        timestamp: new Date().toISOString(),
        version: "1.0",
        metadata: {
          gameId,
          savedBy: currentUserId,
          playerCount: gameState.players?.length || 0,
          currentPhase: gameState.currentPhase,
          currentYear: gameState.currentYear,
          status: gameState.status
        }
      };
      
      // Create and download file
      const dataStr = JSON.stringify(gameStateToSave, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      
      // Generate descriptive filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const phase = gameState.currentPhase ? `_phase${gameState.currentPhase}` : '';
      const year = gameState.currentYear ? `_year${gameState.currentYear}` : '';
      link.download = `game-${gameState.status}${year}${phase}_${timestamp}.json`;
      
      link.click();
      URL.revokeObjectURL(link.href);
      
      const fileSizeKB = Math.round(dataBlob.size / 1024);
      console.log(`✅ Game state saved successfully (${fileSizeKB}KB)`);
      onSaveSuccess?.(fileSizeKB);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Failed to save game state:', errorMessage);
      onSaveError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const loadGameState = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      return new Promise<void>((resolve, reject) => {
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve();
            return;
          }
          
          setIsLoading(true);
          
          const fileSizeKB = Math.round(file.size / 1024);
          console.log(`📂 Loading game state file: ${file.name} (${fileSizeKB}KB)`);
          
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            try {
              const loadedState = JSON.parse(e.target?.result as string);
              
              // Validate loaded state
              const issues = validateGameState(loadedState);
              const errors = issues.filter(i => i.type === 'error');
              
              if (errors.length > 0) {
                const errorMessage = `Cannot load invalid game state:\n${errors.map(e => `• ${e.message}`).join('\n')}`;
                onLoadError?.(errorMessage);
                setIsLoading(false);
                reject(new Error(errorMessage));
                return;
              }
              
              // Show warnings but allow load
              const warnings = issues.filter(i => i.type === 'warning');
              if (warnings.length > 0) {
                const warningMessage = `Save file has warnings:\n${warnings.map(w => `• ${w.message}`).join('\n')}\n\nContinue loading?`;
                if (!confirm(warningMessage)) {
                  setIsLoading(false);
                  resolve();
                  return;
                }
              }
              
              // Show confirmation dialog with game info
              const saveDate = loadedState.timestamp ? 
                new Date(loadedState.timestamp).toLocaleString() : 'unknown time';
              
              const metadata = loadedState.metadata || {};
              const playerNames = loadedState.players?.map((p: any) => p.name).join(', ') || 'Unknown';
              
              const confirmLoad = confirm(
                `Load this saved game?\n\n` +
                `📅 Saved: ${saveDate}\n` +
                `🎮 Status: ${loadedState.status}\n` +
                `👥 Players: ${playerNames}\n` +
                `🎯 Phase: ${loadedState.currentPhase || 'unknown'}\n` +
                `📊 Year: ${loadedState.currentYear || 'unknown'}\n` +
                `💾 File: ${file.name} (${fileSizeKB}KB)\n\n` +
                `⚠️ This will overwrite the current game!`
              );
              
              if (!confirmLoad) {
                setIsLoading(false);
                resolve();
                return;
              }
              
              // Send to server
              try {
                const response = await fetch(`/api/game/${gameId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'load_game_state',
                    playerId: currentUserId,
                    gameState: loadedState
                  })
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Server error ${response.status}: ${errorText}`);
                }
                
                const result = await response.json();
                console.log('✅ Game state loaded successfully from:', saveDate);
                
                onLoadSuccess?.(result);
                resolve();
                
              } catch (serverError) {
                const errorMessage = serverError instanceof Error ? serverError.message : 'Unknown server error';
                console.error('❌ Server error loading game state:', errorMessage);
                onLoadError?.(`Failed to load game state on server: ${errorMessage}`);
                reject(serverError);
              }
              
            } catch (parseError) {
              const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse file';
              console.error('❌ Failed to parse game state file:', errorMessage);
              onLoadError?.(`Invalid game state file: ${errorMessage}`);
              reject(parseError);
            } finally {
              setIsLoading(false);
            }
          };
          
          reader.onerror = () => {
            const errorMessage = 'Failed to read the selected file';
            console.error('❌', errorMessage);
            onLoadError?.(errorMessage);
            setIsLoading(false);
            reject(new Error(errorMessage));
          };
          
          reader.readAsText(file);
        };
        
        input.click();
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open file selector';
      console.error('❌ Failed to initiate file load:', errorMessage);
      onLoadError?.(errorMessage);
      throw error;
    }
  };

  /**
   * Quick save with automatic filename
   */
  const quickSave = async (gameState: any) => {
    await saveGameState(gameState);
  };

  /**
   * Export game state as formatted JSON string (for debugging)
   */
  const exportGameStateAsString = (gameState: any): string => {
    const gameStateToExport = {
      ...gameState,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    
    return JSON.stringify(gameStateToExport, null, 2);
  };

  return {
    // State
    isLoading,
    isSaving,
    
    // Actions
    saveGameState,
    loadGameState,
    quickSave,
    
    // Utilities
    validateGameState,
    exportGameStateAsString
  };
}