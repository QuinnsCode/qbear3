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
  Dice1
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
  onConfirmConquest: (additionalUnits: number) => Promise<void>  // ✅ UPDATED: New method name
  onCancel: () => void
  onClose?: () => void
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
  onConfirmConquest,  // ✅ UPDATED: Use new method name
  onCancel,
  onClose 
}: InvasionOverlayProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState(1);
  const [selectedCommanders, setSelectedCommanders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ UPDATED: State management for new two-phase flow
  const [overlayState, setOverlayState] = useState<'selecting' | 'processing' | 'diceResults' | 'moveIn'>('selecting');
  const [persistentData, setPersistentData] = useState<any>(null);
  const processingRef = useRef(false);
  
  // UI state for overlays
  const [showDiceResults, setShowDiceResults] = useState(false);
  const [showMoveInSelection, setShowMoveInSelection] = useState(false);
  const [lastCombatResult, setLastCombatResult] = useState<any>(null);

  const myPlayer = gameState.players.find(p => p.id === currentUserId);
  const fromTerritory = gameState.territories[fromTerritoryId];
  const toTerritory = gameState.territories[toTerritoryId];
  const invasionStats = myPlayer?.invasionStats;

  // ✅ UPDATED: Detect pending conquest state from server
  useEffect(() => {
    const pendingConquest = gameState.pendingConquest;
    
    if (pendingConquest && 
        pendingConquest.playerId === currentUserId &&
        pendingConquest.fromTerritoryId === fromTerritoryId &&
        pendingConquest.toTerritoryId === toTerritoryId) {
      
      console.log('🎯 Server indicates pending conquest state detected:', pendingConquest);
      
      // Show dice results first if showDiceResults is true
      if (pendingConquest.showDiceResults) {
        console.log('📊 Showing dice results from server');
        setLastCombatResult(pendingConquest.combatResult);
        setShowDiceResults(true);
        setShowMoveInSelection(false);
        setOverlayState('diceResults');
      } else {
        // Move directly to move-in selection
        console.log('📦 Moving directly to move-in selection');
        setShowDiceResults(false);
        setShowMoveInSelection(true);
        setOverlayState('moveIn');
      }
    } else {
      // Only reset if we're NOT waiting for server response
      if (overlayState === 'diceResults' || overlayState === 'moveIn') {
        console.log('🔄 No pending conquest - resetting to selection');
        setShowDiceResults(false);
        setShowMoveInSelection(false);
        setOverlayState('selecting');
        setLastCombatResult(null);
      }
      // DO NOT reset while 'processing' - let the server response handle it
    }
  }, [gameState.pendingConquest, currentUserId, fromTerritoryId, toTerritoryId]);


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
        // ✅ UPDATED: Phase 1 - Resolve Combat
        console.log('🎯 Starting Phase 1: Resolve Combat');
        
        // Store the attack parameters for later phases
        setPersistentData({
          selectedUnits,
          selectedCommanders: [...selectedCommanders],
          targetDefenders: toTerritory.machineCount
        });
        
        // ✅ Call Phase 1: This will set pendingConquest on server
        await onInvade(selectedUnits, selectedCommanders);
        
        // ✅ Don't close overlay - server will set pendingConquest
        // useEffect will detect it and transition to dice results
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert(`${isTargetEmpty ? 'Movement' : 'Combat'} failed: ${error.message}`);
      setOverlayState('selecting');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // ✅ NEW: Handle dice results completion (transition to move-in)
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
      setOverlayState('selecting');
      setLastCombatResult(null);
      setPersistentData(null);
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

  // ✅ UPDATED: Show dice results overlay
  if (showDiceResults && gameState.pendingConquest && lastCombatResult) {
    const pc = gameState.pendingConquest;
    
    return (
      <DiceRollOverlay
        isVisible={true}
        fromTerritoryName={fromTerritory.name}
        toTerritoryName={toTerritory.name}
        attackingUnits={pc.originalAttackingUnits}
        defendingUnits={toTerritory.machineCount + pc.combatResult.defenderLosses}
        commanderTypes={pc.attackingCommanders}
        combatResult={pc.combatResult}
        territoryConquered={!!gameState.pendingConquest}  // ✅ ADD this - if pendingConquest exists, territory was conquered
        onComplete={handleDiceResultsComplete}
      />
    );
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

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center">
      <div className="bg-white/95 backdrop-blur-lg rounded-t-2xl sm:rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        
        {/* Header with processing state indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Sword className="text-red-500" size={28} />
            <h2 className="text-2xl font-bold text-gray-800">
              {overlayState === 'processing' ? 'Processing Attack...' :
               overlayState === 'diceResults' ? 'Combat Results' :
               overlayState === 'moveIn' ? 'Move-In Required' :
               isTargetEmpty ? 'Move Into Territory' : 'Invade Territory'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsHidden(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Hide overlay"
              disabled={overlayState !== 'selecting'}
            >
              <EyeOff size={20} />
            </button>
            <button 
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              disabled={overlayState === 'processing'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conquest Progress */}
        {invasionStats && (
          <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-lg p-4 mb-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Crown className="text-purple-600" size={20} />
                <div>
                  <div className="font-semibold text-gray-800">Conquest Progress</div>
                  <div className="text-sm text-gray-600">
                    {invasionStats.contestedTerritoriesTaken}/3 contested territories
                  </div>
                </div>
              </div>
              <div className="text-right">
                {invasionStats.conquestBonusEarned ? (
                  <div className="text-gold-600 font-bold flex items-center">
                    <Crown size={16} className="mr-1" />
                    Bonus Earned!
                  </div>
                ) : (
                  <div className="text-purple-600 font-bold">
                    {3 - invasionStats.contestedTerritoriesTaken} more needed
                  </div>
                )}
                {invasionStats.emptyTerritoriesClaimed > 0 && (
                  <div className="text-sm text-gray-500">
                    +{invasionStats.emptyTerritoriesClaimed} empty claimed
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attack Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="font-semibold text-gray-800">{fromTerritory.name}</div>
              <div className="text-sm text-gray-600">{fromTerritory.machineCount} units</div>
            </div>
            <div className="flex-1 flex items-center justify-center mx-4">
              <Target className="text-red-500" size={24} />
              <div className="h-px bg-red-300 flex-1 mx-2"></div>
              <Target className="text-red-500" size={24} />
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-800">{toTerritory.name}</div>
              <div className="text-sm text-gray-600">
                {isTargetEmpty ? (
                  <span className="text-green-600">Empty Territory</span>
                ) : (
                  `${toTerritory.machineCount} defenders`
                )}
                {toTerritory.type === 'water' && (
                  <span className="ml-1 text-blue-500">🌊</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Unit Selection */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">
            {isTargetEmpty ? 'Units to Move' : 'Attacking Units'}
          </h3>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => handleUnitChange(-1)}
              disabled={selectedUnits <= 1 || overlayState !== 'selecting'}
              className="p-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronDown size={20} />
            </button>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{selectedUnits}</div>
              <div className="text-sm text-gray-600">
                of {maxUnits} available
              </div>
            </div>
            
            <button
              onClick={() => handleUnitChange(1)}
              disabled={selectedUnits >= maxUnits || overlayState !== 'selecting'}
              className="p-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronUp size={20} />
            </button>
          </div>
          
          {maxUnits === 0 && (
            <div className="text-center text-red-600 mt-2">
              <AlertTriangle size={16} className="inline mr-1" />
              No units available (must leave 1 behind)
            </div>
          )}
        </div>

        {/* Commander Selection */}
        {availableCommanders.length > 0 && !isTargetEmpty && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Select Commanders</h3>
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
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent size={20} className={commander.color} />
                      <div className="text-left">
                        <div className="font-medium">{commander.label}</div>
                        <div className="text-sm opacity-75">
                          Rolls {commander.dice} dice
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {commander.dice === '8-sided' ? (
                        <Dice1 size={16} className="text-green-600" />
                      ) : (
                        <Dice6 size={16} className="text-yellow-600" />
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
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">
                    Naval Commander required for water territories
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attack Preview */}
        {!isTargetEmpty && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Attack Preview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Your Dice</div>
                <div className="text-lg font-bold text-blue-600">
                  {selectedUnits - selectedCommanders.length} regular + {selectedCommanders.length} commanders
                </div>
                <div className="text-xs text-gray-500">
                  {selectedCommanders.length > 0 ? (
                    `${selectedCommanders.map(c => COMMANDER_ICONS[c].dice).join(', ')} dice`
                  ) : (
                    '6-sided dice only'
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Defender Dice</div>
                <div className="text-lg font-bold text-red-600">
                  {Math.min(2, toTerritory.machineCount)} dice
                </div>
                <div className="text-xs text-gray-500">
                  Auto-maximized defense
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <button
            onClick={handleAction}
            disabled={!canExecuteAction()}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center space-x-2 ${
              canExecuteAction()
                ? isTargetEmpty
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
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
                    <Target size={24} />
                    <span>MOVE IN!</span>
                  </>
                ) : (
                  <>
                    <Sword size={24} />
                    <span>ATTACK!</span>
                  </>
                )}
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={overlayState === 'processing'}
            className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel {isTargetEmpty ? 'Movement' : 'Attack'}
          </button>
        </div>

        {/* Helpful Tips */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            <div className="font-medium mb-1">💡 Tips:</div>
            <ul className="space-y-1 text-xs">
              {isTargetEmpty ? (
                <li>• Moving into empty territory doesn't count toward contested bonus</li>
              ) : (
                <>
                  <li>• Contested territory conquest counts toward 3-territory bonus</li>
                  <li>• ✅ NEW: Attack force commits immediately, survivors must move in</li>
                  <li>• ✅ NEW: You can choose additional units to move after conquest</li>
                </>
              )}
              <li>• Must leave 1 unit behind in attacking territory</li>
              {requiresNaval && (
                <li className="text-blue-700">• Water territories require Naval Commander</li>
              )}
            </ul>
          </div>
        </div>

        {/* Processing State Indicator */}
        {overlayState !== 'selecting' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span className="text-sm font-medium">
                {overlayState === 'processing' && 'Sending attack to server...'}
                {overlayState === 'diceResults' && 'Showing combat results...'}
                {overlayState === 'moveIn' && 'Choose additional units to move in...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvasionOverlay;