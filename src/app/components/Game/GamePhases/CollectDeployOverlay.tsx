// Replace your CollectDeployOverlay.tsx with this FIXED version:
'use client'

import React, { useState, useEffect } from 'react';
import { 
  X,
  Zap,
  Plus,
  CheckCircle,
  ArrowRight,
  Info,
  AlertTriangle,
  Rocket
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
  const [placementHistory, setPlacementHistory] = useState<Array<{territoryId: string, territoryName: string}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCollectedThisTurn, setHasCollectedThisTurn] = useState(false);

  const myPlayer = gameState.players.find(p => p.id === currentUserId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  const myTerritories = myPlayer?.territories || [];
  const territoryOptions = myTerritories.map(tId => ({
    id: tId,
    territory: gameState.territories[tId],
    name: gameState.territories[tId]?.name || tId
  })).filter(t => t.territory);

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

  // ✅ FIX: Better phase detection based on game state
  useEffect(() => {
    if (!isMyTurn || !myPlayer) return;

    const playerUnitsToPlace = myPlayer.unitsToPlaceThisTurn || 0;
    const playerUnitsPlaced = myPlayer.unitsPlacedThisTurn || 0;

    console.log(`🔍 PHASE DETECTION DEBUG:`, {
      unitsToPlace: playerUnitsToPlace,
      unitsPlaced: playerUnitsPlaced,
      hasCollected: hasCollectedThisTurn,
      currentPhase: phase,
      gamePhase: gameState.currentPhase
    });

    if (playerUnitsToPlace > 0) {
      setHasCollectedThisTurn(true);
      setUnitsToPlace(playerUnitsToPlace);
      setUnitsPlaced(playerUnitsPlaced);
      
      if (playerUnitsPlaced >= playerUnitsToPlace) {
        console.log(`🎯 All units placed - showing confirm phase`);
        setPhase('confirm');
      } else {
        console.log(`🎯 Units need to be placed - showing deploy phase`);
        setPhase('deploy');
      }
    } else if (!hasCollectedThisTurn) {
      console.log(`🎯 No collection yet - showing collect phase`);
      setPhase('collect');
      setUnitsToPlace(income.totalUnits);
    }
}, [myPlayer?.unitsToPlaceThisTurn, myPlayer?.unitsPlacedThisTurn, isMyTurn, hasCollectedThisTurn]);

  // ✅ STREAMLINED: Single "Collect & Deploy" action
  const handleCollectAndStartDeploy = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      console.log(`🎯 Starting collect and deploy: ${income.energy} energy, ${income.totalUnits} units`);
      await onCollectAndStartDeploy(income.energy, income.totalUnits);
      setHasCollectedThisTurn(true);
      console.log(`✅ Collect and deploy initiated successfully`);
      // Don't manually set phase - let useEffect handle it based on game state
    } catch (error) {
      console.error('Failed to collect energy and start deployment:', error);
      alert(`Failed to start deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ ENHANCED: Unit placement with history tracking
  const handlePlaceUnitOnTerritory = async (territoryId: string) => {
    if (unitsPlaced >= unitsToPlace) {
      alert('You have already placed all your units!');
      return;
    }
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onPlaceUnit(territoryId);
      
      const territory = gameState.territories[territoryId];
      const territoryName = territory?.name || territoryId;
      
      // Update local state immediately for better UX
      setUnitsPlaced(prev => {
        const newPlaced = prev + 1;
        console.log(`✅ Locally updated units placed: ${newPlaced}/${unitsToPlace}`);
        return newPlaced;
      });
      setPlacementHistory(prev => [...prev, { territoryId, territoryName }]);
      
      console.log(`✅ Placed unit on ${territoryName}`);
    } catch (error) {
      console.error('Failed to place unit:', error);
      alert(`Failed to place unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FINAL: Confirm deployment complete and advance to next phase
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <Zap className="mx-auto text-yellow-500 mb-4" size={32} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Collect & Deploy Phase</h2>
            <p className="text-gray-600">
              Waiting for {currentPlayer?.name} to collect energy and deploy units...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        
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

        {/* ✅ DEBUG: Show current phase */}
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Phase: {phase} | Units: {unitsPlaced}/{unitsToPlace} | Collected: {hasCollectedThisTurn ? 'Yes' : 'No'}
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
                  +{income.spaceBaseBonusUnits} from bases
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
                <div className="flex justify-between font-semibold pt-1 border-t border-yellow-300">
                  <span>Total Energy</span>
                  <span>{income.energy}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Units</span>
                  <span>{income.totalUnits}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Phase-based Content */}
        <div className="space-y-4">
          
          {/* PHASE 1: Collect & Start Deploy */}
          {phase === 'collect' && (
            <div className="text-center space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Collect & Deploy?</h3>
                <p className="text-gray-600 mb-4">
                  You'll collect {income.energy} energy and deploy {income.totalUnits} units total
                  {income.spaceBaseBonusUnits > 0 && (
                    <span className="block text-purple-600 mt-1">
                      (including {income.spaceBaseBonusUnits} bonus units from your space bases)
                    </span>
                  )}
                </p>
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
          )}

          {/* PHASE 2: Deploy Units */}
          {phase === 'deploy' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Deploy Your Units</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Place {unitsToPlace} units on your territories ({unitsPlaced}/{unitsToPlace} placed)
                </p>
                
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {territoryOptions.map(({ id, territory, name }) => (
                    <button
                      key={id}
                      onClick={() => handlePlaceUnitOnTerritory(id)}
                      disabled={isProcessing}
                      className={`p-3 text-left border border-gray-200 rounded-lg transition-colors ${
                        isProcessing 
                          ? 'bg-gray-100 cursor-not-allowed'
                          : 'bg-white hover:bg-green-50 hover:border-green-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{name}</div>
                      <div className="text-xs text-gray-500">
                        {territory.machineCount} units
                        {territory.spaceBase === currentUserId && (
                          <span className="text-purple-600 ml-1">🚀</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Remaining units: {unitsToPlace - unitsPlaced}
                </div>
              </div>

              {/* Placement History */}
              {placementHistory.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Units Placed:</div>
                  <div className="space-y-1">
                    {placementHistory.map((placement, index) => (
                      <div key={index} className="text-xs text-gray-600 flex items-center">
                        <CheckCircle size={12} className="text-green-500 mr-2" />
                        {index + 1}. {placement.territoryName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 3: Confirm Complete */}
          {phase === 'confirm' && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Deployment Complete!</h3>
                <p className="text-gray-600 mb-4">
                  You've successfully placed all {unitsToPlace} units. Ready to move to Build & Hire phase?
                </p>
                
                {/* Final Summary */}
                <div className="bg-white rounded-lg p-3 mb-4">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Energy Collected:</span>
                      <span className="font-semibold text-yellow-600">+{income.energy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Units Deployed:</span>
                      <span className="font-semibold text-green-600">{unitsPlaced}</span>
                    </div>
                    {income.spaceBaseBonusUnits > 0 && (
                      <div className="flex justify-between text-purple-600">
                        <span>Space Base Bonus:</span>
                        <span>+{income.spaceBaseBonusUnits} units</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleConfirmComplete}
                  disabled={isProcessing}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 mx-auto ${
                    isProcessing 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <span>{isProcessing ? 'Advancing...' : 'Continue to Build & Hire'}</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Energy Display */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Energy:</span>
            <span className="font-semibold text-blue-600">{myPlayer?.energy || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectDeployOverlay;