// Refactored CollectDeployOverlay.tsx - Using BaseOverlay
'use client'

import React, { useState, useEffect } from 'react';
import { 
  Zap,
  Info,
  Rocket,
} from 'lucide-react';
import type { GameState, Player } from '@/app/lib/GameState';
import DeployPhaseBanner from '@/app/components/Game/GamePhases/DeployPhaseBanner';
import BaseOverlay from '@/app/components/Game/GameUIPieces/BaseOverlay';

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
  //we need to move this server side
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
    
    // ✅ TODO move this server side: Calculate continent bonus (import or define CONTINENTS)
    let continentalBonus = 0;
    const CONTINENTS = {
      'South America': { territories: [9, 10, 11, 12], bonus: 2 },
      'North America': { territories: [0, 1, 2, 3, 4, 5, 6, 7, 8], bonus: 5 },
      'Europe': { territories: [13, 14, 15, 16, 17, 18, 19], bonus: 5 },
      'Africa': { territories: [20, 21, 22, 23, 24, 25], bonus: 3 },
      'Asia': { territories: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37], bonus: 7 },
      'Australia': { territories: [38, 39, 40, 41], bonus: 2 },
      'US Pacific': { territories: [42, 43, 44], bonus: 2 },
      'Asia Pacific': { territories: [45, 46], bonus: 1 },
      'Southern Atlantic': { territories: [47, 48], bonus: 1 },
      'Northern Atlantic': { territories: [49, 50, 51], bonus: 2 },
      'Indian': { territories: [52, 53, 54], bonus: 2 }
    };
    
    for (const [name, continent] of Object.entries(CONTINENTS)) {
      const owns = continent.territories.every(id => 
        myPlayer.territories.includes(id.toString())
      );
      if (owns) {
        console.log(`✅ You control ${name} - Bonus: +${continent.bonus}`);
        continentalBonus += continent.bonus;
      }
    }
    
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
    return (
      <BaseOverlay
        isOpen={true}
        onClose={onClose}
        title="Collect & Deploy"
        icon={<Zap className="text-yellow-500" size={28} />}
        showCloseButton={!!onClose}
        size="md"
        position="center"
        closeOnBackdropClick={false}
        mobileFullscreen={false}
      >
        <CollectPhaseContent
          income={income}
          myPlayer={myPlayer}
          currentUserId={currentUserId}
          gameState={gameState}
          showDetails={showDetails}
          setShowDetails={setShowDetails}
          isProcessing={isProcessing}
          handleCollectAndStartDeploy={handleCollectAndStartDeploy}
        />
      </BaseOverlay>
    );
  }

  // ✅ STREAMLINED: Banner overlay for deploy and confirm phases
  return (
    <DeployPhaseBanner
      phase={phase}
      unitsPlaced={unitsPlaced}
      unitsToPlace={unitsToPlace}
      isProcessing={isProcessing}
      onConfirmComplete={handleConfirmComplete}
      onClose={onClose}
    />
  );
};

// ✅ Extracted CollectPhaseContent component for cleaner structure
interface CollectPhaseContentProps {
  income: ReturnType<typeof CollectDeployOverlay['prototype']['calculateIncomeAndUnits']>;
  myPlayer: Player | undefined;
  currentUserId: string;
  gameState: GameState;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
  isProcessing: boolean;
  handleCollectAndStartDeploy: () => Promise<void>;
}

const CollectPhaseContent = ({
  income,
  myPlayer,
  currentUserId,
  gameState,
  showDetails,
  setShowDetails,
  isProcessing,
  handleCollectAndStartDeploy,
}: CollectPhaseContentProps) => {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Income Summary */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm md:text-base">Your Turn Income</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs md:text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            disabled={isProcessing}
          >
            <Info size={14} />
            <span className="hidden sm:inline">{showDetails ? 'Hide' : 'Show'} Details</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{income.energy}</div>
            <div className="text-xs md:text-sm text-gray-600">Energy Points</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-green-600">{income.totalUnits}</div>
            <div className="text-xs md:text-sm text-gray-600">Total Units</div>
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
            <div className="text-xs md:text-sm space-y-1">
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

      {/* Action Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">Ready to Collect & Deploy?</h3>
        <p className="text-sm md:text-base text-gray-600 mb-4">
          You'll collect {income.energy} energy and deploy {income.totalUnits} units using the map below
          {income.spaceBaseBonusUnits > 0 && (
            <span className="block text-purple-600 mt-1">
              Your {income.details.spaceBases} space bases will automatically generate {income.spaceBaseBonusUnits} bonus units! 🚀
            </span>
          )}
        </p>
        
        {/* ✅ Show space base bonus deployments if any */}
        {income.spaceBaseBonusUnits > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
            <div className="text-xs md:text-sm font-medium text-purple-800 mb-2">Space Base Auto-Deployments:</div>
            <div className="space-y-1">
              {myPlayer?.territories.filter(tId => {
                const territory = gameState.territories[tId];
                return territory?.spaceBase === currentUserId;
              }).map(tId => {
                const territory = gameState.territories[tId];
                return (
                  <div key={tId} className="flex items-center justify-between text-xs md:text-sm">
                    <span className="flex items-center space-x-2">
                      <Rocket size={12} className="text-purple-500 flex-shrink-0" />
                      <span className="truncate">{territory.name}</span>
                    </span>
                    <span className="text-green-600 font-medium whitespace-nowrap ml-2">
                      +1 unit
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
          className={`
            w-full px-4 md:px-6 py-2 md:py-3 
            rounded-lg font-semibold transition-colors 
            flex items-center justify-center space-x-2
            text-sm md:text-base
            ${isProcessing 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          <Zap size={18} />
          <span>{isProcessing ? 'Processing...' : 'Collect & Start Deploy'}</span>
        </button>
      </div>
    </div>
  );
};

export default CollectDeployOverlay;