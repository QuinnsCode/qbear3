// app/components/Game/GamePhases/InvasionOverlay.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Sword, 
  Target, 
  ChevronUp, 
  ChevronDown,
  Mountain,     // Land Commander
  User,         // Diplomat  
  Zap,          // Nuclear
  Ship,         // Naval
  Crown,        // Victory bonus
  AlertTriangle,
  Dice6,
  Dice1
} from 'lucide-react';
import type { GameState, Territory, InvasionStats, Player, Card } from '@/app/lib/GameState';
import DiceRollOverlay from '@/app/components/Game/GamePhases/DiceRollOverlay';
import MoveInSelectionOverlay from '@/app/components/Game/GamePhases/MoveInSelectionOverlay';

interface InvasionOverlayProps {
  gameState: GameState
  currentUserId: string
  fromTerritoryId: string
  toTerritoryId: string
  onInvade: (attackingUnits: number, commanderTypes: string[]) => Promise<void>
  onMoveIntoEmpty: (movingUnits: number) => Promise<void>
  onConfirmMoveIn: (additionalUnits: number) => Promise<void>
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
  onConfirmMoveIn,
  onCancel,
  onClose 
}: InvasionOverlayProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState(1);
  const [selectedCommanders, setSelectedCommanders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simple state management without complex useEffects
  const [showDiceAnimation, setShowDiceAnimation] = useState(false);
  const [showMoveInSelection, setShowMoveInSelection] = useState(false);
  const [lastCombatResult, setLastCombatResult] = useState<any>(null);
  const [conquestData, setConquestData] = useState<{
    requiredUnits: number;
    availableUnits: number;
    commandersMoving: string[];
  } | null>(null);

  const myPlayer = gameState.players.find(p => p.id === currentUserId);
  const fromTerritory = gameState.territories[fromTerritoryId];
  const toTerritory = gameState.territories[toTerritoryId];
  const invasionStats = myPlayer?.invasionStats;

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

  // Reset selection when territories change
  useEffect(() => {
    setSelectedUnits(Math.min(1, maxUnits));
    setSelectedCommanders([]);
  }, [fromTerritoryId, toTerritoryId, maxUnits]);

  // Adjust units if max changes
  useEffect(() => {
    if (selectedUnits > maxUnits) {
      setSelectedUnits(maxUnits);
    }
  }, [maxUnits, selectedUnits]);

  const handleUnitChange = (delta: number) => {
    const newValue = Math.max(1, Math.min(maxUnits, selectedUnits + delta));
    setSelectedUnits(newValue);
  };

  const toggleCommander = (commanderType: string) => {
    setSelectedCommanders(prev => 
      prev.includes(commanderType)
        ? prev.filter(c => c !== commanderType)
        : [...prev, commanderType]
    );
  };

  const handleAction = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (isTargetEmpty) {
        await onMoveIntoEmpty(selectedUnits);
        onCancel(); // Close overlay after successful empty territory move
      } else {
        console.log('🎬 📋 INVADE action starting with dice animation');
        
        // Generate combat result for dice animation BEFORE server call
        const fakeCombatResult = generateFakeCombatResult(selectedUnits, selectedCommanders, toTerritory.machineCount);
        setLastCombatResult(fakeCombatResult);
        
        // Show dice animation immediately
        setShowDiceAnimation(true);
        
        // Call server action in background
        await onInvade(selectedUnits, selectedCommanders);
        
        // Don't close overlay here - let dice animation complete first
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert(`${isTargetEmpty ? 'Movement' : 'Invasion'} failed: ${error.message}`);
      setShowDiceAnimation(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate fake combat result for demo purposes (your existing method)
  const generateFakeCombatResult = (attackingUnits: number, commanderTypes: string[], defendingUnits: number) => {
    // Generate attacker dice
    const attackerDice = [];
    const regularUnits = attackingUnits - commanderTypes.length;
    
    // Regular units roll d6
    for (let i = 0; i < regularUnits; i++) {
      attackerDice.push(Math.floor(Math.random() * 6) + 1);
    }
    
    // Commanders roll d8 or d6
    commanderTypes.forEach(commanderType => {
      const isD8 = ['land', 'naval', 'nuclear'].includes(commanderType);
      attackerDice.push(Math.floor(Math.random() * (isD8 ? 8 : 6)) + 1);
    });
    
    // Generate defender dice (max 2, all d6 for simplicity)
    const defenderDice = [];
    for (let i = 0; i < Math.min(2, defendingUnits); i++) {
      defenderDice.push(Math.floor(Math.random() * 6) + 1);
    }
    
    // Sort dice high to low
    attackerDice.sort((a, b) => b - a);
    defenderDice.sort((a, b) => b - a);
    
    // Resolve combat
    let attackerLosses = 0;
    let defenderLosses = 0;
    
    const maxMatches = Math.min(attackerDice.length, defenderDice.length);
    for (let i = 0; i < maxMatches; i++) {
      if (attackerDice[i] > defenderDice[i]) {
        defenderLosses++;
      } else {
        attackerLosses++;
      }
    }
    
    const territoryConquered = defenderLosses >= defendingUnits;
    
    return {
      attackerDice,
      defenderDice,
      attackerLosses,
      defenderLosses,
      territoryConquered
    };
  };

  const canExecuteAction = () => {
    return selectedUnits > 0 && 
           selectedUnits <= maxUnits && 
           navalValidation &&
           !isProcessing;
  };

  // Handle dice animation completion
  const handleDiceAnimationComplete = () => {
    setShowDiceAnimation(false);
    
    // If territory was conquered, show move-in selection
    if (lastCombatResult?.territoryConquered) {
      const availableUnitsToMove = fromTerritory.machineCount - 1; // After the invasion, must leave 1
      
      setConquestData({
        requiredUnits: selectedUnits - (lastCombatResult.attackerLosses || 0), // Survivors who must move
        availableUnits: Math.max(0, availableUnitsToMove), // Additional units available
        commandersMoving: selectedCommanders // Commanders that were part of the attack
      });
      
      setShowMoveInSelection(true);
    } else {
      // Attack failed, reset for potential retry
      setLastCombatResult(null);
    }
  };

  // Handle move-in confirmation
  const handleMoveInConfirmation = async (additionalUnits: number) => {
    try {
      await onConfirmMoveIn(additionalUnits);
      setShowMoveInSelection(false);
      setConquestData(null);
      setLastCombatResult(null);
      onCancel(); // Close the entire invasion overlay
    } catch (error) {
      console.error('Move-in confirmation failed:', error);
      alert(`Failed to confirm move-in: ${error.message}`);
    }
  };

  const handleMoveInCancel = () => {
    setShowMoveInSelection(false);
    setConquestData(null);
    setLastCombatResult(null);
    onCancel(); // Close the entire invasion overlay
  };

  // Show move-in selection overlay if active
  if (showMoveInSelection && conquestData) {
    return (
      <MoveInSelectionOverlay
        isVisible={true}
        fromTerritoryName={fromTerritory.name}
        toTerritoryName={toTerritory.name}
        conqueredTerritoryId={toTerritoryId}
        requiredUnits={conquestData.requiredUnits}
        availableUnits={conquestData.availableUnits}
        commandersMoving={conquestData.commandersMoving}
        onConfirmMoveIn={handleMoveInConfirmation}
        onCancel={handleMoveInCancel}
      />
    );
  }

  // Show dice animation overlay if active
  if (showDiceAnimation && lastCombatResult) {
    return (
      <DiceRollOverlay
        isVisible={true}
        fromTerritoryName={fromTerritory.name}
        toTerritoryName={toTerritory.name}
        attackingUnits={selectedUnits}
        defendingUnits={toTerritory.machineCount}
        commanderTypes={selectedCommanders}
        combatResult={lastCombatResult}
        onComplete={handleDiceAnimationComplete}
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
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Sword className="text-red-500" size={28} />
            <h2 className="text-2xl font-bold text-gray-800">
              {isTargetEmpty ? 'Move Into Territory' : 'Invade Territory'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsHidden(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Hide overlay"
            >
              <EyeOff size={20} />
            </button>
            <button 
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
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
              disabled={selectedUnits <= 1}
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
              disabled={selectedUnits >= maxUnits}
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
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
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
                    <span>INVADE!</span>
                  </>
                )}
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
                <li>• Contested territory conquest counts toward 3-territory bonus</li>
              )}
              <li>• You can attack multiple times from the same territory</li>
              <li>• Must leave 1 unit behind in attacking territory</li>
              {requiresNaval && (
                <li className="text-blue-700">• Water territories require Naval Commander</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvasionOverlay;