// app/components/Game/GamePhases/BuildHireOverlay.tsx
import React, { useState, useEffect } from 'react';
import { 
  X,
  User,
  Mountain,
  Ship,
  Zap,
  Castle,
  Coins,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Info
} from 'lucide-react';

interface BuildHireOverlayProps {
  gameState: any
  currentUserId: string
  onPurchaseCommander: (commanderType: string, cost: number) => Promise<void>
  onPlaceCommander: (territoryId: string, commanderType: string) => Promise<void>
  onPurchaseSpaceBase: (cost: number) => Promise<void>
  onPlaceSpaceBase: (territoryId: string) => Promise<void>
  onAdvanceToNextPhase: () => Promise<void>
  onClose?: () => void
}

const BuildHireOverlay = ({ 
  gameState, 
  currentUserId, 
  onPurchaseCommander,
  onPlaceCommander,
  onPurchaseSpaceBase,
  onPlaceSpaceBase,
  onAdvanceToNextPhase,
  onClose 
}: BuildHireOverlayProps) => {
  const [phase, setPhase] = useState<'choose' | 'place_commander' | 'place_space_base' | 'complete'>('choose');
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedThisPhase, setPurchasedThisPhase] = useState<string[]>([]);

  const myPlayer = gameState.players.find((p: any) => p.id === currentUserId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  // Commander types and costs
  const COMMANDER_TYPES = [
    { id: 'land', name: 'Land Commander', icon: Mountain, cost: 3, color: 'amber' },
    { id: 'diplomat', name: 'Diplomat', icon: User, cost: 3, color: 'blue' },
    { id: 'naval', name: 'Naval Commander', icon: Ship, cost: 3, color: 'cyan' },
    { id: 'nuclear', name: 'Nuclear Commander', icon: Zap, cost: 3, color: 'red' }
  ];

  const SPACE_BASE = { id: 'space_base', name: 'Space Base', icon: Castle, cost: 5, color: 'purple' };

  // Check what player already owns
  const getOwnedCommanders = () => {
    if (!myPlayer) return [];
    const owned: string[] = [];
    
    myPlayer.territories.forEach((tId: string) => {
      const territory = gameState.territories[tId];
      if (territory?.landCommander === currentUserId) owned.push('land');
      if (territory?.diplomatCommander === currentUserId) owned.push('diplomat');
      if (territory?.navalCommander === currentUserId) owned.push('naval');
      if (territory?.nuclearCommander === currentUserId) owned.push('nuclear');
    });
    
    return owned;
  };

  const getSpaceBaseCount = () => {
    if (!myPlayer) return 0;
    return myPlayer.territories.filter((tId: string) => 
      gameState.territories[tId]?.spaceBase === currentUserId
    ).length;
  };

  const ownedCommanders = getOwnedCommanders();
  const spaceBaseCount = getSpaceBaseCount();

  // Available purchases
  const availableCommanders = COMMANDER_TYPES.filter(cmd => 
    !ownedCommanders.includes(cmd.id) && 
    !purchasedThisPhase.includes(cmd.id) &&
    (myPlayer?.energy || 0) >= cmd.cost
  );

  // ✅ FIXED: Allow multiple space base purchases (no restriction on already owning them)
  const canBuySpaceBase = (myPlayer?.energy || 0) >= SPACE_BASE.cost;

  // ✅ UPDATED: Handle multiple space base purchases by using unique IDs
  const handlePurchase = async (itemType: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (itemType === 'space_base') {
        await onPurchaseSpaceBase(SPACE_BASE.cost);
        // ✅ Use timestamp to create unique space base ID for multiple purchases
        const uniqueSpaceBaseId = `space_base_${Date.now()}`;
        setSelectedPurchase(uniqueSpaceBaseId);
        setPhase('place_space_base');
        setPurchasedThisPhase(prev => [...prev, uniqueSpaceBaseId]);
      } else {
        await onPurchaseCommander(itemType, 3);
        setSelectedPurchase(itemType);
        setPhase('place_commander');
        setPurchasedThisPhase(prev => [...prev, itemType]);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ UPDATED: Handle placement for both commanders and space bases
  const handlePlacement = async (territoryId: string) => {
    if (isProcessing || !selectedPurchase) return;
    
    setIsProcessing(true);
    try {
      if (selectedPurchase.startsWith('space_base')) {
        await onPlaceSpaceBase(territoryId);
      } else {
        await onPlaceCommander(territoryId, selectedPurchase);
      }
      setSelectedPurchase(null);
      setPhase('choose');
    } catch (error) {
      console.error('Placement failed:', error);
      alert(`Placement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle phase completion
  const handleComplete = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onAdvanceToNextPhase();
      if (onClose) onClose();
    } catch (error) {
      console.error('Phase advance failed:', error);
      alert(`Failed to advance phase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (gameState.status !== 'playing' || gameState.currentPhase !== 2) {
    return null;
  }

  if (!isMyTurn) {
    return (
      <div className="absolute top-14 left-0 right-0 bg-blue-500/90 backdrop-blur-sm text-white p-3 z-40 shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <Castle size={20} />
            <span className="font-medium">Build & Hire Phase</span>
          </div>
          <div className="text-sm opacity-90 mt-1">
            Waiting for {currentPlayer?.name} to build and hire...
          </div>
        </div>
      </div>
    );
  }

  // Main purchase selection phase
  if (phase === 'choose') {
    return (
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center pt-16">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Castle className="text-purple-500" size={28} />
              <h2 className="text-2xl font-bold text-gray-800">Build & Hire</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                <Coins className="text-yellow-600" size={16} />
                <span className="font-semibold text-yellow-800">{myPlayer?.energy || 0} Energy</span>
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
          </div>

          {/* Current Assets */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Your Current Assets</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Commanders:</div>
                {ownedCommanders.length === 0 ? (
                  <div className="text-gray-400 text-sm">None</div>
                ) : (
                  <div className="space-y-1">
                    {ownedCommanders.map(cmdId => {
                      const cmd = COMMANDER_TYPES.find(c => c.id === cmdId);
                      if (!cmd) return null;
                      const IconComponent = cmd.icon;
                      return (
                        <div key={cmdId} className="flex items-center space-x-2">
                          <IconComponent size={16} className="text-green-500" />
                          <span className="text-sm">{cmd.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Space Bases:</div>
                <div className="flex items-center space-x-2">
                  <Castle size={16} className="text-purple-500" />
                  <span className="text-sm">{spaceBaseCount} bases</span>
                </div>
              </div>
            </div>
          </div>

          {/* Available Commanders - same as before */}
          {availableCommanders.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Available Commanders (3 Energy)</h3>
              <div className="grid grid-cols-2 gap-3">
                {availableCommanders.map(commander => {
                  const IconComponent = commander.icon;
                  return (
                    <button
                      key={commander.id}
                      onClick={() => handlePurchase(commander.id)}
                      disabled={isProcessing}
                      className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                        commander.color === 'amber' ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' :
                        commander.color === 'blue' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' :
                        commander.color === 'cyan' ? 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100' :
                        'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent size={24} className={
                          commander.color === 'amber' ? 'text-amber-600' :
                          commander.color === 'blue' ? 'text-blue-600' :
                          commander.color === 'cyan' ? 'text-cyan-600' :
                          'text-red-600'
                        } />
                        <div className="flex items-center space-x-1">
                          <Coins size={16} className="text-gray-500" />
                          <span className="text-sm font-semibold">{commander.cost}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-800">{commander.name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {commander.id === 'land' && 'Enhances land territory control'}
                          {commander.id === 'diplomat' && 'Provides diplomatic advantages'}
                          {commander.id === 'naval' && 'Controls water territories'}
                          {commander.id === 'nuclear' && 'Devastating attack capabilities'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Space Base Option - same as before */}
          {canBuySpaceBase && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Space Base (5 Energy)</h3>
              <button
                onClick={() => handlePurchase('space_base')}
                disabled={isProcessing}
                className="w-full p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <Castle size={24} className="text-purple-600" />
                  <div className="flex items-center space-x-1">
                    <Coins size={16} className="text-gray-500" />
                    <span className="text-sm font-semibold">5</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800">Space Base</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Generates +1 bonus unit each turn • You currently own {spaceBaseCount}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* No purchases available */}
          {availableCommanders.length === 0 && !canBuySpaceBase && (
            <div className="text-center py-8">
              <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Purchases Available</h3>
              <p className="text-gray-500 mb-4">
                {(myPlayer?.energy || 0) < 3 ? 
                  'Not enough energy for purchases' : 
                  'You already own all available items'}
              </p>
            </div>
          )}

          {/* ✅ FIX 2: TWO BUTTON LAYOUT - Skip & Continue */}
          <div className="flex gap-4 justify-center">
            {/* Skip Button - Always Available */}
            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                isProcessing 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-gray-600 hover:border-gray-700'
              }`}
            >
              <span>{isProcessing ? 'Processing...' : 'Skip - Buy Nothing'}</span>
              <ArrowRight size={16} />
            </button>
            
            {/* Continue Button - Only if purchases available */}
            {(availableCommanders.length > 0 || canBuySpaceBase) && (
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  isProcessing 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <span>{isProcessing ? 'Processing...' : 'Continue to Buy Cards'}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Placement phases - banner overlay
  return (
    <div className="absolute top-14 left-0 right-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 z-40 shadow-lg">
      <div className="flex items-center justify-between">
        
        {/* Left side - Placement instruction */}
        <div className="flex items-center space-x-3">
          {selectedPurchase?.startsWith('space_base') ? (
            <>
              <Castle className="animate-pulse" size={24} />
              <div>
                <div className="font-semibold">Place Your Space Base</div>
                <div className="text-sm opacity-90">
                  Click on any territory you control (without existing space base)
                </div>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const cmd = COMMANDER_TYPES.find(c => c.id === selectedPurchase);
                if (!cmd) return null;
                const IconComponent = cmd.icon;
                return (
                  <>
                    <IconComponent className="animate-pulse" size={24} />
                    <div>
                      <div className="font-semibold">Place Your {cmd.name}</div>
                      <div className="text-sm opacity-90">
                        Click on any territory you control to place your commander
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>

        {/* Right side - Cancel button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedPurchase(null);
              setPhase('choose');
            }}
            disabled={isProcessing}
            className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-sm transition-colors"
          >
            Cancel
          </button>

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
    </div>
  );
};

export default BuildHireOverlay;