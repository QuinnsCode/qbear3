// Streamlined CollectDeployOverlay.tsx - Use map instead of territory buttons
'use client'

import React, { useState, useEffect } from 'react';
import { 
  X,
  Zap,
  CheckCircle,
  ArrowRight,
  Info,
  Rocket,
  Target,
  Plus
} from 'lucide-react';
import type { GameState, Player } from '@/app/lib/GameState';

interface CollectDeployOverlayProps {
  gameState: GameState
  currentUserId: string
  onCollectAndStartDeploy: (energyAmount: number, unitsToPlace: number) => Promise<void>
  onPlaceUnit: (territoryId: string) => Promise<void>
  onConfirmDeploymentComplete: () => Promise<void>
  onClose?: () => void
}

const CollectDeployOverlay = ({ 
  gameState, 
  currentUserId, 
  onCollectAndStartDeploy,
  onPlaceUnit,
  onConfirmDeploymentComplete,
  onClose 
}: CollectDeployOverlayProps) => {
  const [phase, setPhase] = useState<'collect' | 'deploy' | 'confirm'>('collect');
  const [unitsToPlace, setUnitsToPlace] = useState(0);
  const [unitsPlaced, setUnitsPlaced] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCollectedThisTurn, setHasCollectedThisTurn] = useState(false);

  const myPlayer = gameState.players.find(p => p.id === currentUserId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  // ✅ ENHANCED: Calculate income INCLUDING space base bonuses
  const calculateIncomeAndUnits = () => {
    if (!myPlayer) return { 
      energy: 0, 
      baseUnits: 0, 
      spaceBaseBonusUnits: 0,
      totalUnits: 0,
      details: { territorial: 0, continental: 0, minimum: 0, spaceBases: 0 } 
    };

    const territoryCount = myPlayer.territories.length;
    const territorialBonus = Math.floor(territoryCount / 3);
    let continentalBonus = 0;
    
    const mySpaceBases = myPlayer.territories.filter(tId => {
      const territory = gameState.territories[tId];
      return territory?.spaceBase === currentUserId;
    }).length;
    
    const totalEnergy = Math.max(3, territorialBonus + continentalBonus);
    const baseUnits = Math.max(3, territorialBonus + continentalBonus);
    const spaceBaseBonusUnits = mySpaceBases;
    const totalUnits = baseUnits + spaceBaseBonusUnits;
    
    return {
      energy: totalEnergy,
      baseUnits,
      spaceBaseBonusUnits,
      totalUnits,
      details: {
        territorial: territorialBonus,
        continental: continentalBonus,
        minimum: totalEnergy === 3 ? 3 : 0,
        spaceBases: mySpaceBases
      }
    };
  };

  const income = calculateIncomeAndUnits();

  // ✅ Phase detection based on game state - ALWAYS use fresh game state
  useEffect(() => {
    if (!isMyTurn || !myPlayer) return;

    const playerUnitsToPlace = myPlayer.unitsToPlaceThisTurn || 0;
    const playerUnitsPlaced = myPlayer.unitsPlacedThisTurn || 0;

    console.log(`🔍 OVERLAY STATE UPDATE:`, {
      playerUnitsToPlace,
      playerUnitsPlaced,
      hasCollectedThisTurn,
      localUnitsToPlace: unitsToPlace,
      localUnitsPlaced: unitsPlaced
    });

    // ✅ ALWAYS sync with game state
    setUnitsToPlace(playerUnitsToPlace);
    setUnitsPlaced(playerUnitsPlaced);

    if (playerUnitsToPlace > 0) {
      setHasCollectedThisTurn(true);
      
      if (playerUnitsPlaced >= playerUnitsToPlace) {
        console.log(`🎯 All units placed - switching to confirm phase`);
        setPhase('confirm');
      } else {
        console.log(`🎯 Units need to be placed - switching to deploy phase (${playerUnitsPlaced}/${playerUnitsToPlace})`);
        setPhase('deploy');
      }
    } else if (!hasCollectedThisTurn) {
      console.log(`🎯 No collection yet - showing collect phase`);
      setPhase('collect');
    }
  }, [myPlayer?.unitsToPlaceThisTurn, myPlayer?.unitsPlacedThisTurn, isMyTurn, hasCollectedThisTurn]);

  // ✅ Collect energy and start deployment
  const handleCollectAndStartDeploy = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onCollectAndStartDeploy(income.energy, income.totalUnits);
      setHasCollectedThisTurn(true);
    } catch (error) {
      console.error('Failed to collect energy and start deployment:', error);
      alert(`Failed to start deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Confirm deployment complete and advance to next phase
  const handleConfirmComplete = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await onConfirmDeploymentComplete();
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to complete deployment:', error);
      alert(`Failed to complete deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (gameState.status !== 'playing' || gameState.currentPhase !== 1) {
    return null;
  }

  if (!isMyTurn) {
    return (
      <div className="absolute top-14 left-0 right-0 bg-yellow-500/90 backdrop-blur-sm text-white p-3 z-40 shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <Zap size={20} />
            <span className="font-medium">Collect & Deploy Phase</span>
          </div>
          <div className="text-sm opacity-90 mt-1">
            Waiting for {currentPlayer?.name} to collect energy and deploy units...
          </div>
        </div>
      </div>
    );
  }

  // ✅ STREAMLINED: Different overlay styles based on phase
  if (phase === 'collect') {
    // Full overlay for initial collection
    return (
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Zap className="text-yellow-500" size={28} />
              <h2 className="text-2xl font-bold text-gray-800">Collect & Deploy</h2>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                disabled={isProcessing}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Income Summary */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6 border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Your Turn Income</h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                disabled={isProcessing}
              >
                <Info size={16} />
                <span>{showDetails ? 'Hide' : 'Show'} Details</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{income.energy}</div>
                <div className="text-sm text-gray-600">Energy Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{income.totalUnits}</div>
                <div className="text-sm text-gray-600">Total Units</div>
                {income.spaceBaseBonusUnits > 0 && (
                  <div className="text-xs text-purple-600 flex items-center justify-center mt-1">
                    <Rocket size={12} className="mr-1" />
                    +{income.spaceBaseBonusUnits} from space bases
                  </div>
                )}
              </div>
            </div>

            {showDetails && (
              <div className="mt-4 pt-3 border-t border-yellow-200">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Territories ({myPlayer?.territories.length})</span>
                    <span>+{income.details.territorial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Continental Bonus</span>
                    <span>+{income.details.continental}</span>
                  </div>
                  {income.details.minimum > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Minimum Guarantee</span>
                      <span>+{income.details.minimum}</span>
                    </div>
                  )}
                  {income.details.spaceBases > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Space Base Bonus ({income.details.spaceBases} bases)</span>
                      <span>+{income.details.spaceBases} units</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Collect Button */}
          <div className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Collect & Deploy?</h3>
              <p className="text-gray-600 mb-4">
                You'll collect {income.energy} energy and deploy {income.totalUnits} units using the map below
                {income.spaceBaseBonusUnits > 0 && (
                  <span className="block text-purple-600 mt-1">
                    Your {income.details.spaceBases} space bases will automatically generate {income.spaceBaseBonusUnits} bonus units! 🚀
                  </span>
                )}
              </p>
              
              {/* ✅ Show space base bonus deployments if any */}
              {income.spaceBaseBonusUnits > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-purple-800 mb-2">Space Base Auto-Deployments:</div>
                  <div className="space-y-1">
                    {myPlayer?.territories.filter(tId => {
                      const territory = gameState.territories[tId];
                      return territory?.spaceBase === currentUserId;
                    }).map(tId => {
                      const territory = gameState.territories[tId];
                      return (
                        <div key={tId} className="flex items-center justify-between text-sm">
                          <span className="flex items-center space-x-2">
                            <Rocket size={12} className="text-purple-500" />
                            <span>{territory.name}</span>
                          </span>
                          <span className="text-green-600 font-medium">
                            +1 unit ({territory.machineCount - 1} → {territory.machineCount})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <button
                onClick={handleCollectAndStartDeploy}
                disabled={isProcessing}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 mx-auto ${
                  isProcessing 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Zap size={20} />
                <span>{isProcessing ? 'Processing...' : 'Collect & Start Deploy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ STREAMLINED: Banner overlay for deploy and confirm phases - positioned below top bar
  return (
    <div className="absolute top-14 left-0 right-0 bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 z-40 shadow-lg">
      <div className="flex items-center justify-between">
        
        {/* Left side - Status */}
        <div className="flex items-center space-x-3">
          {phase === 'deploy' ? (
            <>
              <Target className="animate-pulse" size={24} />
              <div>
                <div className="font-semibold">Deploy Your Units</div>
                <div className="text-sm opacity-90">
                  {unitsPlaced}/{unitsToPlace} units placed • Use Deploy mode + map to place units
                </div>
              </div>
            </>
          ) : (
            <>
              <CheckCircle size={24} />
              <div>
                <div className="font-semibold">Deployment Complete!</div>
                <div className="text-sm opacity-90">
                  All {unitsPlaced} units deployed • Ready for Build & Hire phase
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right side - Action */}
        <div className="flex items-center space-x-3">
          {phase === 'deploy' && (
            <div className="text-right">
              <div className="text-lg font-bold">{unitsToPlace - unitsPlaced}</div>
              <div className="text-xs opacity-75">remaining</div>
            </div>
          )}
          
          {phase === 'confirm' && (
            <button
              onClick={handleConfirmComplete}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                isProcessing 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-white text-green-600 hover:bg-gray-100'
              }`}
            >
              <span>{isProcessing ? 'Advancing...' : 'Continue to Build & Hire'}</span>
              <ArrowRight size={16} />
            </button>
          )}

          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded"
              disabled={isProcessing}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ✅ BONUS: Show space base bonus explicitly */}
      {income.spaceBaseBonusUnits > 0 && phase === 'deploy' && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center space-x-2 bg-purple-500/20 rounded-full px-3 py-1 text-sm">
            <Rocket size={14} />
            <span>+{income.spaceBaseBonusUnits} bonus units from your space bases!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectDeployOverlay;