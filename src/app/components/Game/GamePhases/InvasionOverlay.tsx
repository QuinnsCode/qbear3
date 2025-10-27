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
  Shield
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
  onAdvanceToFortify: () => Promise<void>  // ✅ ADD THIS LINE
}

const COMMANDER_ICONS = {
  land: { icon: Mountain, label: 'Land Commander', dice: '8-sided', color: 'text-amber-600' },
  diplomat: { icon: User, label: 'Diplomat', dice: '6-sided', color: 'text-blue-600' },
  nuclear: { icon: Zap, label: 'Nuclear Commander', dice: '8-sided', color: 'text-red-600' },
  naval: { icon: Ship, label: 'Naval Commander', dice: '8-sided', color: 'text-cyan-600' }
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
  onAdvanceToFortify  // ✅ ADD THIS LINE
}: InvasionOverlayProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState(1);
  const [selectedCommanders, setSelectedCommanders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ UPDATED: State management for new two-phase flow
  const [overlayState, setOverlayState] = useState<'selecting' | 'processing' | 'diceResults' | 'moveIn'>('selecting');
  const [persistentData, setPersistentData] = useState<any>(null);
  const [attackInProgress, setAttackInProgress] = useState(false);
  const [lastAttackResult, setLastAttackResult] = useState<any>(null);
  const processingRef = useRef(false);
  
  // UI state for overlays
  const [showDiceResults, setShowDiceResults] = useState(false);
  const [showMoveInSelection, setShowMoveInSelection] = useState(false);
  const [lastCombatResult, setLastCombatResult] = useState<any>(null);

  const myPlayer = gameState.players.find(p => p.id === currentUserId);
  const fromTerritory = gameState.territories[fromTerritoryId];
  const toTerritory = gameState.territories[toTerritoryId];
  const invasionStats = myPlayer?.invasionStats;

  console.log('🔍 InvasionOverlay render - pendingConquest:', gameState.pendingConquest);

  // ✅ UPDATED: Detect pending conquest state from server
  // ✅ FIXED: Detect both successful and failed attacks
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
      // ✅ SUCCESSFUL ATTACK: Territory conquered
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
      // ✅ FAILED ATTACK DETECTION: Check latest invasion result
      const latestResult = invasionStats.lastInvasionResults[0];
      
      // Check if this result matches our current attack
      if (latestResult.fromTerritoryId === fromTerritoryId && 
          latestResult.toTerritoryId === toTerritoryId &&
          !latestResult.territoryConquered) {
        
        console.log('❌ Attack failed - defenders survived');
        console.log('Failed attack result:', latestResult);
        
        // ✅ SHOW FAILED ATTACK RESULTS
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
      // ✅ CLEAN UP: No pending conquest and no attack in progress
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

  // Calculate available units (must leave 1 behind)
  const availableUnits = Math.max(0, fromTerritory.machineCount - 1);
  const maxUnits = Math.min(3, availableUnits);

  // Detect available commanders in source territory
  const availableCommanders = [
    fromTerritory.landCommander === currentUserId && 'land',
    fromTerritory.diplomatCommander === currentUserId && 'diplomat', 
    fromTerritory.nuclearCommander === currentUserId && 'nuclear',
    fromTerritory.navalCommander === currentUserId && 'naval'
  ].filter(Boolean) as string[];

  // Check if target territory is empty
  const isTargetEmpty = toTerritory.machineCount === 0;
  
  // Check if naval commander required for water territory
  const requiresNaval = toTerritory.type === 'water';
  const hasNavalCommander = selectedCommanders.includes('naval') || availableCommanders.includes('naval');
  const navalValidation = !requiresNaval || hasNavalCommander;

  // Initialize selection when overlay opens
  useEffect(() => {
    if (!processingRef.current && overlayState === 'selecting') {
      setSelectedUnits(Math.min(1, maxUnits));
      setSelectedCommanders([]);
    }
  }, [fromTerritoryId, toTerritoryId, maxUnits, overlayState]);

  // Adjust units if max changes
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

   // ✅ FIXED: Handle action with proper attack tracking
  const handleAction = async () => {
    if (isProcessing || overlayState !== 'selecting') return;
    
    setIsProcessing(true);
    processingRef.current = true;
    setOverlayState('processing');
    
    try {
      if (isTargetEmpty) {
        // ✅ Empty territory movement (unchanged)
        await onMoveIntoEmpty(selectedUnits);
        onCancel(); // Close overlay after successful empty territory move
      } else {
        // ✅ FIXED: Track attack in progress
        console.log('🎯 Starting Phase 1: Resolve Combat');
        setAttackInProgress(true);
        
        // Store the attack parameters for later phases
        setPersistentData({
          selectedUnits,
          selectedCommanders: [...selectedCommanders],
          targetDefenders: toTerritory.machineCount
        });
        
        // ✅ Call Phase 1: This will either set pendingConquest (success) or update invasionStats (failure)
        await onInvade(selectedUnits, selectedCommanders);
        
        // ✅ Don't reset state here - let useEffect handle success/failure detection
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert(`${isTargetEmpty ? 'Movement' : 'Combat'} failed: ${error.message}`);
      
      // ✅ RESET STATE on error
      setAttackInProgress(false);
      setOverlayState('selecting');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // ✅ FIXED: Handle dice results completion with failed attack support
  const handleDiceResultsComplete = () => {
    const pendingConquest = gameState.pendingConquest;
    
    if (pendingConquest && pendingConquest.playerId === currentUserId) {
      // ✅ SUCCESSFUL ATTACK: Transition to move-in
      console.log('🎯 Dice results complete - transitioning to move-in selection');
      setShowDiceResults(false);
      setShowMoveInSelection(true);
      setOverlayState('moveIn');
    } else {
      // ✅ FAILED ATTACK: Reset to selection
      console.log('🎯 Dice results complete - attack failed, returning to selection');
      setShowDiceResults(false);
      setShowMoveInSelection(false);
      setOverlayState('selecting');
      setLastCombatResult(null);
      setLastAttackResult(null);
      setPersistentData(null);
      
      // ✅ Don't close overlay - let player try again or manually close
    }
  };

  // ✅ UPDATED: Handle move-in confirmation (Phase 2)
  const handleMoveInConfirmation = async (additionalUnits: number) => {
    try {
      console.log('📦 Phase 2: Confirming conquest with additional units:', additionalUnits);
      
      // ✅ Call Phase 2: This will complete the conquest
      await onConfirmConquest(additionalUnits);
      
      // ✅ Reset all state and close overlay
      setShowMoveInSelection(false);
      setShowDiceResults(false);
      setLastCombatResult(null);
      setPersistentData(null);
      setOverlayState('selecting');
      onCancel(); // Close the entire invasion overlay
    } catch (error) {
      console.error('Move-in confirmation failed:', error);
      alert(`Failed to confirm conquest: ${error.message}`);
    }
  };

  const handleMoveInCancel = () => {
    // ✅ Player cancelled move-in - this shouldn't happen in the new system
    // since conquest is mandatory, but we'll handle it gracefully
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

  // ✅ UPDATED: Show move-in selection overlay
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

  // ✅ FIXED: Show dice results overlay with support for failed attacks
  if (showDiceResults && lastCombatResult) {
    const pc = gameState.pendingConquest;
    const failedResult = lastAttackResult;
    
    // ✅ Handle both successful and failed attacks
    if (pc && pc.playerId === currentUserId) {
      // Successful attack - show conquest results
      return (
        <DiceRollOverlay
          isVisible={true}
          fromTerritoryName={fromTerritory.name}
          toTerritoryName={toTerritory.name}
          attackingUnits={pc.originalAttackingUnits}
          defendingUnits={toTerritory.machineCount + pc.combatResult.defenderLosses}
          commanderTypes={pc.attackingCommanders}
          combatResult={pc.combatResult}
          territoryConquered={true}  // Territory was conquered
          onComplete={handleDiceResultsComplete}
        />
      );
    } else if (failedResult) {
      // Failed attack - show failure results
      return (
        <DiceRollOverlay
          isVisible={true}
          fromTerritoryName={fromTerritory.name}
          toTerritoryName={toTerritory.name}
          attackingUnits={failedResult.attackingUnits}
          defendingUnits={failedResult.defendingUnits}
          commanderTypes={failedResult.commandersUsed}
          combatResult={lastCombatResult}
          territoryConquered={false}  // Territory was NOT conquered
          onComplete={handleDiceResultsComplete}
        />
      );
    }
  }

  if (isHidden) {
    // Minimized view - small floating button
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

  // Improved InvasionOverlay - Mobile-First with Better Battle Visualization

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header - Compact on mobile */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-lg border-b p-4 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sword className="text-red-500" size={24} />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                {overlayState === 'processing' ? 'Attacking...' :
                overlayState === 'diceResults' ? 'Battle Results' :
                overlayState === 'moveIn' ? 'Move Forces' :
                isTargetEmpty ? 'Move Units' : 'Plan Attack'}
              </h2>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              disabled={overlayState === 'processing'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Battle Overview - Improved Visual */}
          <div className="bg-gradient-to-r from-red-50 via-gray-50 to-blue-50 rounded-xl p-4 border">
            <div className="grid grid-cols-3 gap-2 items-center">
              {/* Attacker Side */}
              <div className="text-center">
                <div className="bg-red-100 rounded-lg p-3 mb-2">
                  <Sword className="text-red-600 mx-auto mb-1" size={20} />
                  <div className="font-bold text-gray-900 text-sm">{fromTerritory.name}</div>
                  <div className="text-xs text-gray-600">
                    {fromTerritory.machineCount} units
                  </div>
                </div>
                
                {/* Show attacking force breakdown */}
                <div className="text-xs space-y-1">
                  <div className="font-medium text-red-700">Attacking:</div>
                  <div className="text-gray-600">{selectedUnits} total</div>
                  {selectedCommanders.length > 0 && (
                    <div className="text-amber-600">
                      +{selectedCommanders.length} commanders
                    </div>
                  )}
                </div>
              </div>

              {/* VS Section */}
              <div className="text-center">
                <div className="text-2xl mb-1">⚔️</div>
                <div className="text-xs font-bold text-gray-700">BATTLE</div>
                <div className="text-xs text-gray-500 mt-1">
                  {isTargetEmpty ? 'Unopposed' : 'Combat'}
                </div>
              </div>

              {/* Defender Side */}
              <div className="text-center">
                <div className="bg-blue-100 rounded-lg p-3 mb-2">
                  <Shield className="text-blue-600 mx-auto mb-1" size={20} />
                  <div className="font-bold text-gray-900 text-sm">{toTerritory.name}</div>
                  <div className="text-xs text-gray-600">
                    {toTerritory.machineCount} defenders
                  </div>
                </div>
                
                {/* Show defender capabilities */}
                <div className="text-xs space-y-1">
                  <div className="font-medium text-blue-700">
                    {isTargetEmpty ? 'Empty' : 'Defending:'}
                  </div>
                  {!isTargetEmpty && (
                    <>
                      <div className="text-gray-600">
                        {Math.min(2, toTerritory.machineCount)} dice
                      </div>
                      <div className="text-green-600">Auto-optimal</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Battle Odds Preview */}
            {!isTargetEmpty && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-center text-gray-600 mb-2">Expected Casualties</div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="text-center">
                    <div className="text-red-600 font-bold">~{Math.ceil(selectedUnits * 0.3)}</div>
                    <div className="text-gray-500">attacker losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-600 font-bold">~{Math.ceil(toTerritory.machineCount * 0.4)}</div>
                    <div className="text-gray-500">defender losses</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conquest Progress - Condensed */}
          {invasionStats && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Crown className="text-purple-600" size={16} />
                  <span className="text-sm font-medium">Progress: {invasionStats.contestedTerritoriesTaken}/3</span>
                </div>
                <div className="text-xs text-purple-600">
                  {invasionStats.conquestBonusEarned ? '✅ Bonus!' : `${3 - invasionStats.contestedTerritoriesTaken} needed`}
                </div>
              </div>
            </div>
          )}

          {/* Unit Selection - Mobile Optimized */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">
              {isTargetEmpty ? 'Units to Move' : 'Attack Force Size'}
            </h3>
            
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => handleUnitChange(-1)}
                disabled={selectedUnits <= 1 || overlayState !== 'selecting'}
                className="w-10 h-10 bg-white border-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center justify-center"
              >
                <ChevronDown size={18} />
              </button>
              
              <div className="text-center flex-1 mx-4">
                <div className="text-3xl font-bold text-blue-600">{selectedUnits}</div>
                <div className="text-xs text-gray-600">of {maxUnits} available</div>
              </div>
              
              <button
                onClick={() => handleUnitChange(1)}
                disabled={selectedUnits >= maxUnits || overlayState !== 'selecting'}
                className="w-10 h-10 bg-white border-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center justify-center"
              >
                <ChevronUp size={18} />
              </button>
            </div>

            {/* Quick select buttons */}
            <div className="flex gap-2">
              {[1, 2, 3].filter(n => n <= maxUnits).map(num => (
                <button
                  key={num}
                  onClick={() => setSelectedUnits(num)}
                  disabled={overlayState !== 'selecting'}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedUnits === num 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {maxUnits === 0 && (
              <div className="text-center text-red-600 mt-2 text-sm">
                <AlertTriangle size={14} className="inline mr-1" />
                No units available (must leave 1 behind)
              </div>
            )}
          </div>

          {/* Commander Selection - Compact Cards */}
          {availableCommanders.length > 0 && !isTargetEmpty && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Add Commanders</h3>
              <div className="space-y-2">
                {availableCommanders.map((commanderType) => {
                  const commander = COMMANDER_ICONS[commanderType];
                  const IconComponent = commander.icon;
                  const isSelected = selectedCommanders.includes(commanderType);
                  
                  return (
                    <button
                      key={commanderType}
                      onClick={() => toggleCommander(commanderType)}
                      disabled={overlayState !== 'selecting'}
                      className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between disabled:opacity-50 ${
                        isSelected 
                          ? 'border-red-500 bg-red-50 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-red-600 text-white' : 'bg-gray-100'
                        }`}>
                          <IconComponent size={16} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm">{commander.label}</div>
                          <div className="text-xs text-gray-500">
                            {commander.dice} dice
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {commander.dice === '8-sided' ? (
                          <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-green-700">8</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-yellow-700">6</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {requiresNaval && !hasNavalCommander && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-medium">
                      Naval Commander required for water territories
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dice Preview - Mobile Friendly */}
          {!isTargetEmpty && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Battle Preview</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Your Dice</div>
                  <div className="flex justify-center space-x-1 mb-1">
                    {Array.from({length: selectedUnits - selectedCommanders.length}).map((_, i) => (
                      <div key={i} className="w-6 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">6</div>
                    ))}
                    {selectedCommanders.map((c, i) => (
                      <div key={i} className="w-6 h-6 bg-amber-500 rounded text-white text-xs flex items-center justify-center font-bold">
                        {COMMANDER_ICONS[c].dice === '8-sided' ? '8' : '6'}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedUnits} total dice
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Enemy Dice</div>
                  <div className="flex justify-center space-x-1 mb-1">
                    {Array.from({length: Math.min(2, toTerritory.machineCount)}).map((_, i) => (
                      <div key={i} className="w-6 h-6 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">6</div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.min(2, toTerritory.machineCount)} defending dice
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Sticky Bottom */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
          <button
            onClick={handleAction}
            disabled={!canExecuteAction()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center space-x-2 ${
              canExecuteAction()
                ? isTargetEmpty
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isTargetEmpty ? (
                  <>
                    <Target size={20} />
                    <span>MOVE IN</span>
                  </>
                ) : (
                  <>
                    <Sword size={20} />
                    <span>ATTACK</span>
                  </>
                )}
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={overlayState === 'processing'}
            className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 text-sm"
          >
            Cancel {isTargetEmpty ? 'Movement' : 'Attack'}
          </button>

          {/* Quick Tips - Collapsible on mobile */}
          <details className="text-xs">
            <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
              Battle Tips
            </summary>
            <div className="mt-2 p-2 bg-yellow-50 rounded border text-yellow-800">
              <ul className="space-y-1">
                {!isTargetEmpty ? (
                  <>
                    <li>• Ties go to defender</li>
                    <li>• Commanders roll better dice</li>
                    <li>• Must leave 1 unit behind</li>
                  </>
                ) : (
                  <li>• Empty territories don't count toward bonus</li>
                )}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default InvasionOverlay;