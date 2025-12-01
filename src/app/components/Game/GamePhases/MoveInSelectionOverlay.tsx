// app/components/Game/Combat/MoveInSelectionOverlay.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Users, 
  ChevronUp, 
  ChevronDown,
  ArrowRight,
  Lock,
  Target,
  AlertTriangle,
  Mountain,
  User,
  Zap,
  Ship
} from 'lucide-react';

interface MoveInSelectionOverlayProps {
  isVisible: boolean;
  fromTerritoryName: string;
  toTerritoryName: string;
  conqueredTerritoryId: string;
  requiredUnits: number; // The invasion force that MUST move in
  availableUnits: number; // Additional units available to move (excluding the 1 that must stay)
  commandersMoving: string[]; // Commanders that are required to move
  onConfirmMoveIn: (additionalUnits: number) => Promise<void>;
  onCancel: () => void;
}

const COMMANDER_ICONS = {
  land: { icon: Mountain, label: 'Land Commander', color: 'text-amber-600' },
  diplomat: { icon: User, label: 'Diplomat', color: 'text-blue-600' },
  nuclear: { icon: Zap, label: 'Nuclear Commander', color: 'text-red-600' },
  naval: { icon: Ship, label: 'Naval Commander', color: 'text-cyan-600' }
};

const MoveInSelectionOverlay = ({
  isVisible,
  fromTerritoryName,
  toTerritoryName,
  conqueredTerritoryId,
  requiredUnits,
  availableUnits,
  commandersMoving,
  onConfirmMoveIn,
  onCancel
}: MoveInSelectionOverlayProps) => {
  const [additionalUnits, setAdditionalUnits] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset when overlay becomes visible
  useEffect(() => {
    if (isVisible) {
      setAdditionalUnits(0);
    }
  }, [isVisible]);

  const handleAdditionalUnitsChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(availableUnits, additionalUnits + delta));
    setAdditionalUnits(newValue);
  };

  const handleConfirm = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onConfirmMoveIn(additionalUnits);
    } catch (error) {
      console.error('Move-in confirmation failed:', error);
      alert(`Failed to move additional units: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalMovingUnits = requiredUnits + additionalUnits;
  const unitsRemaining = availableUnits - additionalUnits + 1; // +1 for the unit that must stay

  if (!isVisible) return null;

  return (
    <div className="absolute max-h-full inset-0 bg-black/60 backdrop-blur-sm z-70 flex items-center justify-center">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl overflow-y-scroll">
        
        {/* Victory Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Crown className="text-yellow-500" size={32} />
            <h2 className="text-3xl font-bold text-green-700">Territory Conquered!</h2>
            <Crown className="text-yellow-500" size={32} />
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-lg font-semibold text-green-800 mb-2">
              {fromTerritoryName} → {toTerritoryName}
            </div>
            <div className="text-sm text-green-700">
              Your invasion force has successfully captured the territory!
            </div>
          </div>
        </div>

        {/* Required Move-In Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
            <Lock className="mr-2" size={18} />
            Required to Move In (Cannot Stay Behind)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-blue-600 mb-2">Invasion Force</div>
              <div className="flex items-center space-x-2">
                <Users className="text-blue-500" size={20} />
                <span className="text-xl font-bold text-blue-700">{requiredUnits} units</span>
              </div>
            </div>
            
            {commandersMoving.length > 0 && (
              <div>
                <div className="text-sm text-blue-600 mb-2">Commanders</div>
                <div className="flex flex-wrap gap-1">
                  {commandersMoving.map((commanderType) => {
                    const commander = COMMANDER_ICONS[commanderType];
                    const IconComponent = commander.icon;
                    return (
                      <div
                        key={commanderType}
                        className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-full"
                      >
                        <IconComponent size={14} className={commander.color} />
                        <span className="text-xs font-medium text-blue-700">
                          {commander.label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Units Selection */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Move Additional Units (Optional)
          </h3>
          
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-2">Additional units to move in:</div>
            
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleAdditionalUnitsChange(-1)}
                disabled={additionalUnits <= 0}
                className="p-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronDown size={20} />
              </button>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{additionalUnits}</div>
                <div className="text-sm text-gray-600">
                  of {availableUnits} available
                </div>
              </div>
              
              <button
                onClick={() => handleAdditionalUnitsChange(1)}
                disabled={additionalUnits >= availableUnits}
                className="p-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </div>

          {/* Move-In Preview */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-sm text-gray-600 mb-1">Moving to {toTerritoryName}</div>
              <div className="text-2xl font-bold text-green-600">{totalMovingUnits}</div>
              <div className="text-xs text-gray-500">
                {requiredUnits} required + {additionalUnits} extra
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="text-gray-400" size={24} />
            </div>
            
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-sm text-gray-600 mb-1">Remaining in {fromTerritoryName}</div>
              <div className="text-2xl font-bold text-blue-600">{unitsRemaining}</div>
              <div className="text-xs text-gray-500">
                (must leave at least 1)
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={18} />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">⚠️ Important:</div>
              <ul className="space-y-1 text-xs">
                <li>• Units that move in will be locked in the conquered territory this turn</li>
                <li>• Required invasion force (including commanders) MUST move in</li>
                <li>• You can always move additional units, but they cannot attack this turn</li>
                <li>• At least 1 unit must remain in the attacking territory</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-2 py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Moving Units...</span>
              </>
            ) : (
              <>
                <Target size={20} />
                <span>Confirm Move-In ({totalMovingUnits} units)</span>
              </>
            )}
          </button>
        </div>

        {/* Strategic Advice */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">💡 Strategy Tips:</div>
            <ul className="space-y-1 text-xs">
              <li>• Moving more units strengthens the conquered territory's defense</li>
              <li>• But weakens your attacking territory for future invasions</li>
              <li>• Consider your overall strategic position before committing extra units</li>
              {additionalUnits === 0 && (
                <li className="text-blue-600">• Moving minimum required units keeps maximum flexibility</li>
              )}
              {additionalUnits > 0 && (
                <li className="text-purple-600">• Moving {additionalUnits} extra units shows commitment to holding this territory</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveInSelectionOverlay;