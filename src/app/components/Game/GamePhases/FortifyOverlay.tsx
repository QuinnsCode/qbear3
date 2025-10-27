// app/components/Game/GamePhases/FortifyOverlay.tsx
'use client'
import { useState, useEffect } from 'react';
import { Shield, ArrowRight, Check, X, Users, Crown, Clock } from 'lucide-react';

interface FortifyOverlayProps {
  gameState: any;
  currentUserId: string;
  onFortifyTerritory: (fromTerritoryId: string, toTerritoryId: string, unitCount: number) => Promise<void>;
  onAdvanceFromFortify: () => Promise<void>;
}

const FortifyOverlay = ({ 
  gameState, 
  currentUserId, 
  onFortifyTerritory, 
  onAdvanceFromFortify 
}: FortifyOverlayProps) => {
  const [phase, setPhase] = useState<'confirm_end_invasion' | 'extra_deploy_cards' | 'select_source' | 'select_destination' | 'configure_move'>('confirm_end_invasion');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [unitCount, setUnitCount] = useState<number>(1);
  const [moveCommanders, setMoveCommanders] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number>(20);
  const [hasUsedExtraDeployCards, setHasUsedExtraDeployCards] = useState(false);

  const myPlayer = gameState?.players?.find(p => p.id === currentUserId);
  const myTerritories = myPlayer?.territories || [];

  // Auto-advance timer for extra deployment cards
  // useEffect(() => {
  //   if (phase === 'extra_deploy_cards' && autoAdvanceTimer > 0) {
  //     const timer = setTimeout(() => {
  //       setAutoAdvanceTimer(autoAdvanceTimer - 1);
  //     }, 1000);
  //     return () => clearTimeout(timer);
  //   } else if (phase === 'extra_deploy_cards' && autoAdvanceTimer === 0) {
  //     // Auto-proceed without using extra deploy cards
  //     setPhase('select_source');
  //   }
  // }, [phase, autoAdvanceTimer]);

  // Get territories that can be fortified FROM (have more than 1 unit)
  const sourceableTerritories = myTerritories.filter(territoryId => {
    const territory = gameState.territories[territoryId];
    return territory && territory.machineCount > 1;
  });

  // Get territories that can be fortified TO (owned, contiguously connected)
  const getDestinationTerritories = (sourceId: string) => {
    if (!sourceId) return [];
    
    return myTerritories.filter(territoryId => {
      if (territoryId === sourceId) return false; // Can't fortify to self
      return hasContiguousPath(sourceId, territoryId);
    });
  };

  // Check if there's a contiguous path between two territories through owned territories
  const hasContiguousPath = (fromId: string, toId: string): boolean => {
    const visited = new Set<string>();
    const queue = [fromId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === toId) return true;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const current = gameState.territories[currentId];
      if (!current || current.ownerId !== currentUserId) continue;
      
      const adjacents = current.adjacentTerritories || [];
      for (const adjId of adjacents) {
        if (!visited.has(adjId) && myTerritories.includes(adjId)) {
          queue.push(adjId);
        }
      }
    }
    
    return false;
  };

  const getAvailableCommanders = (territoryId: string) => {
    const territory = gameState.territories[territoryId];
    if (!territory) return [];
    
    const commanders = [];
    if (territory.landCommander === currentUserId) commanders.push('land');
    if (territory.diplomatCommander === currentUserId) commanders.push('diplomat');
    if (territory.nuclearCommander === currentUserId) commanders.push('nuclear');
    if (territory.navalCommander === currentUserId) commanders.push('naval');
    
    return commanders;
  };

  const handleConfirmEndInvasion = () => {
    setPhase('extra_deploy_cards');
    setAutoAdvanceTimer(20); // Reset timer
  };

  const handleUseExtraDeployCards = () => {
    setHasUsedExtraDeployCards(true);
    // This would trigger extra deployment card logic
    // For now, just proceed to fortify
    setPhase('select_source');
  };

  const handleSkipExtraDeployCards = () => {
    setPhase('select_source');
  };

  const handleSourceSelect = (territoryId: string) => {
    setSelectedSource(territoryId);
    setPhase('select_destination');
  };

  const handleDestinationSelect = (territoryId: string) => {
    setSelectedDestination(territoryId);
    
    const sourceTerritory = gameState.territories[selectedSource!];
    const maxUnits = sourceTerritory.machineCount - 1; // Must leave 1 unit behind
    setUnitCount(Math.min(1, maxUnits));
    
    setPhase('configure_move');
  };

  const handleConfirmFortify = async () => {
    if (!selectedSource || !selectedDestination) return;
    
    setIsProcessing(true);
    try {
      // Use existing fortifyTerritory function
      await onFortifyTerritory(selectedSource, selectedDestination, unitCount);
      
      // Reset for another fortify move
      setSelectedSource(null);
      setSelectedDestination(null);
      setUnitCount(1);
      setMoveCommanders(false);
      setPhase('select_source');
    } catch (error) {
      console.error('Fortify failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdvance = async () => {
    setIsProcessing(true);
    try {
      await onAdvanceFromFortify();
    } catch (error) {
      console.error('Advance failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 'confirm_end_invasion':
        return (
          <div className="space-y-4 text-center">
            <div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">End Invasion Phase?</h3>
              <p className="text-sm text-amber-200">
                Confirm you wish to end the invasion phase and move to fortification.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setPhase('select_source')} // Skip to fortify
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndInvasion}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors flex items-center justify-center space-x-2"
              >
                <Check size={16} />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        );

      case 'extra_deploy_cards':
        return (
          <div className="space-y-4 text-center">
            <div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">Extra Deployment Cards</h3>
              <p className="text-sm text-amber-200">
                Do you want to use any extra deployment step cards?
              </p>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <Clock size={16} className="text-yellow-400" />
                <span className="text-yellow-400 font-bold">Auto-proceed in {autoAdvanceTimer}s</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleSkipExtraDeployCards}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleUseExtraDeployCards}
                disabled={true} // Disabled for now - implement later
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded transition-colors"
              >
                Use Cards
              </button>
            </div>
          </div>
        );

      case 'select_source':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-amber-100">Select Source Territory</h3>
              <p className="text-sm text-amber-200">Choose a territory to move units FROM (must have 2+ units)</p>
            </div>
            
            {sourceableTerritories.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="mx-auto mb-2 text-amber-300" size={48} />
                <p className="text-amber-200">No territories available for fortification</p>
                <p className="text-xs text-amber-300">All your territories have only 1 unit</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sourceableTerritories.map(territoryId => {
                  const territory = gameState.territories[territoryId];
                  const commanders = getAvailableCommanders(territoryId);
                  
                  return (
                    <button
                      key={territoryId}
                      onClick={() => handleSourceSelect(territoryId)}
                      className="w-full p-3 bg-amber-800/40 hover:bg-amber-700/60 border border-amber-600/50 rounded text-left transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-amber-100">{territory.name}</div>
                          <div className="text-xs text-amber-200">
                            {territory.machineCount} units ({territory.machineCount - 1} available to move)
                          </div>
                        </div>
                        {commanders.length > 0 && (
                          <div className="flex space-x-1">
                            {commanders.map(cmd => (
                              <Crown key={cmd} size={16} className="text-yellow-400" />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'select_destination':
        const destinationTerritories = getDestinationTerritories(selectedSource!);
        const sourceTerritory = gameState.territories[selectedSource!];
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-amber-100">Select Destination Territory</h3>
              <p className="text-sm text-amber-200">
                Moving from: <span className="font-semibold">{sourceTerritory.name}</span>
              </p>
            </div>
            
            {destinationTerritories.length === 0 ? (
              <div className="text-center py-8">
                <X className="mx-auto mb-2 text-red-400" size={48} />
                <p className="text-amber-200">No valid destination territories</p>
                <p className="text-xs text-amber-300">No contiguous path to other territories</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {destinationTerritories.map(territoryId => {
                  const territory = gameState.territories[territoryId];
                  
                  return (
                    <button
                      key={territoryId}
                      onClick={() => handleDestinationSelect(territoryId)}
                      className="w-full p-3 bg-green-800/40 hover:bg-green-700/60 border border-green-600/50 rounded text-left transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-amber-100">{territory.name}</div>
                          <div className="text-xs text-amber-200">
                            Currently: {territory.machineCount} units
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-green-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            <button
              onClick={() => setPhase('select_source')}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
            >
              Back to Source Selection
            </button>
          </div>
        );

      case 'configure_move':
        const source = gameState.territories[selectedSource!];
        const destination = gameState.territories[selectedDestination!];
        const maxMoveable = source.machineCount - 1;
        const availableCommanders = getAvailableCommanders(selectedSource!);
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-amber-100">Configure Fortification</h3>
              <div className="text-sm text-amber-200 flex items-center justify-center space-x-2">
                <span>{source.name}</span>
                <ArrowRight size={16} />
                <span>{destination.name}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-amber-200 mb-2">
                  Units to Move (Max: {maxMoveable})
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxMoveable}
                  value={unitCount}
                  onChange={(e) => setUnitCount(Math.max(1, Math.min(maxMoveable, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 bg-amber-900/50 border border-amber-600/50 rounded text-amber-100"
                />
              </div>
              
              {availableCommanders.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-amber-200 mb-2">
                    Move Commanders
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={moveCommanders}
                      onChange={(e) => setMoveCommanders(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-amber-200">
                      Move all commanders ({availableCommanders.join(', ')})
                    </span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setPhase('select_destination')}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmFortify}
                disabled={isProcessing || unitCount < 1}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded transition-colors flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm Move</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-amber-900/95 to-orange-900/95 backdrop-blur-md border-2 border-amber-600/60 rounded-lg w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="p-4 border-b border-amber-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield size={20} className="text-amber-300" />
              <span className="font-bold text-amber-100">Fortify Phase</span>
            </div>
            <div className="text-xs text-amber-300">Phase 6</div>
          </div>
        </div>
        
        <div className="p-4">
          {renderPhaseContent()}
          
          {/* Show end turn button when appropriate */}
          {(phase === 'select_source') && (
            <div className="mt-4 pt-4 border-t border-amber-600/30">
              <button
                onClick={handleAdvance}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded transition-colors flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    <span>End Turn</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FortifyOverlay;