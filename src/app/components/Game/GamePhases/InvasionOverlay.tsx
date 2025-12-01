// app/components/Game/GamePhases/InvasionOverlay.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Sword, 
  Target, 
  ChevronUp, 
  ChevronDown,
  Mountain,
  User,
  Zap,
  Ship,
  Crown,
  AlertTriangle,
  Dice6,
  Dice1,
  Shield,
  Info
} from 'lucide-react';
import type { GameState, Territory, InvasionStats, Player, PendingConquest } from '@/app/lib/GameState';
import DiceRollOverlay from '@/app/components/Game/GamePhases/DiceRollOverlay';
import MoveInSelectionOverlay from '@/app/components/Game/GamePhases/MoveInSelectionOverlay';

interface InvasionOverlayProps {
  gameState: GameState
  currentUserId: string
  fromTerritoryId: string
  toTerritoryId: string
  onInvade: (attackingUnits: number, commanderTypes: string[]) => Promise<void>
  onMoveIntoEmpty: (movingUnits: number) => Promise<void>
  onConfirmConquest: (additionalUnits: number) => Promise<void>
  onCancel: () => void
  onClose?: () => void
  onAdvanceToFortify: () => Promise<void>
}

const COMMANDER_ICONS = {
  land: { icon: Mountain, label: 'Land', shortLabel: 'L', dice: '8', color: 'text-amber-600', bg: 'bg-amber-100' },
  diplomat: { icon: User, label: 'Diplomat', shortLabel: 'D', dice: '6', color: 'text-blue-600', bg: 'bg-blue-100' },
  nuclear: { icon: Zap, label: 'Nuclear', shortLabel: 'N', dice: '8', color: 'text-red-600', bg: 'bg-red-100' },
  naval: { icon: Ship, label: 'Naval', shortLabel: 'S', dice: '8', color: 'text-cyan-600', bg: 'bg-cyan-100' }
}

const InvasionOverlay = ({ 
  gameState, 
  currentUserId, 
  fromTerritoryId, 
  toTerritoryId,
  onInvade,
  onMoveIntoEmpty,
  onConfirmConquest,
  onCancel,
  onClose,
  onAdvanceToFortify
}: InvasionOverlayProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState(1);
  const [selectedCommanders, setSelectedCommanders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConquestInfo, setShowConquestInfo] = useState(false);
  
  const [overlayState, setOverlayState] = useState<'selecting' | 'processing' | 'diceResults' | 'moveIn'>('selecting');
  const [persistentData, setPersistentData] = useState<any>(null);
  const [attackInProgress, setAttackInProgress] = useState(false);
  const [lastAttackResult, setLastAttackResult] = useState<any>(null);
  const processingRef = useRef(false);
  
  const [showDiceResults, setShowDiceResults] = useState(false);
  const [showMoveInSelection, setShowMoveInSelection] = useState(false);
  const [lastCombatResult, setLastCombatResult] = useState<any>(null);

  const myPlayer = gameState.players.find(p => p.id === currentUserId);
  const fromTerritory = gameState.territories[fromTerritoryId];
  const toTerritory = gameState.territories[toTerritoryId];
  const invasionStats = myPlayer?.invasionStats;

  console.log('🔍 InvasionOverlay render - pendingConquest:', gameState.pendingConquest);

  useEffect(() => {
    const pendingConquest = gameState.pendingConquest;
    const invasionStats = myPlayer?.invasionStats;
    
    console.log('🔍 Game state change detected:', {
      pendingConquest: !!pendingConquest,
      attackInProgress,
      overlayState,
      lastInvasionResult: invasionStats?.lastInvasionResults?.[0]
    });
    
    if (pendingConquest && pendingConquest.playerId === currentUserId) {
      if (pendingConquest.fromTerritoryId === fromTerritoryId && 
          pendingConquest.toTerritoryId === toTerritoryId) {
        
        console.log('✅ Attack succeeded - territory conquered');
        setAttackInProgress(false);
        
        if (pendingConquest.showDiceResults) {
          setLastCombatResult(pendingConquest.combatResult);
          setShowDiceResults(true);
          setShowMoveInSelection(false);
          setOverlayState('diceResults');
        } else {
          setShowDiceResults(false);
          setShowMoveInSelection(true);
          setOverlayState('moveIn');
        }
      }
    } else if (attackInProgress && invasionStats?.lastInvasionResults && invasionStats.lastInvasionResults.length > 0) {
      const latestResult = invasionStats.lastInvasionResults[0];
      
      if (latestResult.fromTerritoryId === fromTerritoryId && 
          latestResult.toTerritoryId === toTerritoryId &&
          !latestResult.territoryConquered) {
        
        console.log('❌ Attack failed - defenders survived');
        console.log('Failed attack result:', latestResult);
        
        setLastAttackResult(latestResult);
        setLastCombatResult({
          attackerDice: latestResult.attackerDice,
          defenderDice: latestResult.defenderDice,
          attackerLosses: latestResult.attackerLosses,
          defenderLosses: latestResult.defenderLosses,
          attackerUnitsRemaining: latestResult.attackingUnits - latestResult.attackerLosses
        });
        
        setAttackInProgress(false);
        setShowDiceResults(true);
        setShowMoveInSelection(false);
        setOverlayState('diceResults');
      }
    } else if (!pendingConquest && !attackInProgress) {
      if (overlayState === 'diceResults' || overlayState === 'moveIn') {
        console.log('🧹 Cleaning up overlay state');
        setShowDiceResults(false);
        setShowMoveInSelection(false);
        setOverlayState('selecting');
        setLastCombatResult(null);
        setLastAttackResult(null);
      }
    }
  }, [gameState.pendingConquest, gameState.players, attackInProgress, fromTerritoryId, toTerritoryId, currentUserId]);

  useEffect(() => {
    console.log('🔍 pendingConquest changed:', gameState.pendingConquest);
  }, [gameState.pendingConquest]);

  const availableUnits = Math.max(0, fromTerritory.machineCount - 1);
  const maxUnits = Math.min(3, availableUnits);

  const availableCommanders = [
    fromTerritory.landCommander === currentUserId && 'land',
    fromTerritory.diplomatCommander === currentUserId && 'diplomat', 
    fromTerritory.nuclearCommander === currentUserId && 'nuclear',
    fromTerritory.navalCommander === currentUserId && 'naval'
  ].filter(Boolean) as string[];

  const isTargetEmpty = toTerritory.machineCount === 0;
  const requiresNaval = toTerritory.type === 'water';
  const hasNavalCommander = selectedCommanders.includes('naval') || availableCommanders.includes('naval');
  const navalValidation = !requiresNaval || hasNavalCommander;

  useEffect(() => {
    if (!processingRef.current && overlayState === 'selecting') {
      setSelectedUnits(Math.min(1, maxUnits));
      setSelectedCommanders([]);
    }
  }, [fromTerritoryId, toTerritoryId, maxUnits, overlayState]);

  useEffect(() => {
    if (selectedUnits > maxUnits && overlayState === 'selecting') {
      setSelectedUnits(maxUnits);
    }
  }, [maxUnits, selectedUnits, overlayState]);

  const handleUnitChange = (delta: number) => {
    if (overlayState !== 'selecting') return;
    const newValue = Math.max(1, Math.min(maxUnits, selectedUnits + delta));
    setSelectedUnits(newValue);
  };

  const toggleCommander = (commanderType: string) => {
    if (overlayState !== 'selecting') return;
    setSelectedCommanders(prev => 
      prev.includes(commanderType)
        ? prev.filter(c => c !== commanderType)
        : [...prev, commanderType]
    );
  };

  const handleAction = async () => {
    if (isProcessing || overlayState !== 'selecting') return;
    
    setIsProcessing(true);
    processingRef.current = true;
    setOverlayState('processing');
    
    try {
      if (isTargetEmpty) {
        await onMoveIntoEmpty(selectedUnits);
        onCancel();
      } else {
        console.log('🎯 Starting Phase 1: Resolve Combat');
        setAttackInProgress(true);
        
        setPersistentData({
          selectedUnits,
          selectedCommanders: [...selectedCommanders],
          targetDefenders: toTerritory.machineCount
        });
        
        await onInvade(selectedUnits, selectedCommanders);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert(`${isTargetEmpty ? 'Movement' : 'Combat'} failed: ${error.message}`);
      
      setAttackInProgress(false);
      setOverlayState('selecting');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleDiceResultsComplete = () => {
    const pendingConquest = gameState.pendingConquest;
    
    if (pendingConquest && pendingConquest.playerId === currentUserId) {
      console.log('🎯 Dice results complete - transitioning to move-in selection');
      setShowDiceResults(false);
      setShowMoveInSelection(true);
      setOverlayState('moveIn');
    } else {
      console.log('🎯 Dice results complete - attack failed, returning to selection');
      setShowDiceResults(false);
      setShowMoveInSelection(false);
      setOverlayState('selecting');
      setLastCombatResult(null);
      setLastAttackResult(null);
      setPersistentData(null);
    }
  };

  const handleMoveInConfirmation = async (additionalUnits: number) => {
    try {
      console.log('📦 Phase 2: Confirming conquest with additional units:', additionalUnits);
      
      await onConfirmConquest(additionalUnits);
      
      setShowMoveInSelection(false);
      setShowDiceResults(false);
      setLastCombatResult(null);
      setPersistentData(null);
      setOverlayState('selecting');
      onCancel();
    } catch (error) {
      console.error('Move-in confirmation failed:', error);
      alert(`Failed to confirm conquest: ${error.message}`);
    }
  };

  const handleMoveInCancel = () => {
    console.log('⚠️ Move-in cancelled - this should not happen with mandatory conquest');
    setShowMoveInSelection(false);
    setShowDiceResults(false);
    setLastCombatResult(null);
    setPersistentData(null);
    setOverlayState('selecting');
    onCancel();
  };

  const canExecuteAction = () => {
    return overlayState === 'selecting' &&
           selectedUnits > 0 && 
           selectedUnits <= maxUnits && 
           navalValidation &&
           !isProcessing;
  };

  if (showMoveInSelection && gameState.pendingConquest) {
    const pc = gameState.pendingConquest;
    
    return (
      <MoveInSelectionOverlay
        isVisible={true}
        fromTerritoryName={fromTerritory.name}
        toTerritoryName={toTerritory.name}
        conqueredTerritoryId={toTerritoryId}
        requiredUnits={pc.minimumMoveIn}
        availableUnits={pc.availableForAdditionalMoveIn}
        commandersMoving={pc.attackingCommanders}
        onConfirmMoveIn={handleMoveInConfirmation}
        onCancel={handleMoveInCancel}
      />
    );
  }

  if (showDiceResults && lastCombatResult) {
    const pc = gameState.pendingConquest;
    const failedResult = lastAttackResult;
    
    if (pc && pc.playerId === currentUserId) {
      return (
        <DiceRollOverlay
          isVisible={true}
          fromTerritoryName={fromTerritory.name}
          toTerritoryName={toTerritory.name}
          attackingUnits={pc.originalAttackingUnits}
          defendingUnits={toTerritory.machineCount + pc.combatResult.defenderLosses}
          commanderTypes={pc.attackingCommanders}
          combatResult={pc.combatResult}
          territoryConquered={true}
          onComplete={handleDiceResultsComplete}
        />
      );
    } else if (failedResult) {
      return (
        <DiceRollOverlay
          isVisible={true}
          fromTerritoryName={fromTerritory.name}
          toTerritoryName={toTerritory.name}
          attackingUnits={failedResult.attackingUnits}
          defendingUnits={failedResult.defendingUnits}
          commanderTypes={failedResult.commandersUsed}
          combatResult={lastCombatResult}
          territoryConquered={false}
          onComplete={handleDiceResultsComplete}
        />
      );
    }
  }

  if (isHidden) {
    return (
      <div className="absolute top-16 right-4 z-50">
        <button
          onClick={() => setIsHidden(false)}
          className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <Sword size={20} />
        </button>
      </div>
    );
  }

  // 🎯 COMPACT MOBILE-FIRST DESIGN
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Compact Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 border-b bg-gradient-to-r from-red-50 to-blue-50 rounded-t-3xl sm:rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <Sword className="text-red-500" size={20} />
            <h2 className="text-base font-bold text-gray-800">
              {isTargetEmpty ? 'Move Units' : 'Attack'}
            </h2>
          </div>
          
          {/* Conquest Progress - Compact with Info Popup */}
          {invasionStats && !isTargetEmpty && (
            <div className="relative">
              <button
                onClick={() => setShowConquestInfo(!showConquestInfo)}
                className="flex items-center space-x-1 px-2 py-1 bg-purple-100 rounded-full text-xs font-medium text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <Crown size={12} />
                <span>{invasionStats.contestedTerritoriesTaken}/3</span>
                <Info size={12} />
              </button>
              
              {/* Info Popup */}
              {showConquestInfo && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-purple-300 rounded-lg shadow-lg p-2 z-70">
                  <div className="text-xs text-gray-700">
                    <div className="font-bold text-purple-700 mb-1">Turn Territory Bonus</div>
                    <div>Conquer <span className="font-bold">3 territories</span> to earn bonus reinforcements</div>
                    <div className="mt-1 text-purple-600">
                      {invasionStats.conquestBonusEarned ? '✅ Bonus earned!' : `${3 - invasionStats.contestedTerritoriesTaken} more needed`}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConquestInfo(false)}
                    className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            disabled={overlayState === 'processing'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Compact Battle Overview */}
          <div className="bg-gradient-to-r from-red-50 via-gray-50 to-blue-50 rounded-lg p-3 border">
            <div className="grid grid-cols-3 gap-2 items-center text-center">
              {/* Attacker */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">{fromTerritory.name}</div>
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <Sword className="text-red-600" size={14} />
                  <span className="text-lg font-bold text-gray-900">{selectedUnits}</span>
                </div>
                {selectedCommanders.length > 0 && (
                  <div className="text-xs text-amber-600 font-medium mb-0.5">+{selectedCommanders.length}C</div>
                )}
                <div className="text-xs text-gray-500">
                  of {fromTerritory.machineCount} units
                </div>
              </div>

              {/* VS */}
              <div>
                <div className="text-xl mb-1">⚔️</div>
                <div className="text-xs text-gray-500">
                  {isTargetEmpty ? 'Empty' : 'Battle'}
                </div>
              </div>

              {/* Defender */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">{toTerritory.name}</div>
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <Shield className="text-blue-600" size={14} />
                  <span className="text-lg font-bold text-gray-900">{toTerritory.machineCount}</span>
                </div>
                {!isTargetEmpty && (
                  <div className="text-xs text-blue-600 mb-0.5">{Math.min(2, toTerritory.machineCount)} dice</div>
                )}
                <div className="text-xs text-gray-500">
                  {isTargetEmpty ? 'no defenders' : 'total defenders'}
                </div>
              </div>
            </div>
          </div>

          {/* Compact Unit Selection */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Units</span>
              <span className="text-xs text-gray-500">{selectedUnits} of {maxUnits}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleUnitChange(-1)}
                disabled={selectedUnits <= 1 || overlayState !== 'selecting'}
                className="w-8 h-8 bg-white border rounded-lg disabled:opacity-50 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronDown size={16} />
              </button>
              
              <div className="flex-1 flex gap-1">
                {[1, 2, 3].filter(n => n <= maxUnits).map(num => (
                  <button
                    key={num}
                    onClick={() => setSelectedUnits(num)}
                    disabled={overlayState !== 'selecting'}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      selectedUnits === num 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-blue-600 border hover:bg-blue-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handleUnitChange(1)}
                disabled={selectedUnits >= maxUnits || overlayState !== 'selecting'}
                className="w-8 h-8 bg-white border rounded-lg disabled:opacity-50 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            {maxUnits === 0 && (
              <div className="text-center text-red-600 mt-2 text-xs flex items-center justify-center space-x-1">
                <AlertTriangle size={12} />
                <span>No units (must leave 1)</span>
              </div>
            )}
          </div>

          {/* Compact Commander Selection */}
          {availableCommanders.length > 0 && !isTargetEmpty && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Commanders</div>
              <div className="grid grid-cols-2 gap-2">
                {availableCommanders.map((commanderType) => {
                  const commander = COMMANDER_ICONS[commanderType];
                  const IconComponent = commander.icon;
                  const isSelected = selectedCommanders.includes(commanderType);
                  
                  return (
                    <button
                      key={commanderType}
                      onClick={() => toggleCommander(commanderType)}
                      disabled={overlayState !== 'selecting'}
                      className={`p-2 rounded-lg border transition-all flex items-center justify-between disabled:opacity-50 ${
                        isSelected 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                          isSelected ? 'bg-red-600 text-white' : commander.bg
                        }`}>
                          <IconComponent size={12} />
                        </div>
                        <span className="text-xs font-medium">{commander.label}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                          commander.dice === '8' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {commander.dice}
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {requiresNaval && !hasNavalCommander && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-1">
                  <AlertTriangle size={12} />
                  <span>Naval Commander required for water</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Action Buttons - Sticky Bottom */}
        <div className="flex-shrink-0 p-3 border-t space-y-2 bg-white sticky bottom-0">
          <button
            onClick={handleAction}
            disabled={!canExecuteAction()}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2 ${
              canExecuteAction()
                ? isTargetEmpty
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isTargetEmpty ? (
                  <>
                    <Target size={18} />
                    <span>MOVE IN</span>
                  </>
                ) : (
                  <>
                    <Sword size={18} />
                    <span>ATTACK</span>
                  </>
                )}
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={overlayState === 'processing'}
            className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvasionOverlay;