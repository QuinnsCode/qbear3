// app/components/Game/GamePhases/InvasionContinueBanner.tsx
'use client'

import React from 'react';
import { ArrowRight, Shield, Crown, Target } from 'lucide-react';
import type { GameState, Player } from '@/app/lib/GameState';

interface InvasionContinueBannerProps {
  gameState: GameState;
  currentPlayer: Player;
  onContinueToFortify: () => Promise<void>;
  isProcessing: boolean;
}

const InvasionContinueBanner = ({
  gameState,
  currentPlayer,
  onContinueToFortify,
  isProcessing
}: InvasionContinueBannerProps) => {
  const invasionStats = currentPlayer.invasionStats;

  if (!invasionStats) return null;

  // Show banner when player has completed some invasions or wants to skip
  const hasInvaded = invasionStats.contestedTerritoriesTaken > 0 || invasionStats.emptyTerritoriesClaimed > 0;
  const hasConquestBonus = invasionStats.conquestBonusEarned;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-lg rounded-xl p-4 shadow-2xl border-2 border-purple-200 max-w-md">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <Shield className="text-purple-600" size={24} />
          <h3 className="text-lg font-bold text-gray-800">Invasion Phase Complete</h3>
        </div>

        {/* Invasion Summary */}
        <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {invasionStats.contestedTerritoriesTaken}
              </div>
              <div className="text-xs text-gray-600">Contested Conquered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {invasionStats.emptyTerritoriesClaimed}
              </div>
              <div className="text-xs text-gray-600">Empty Claimed</div>
            </div>
          </div>
          
          {hasConquestBonus && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="flex items-center justify-center space-x-2 text-orange-600">
                <Crown size={16} />
                <span className="font-semibold text-sm">Conquest Bonus Earned! (+3 Energy)</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Messages */}
        <div className="text-center mb-4">
          {hasInvaded ? (
            <div className="text-sm text-gray-700">
              <div className="font-medium">Great conquests!</div>
              <div>Ready to fortify your positions?</div>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <div className="font-medium">No invasions this turn</div>
              <div>Time to fortify and prepare defenses</div>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinueToFortify}
          disabled={isProcessing}
          className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
            isProcessing 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Advancing...</span>
            </>
          ) : (
            <>
              <Shield size={16} />
              <span>Continue to Fortify</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Tips */}
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-xs text-yellow-800">
            <div className="font-medium mb-1">💡 Fortify Phase:</div>
            <div>Move units between your territories to strengthen defenses</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvasionContinueBanner;