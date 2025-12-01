// app/components/Game/GamePhases/DiceRollOverlay.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { 
  Sword, 
  Shield, 
  Crown,
  Target,
  X,
  Zap,
  ArrowDown,
  Play,
  FastForward
} from 'lucide-react';

interface DiceResult {
  value: number;
  type: 'd6' | 'd8';
  isCommander?: boolean;
  commanderType?: string;
}
import { CombatResult } from '@/app/lib/GameState';
interface DiceRollOverlayProps {
  isVisible: boolean;
  fromTerritoryName: string;
  toTerritoryName: string;
  attackingUnits: number;
  defendingUnits: number;
  commanderTypes: string[];
  combatResult: CombatResult;
  territoryConquered: boolean;  // ✅ ADD this as separate prop
  onComplete: () => void;
}

const DiceRollOverlay = ({
  isVisible,
  fromTerritoryName,
  toTerritoryName,
  attackingUnits,
  defendingUnits,
  commanderTypes,
  combatResult,
  territoryConquered,  // ✅ ADD this
  onComplete
}: DiceRollOverlayProps) => {
  const [stage, setStage] = useState<'setup' | 'rolling' | 'finalizing' | 'sorting' | 'matching' | 'results' | 'extended_display'>('setup');
  const [attackerDiceDisplay, setAttackerDiceDisplay] = useState<DiceResult[]>([]);
  const [defenderDiceDisplay, setDefenderDiceDisplay] = useState<DiceResult[]>([]);
  const [matches, setMatches] = useState<Array<{
    attackerDie: DiceResult;
    defenderDie: DiceResult;
    winner: 'attacker' | 'defender';
  }>>([]);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    
    // ✅ EXTENDED: Much longer animation sequence
    setTimeout(() => setStage('rolling'), 800);
    setTimeout(() => setStage('finalizing'), 3500); // Longer rolling
    setTimeout(() => setStage('sorting'), 5000);
    setTimeout(() => setStage('matching'), 6500);
    setTimeout(() => setStage('results'), 8000);
    setTimeout(() => setStage('extended_display'), 9000); // New extended display stage
    
    // Allow skipping after initial setup
    setTimeout(() => setCanSkip(true), 2000);
  }, [isVisible]);

  useEffect(() => {
    if (stage === 'setup') {
      // Initialize dice displays
      const attackerDice = generateAttackerDice();
      const defenderDice = generateDefenderDice();
      setAttackerDiceDisplay(attackerDice);
      setDefenderDiceDisplay(defenderDice);
    } else if (stage === 'rolling') {
      // Animate rolling effect
      animateRolling();
    } else if (stage === 'finalizing') {
      // Stop rolling but keep showing movement
      animateFinalizing();
    } else if (stage === 'sorting') {
      // Sort dice high to low and show final values
      showFinalValues();
    } else if (stage === 'matching') {
      // Show dice matchups
      showMatches();
    }
  }, [stage]);

  const generateAttackerDice = (): DiceResult[] => {
    const dice: DiceResult[] = [];
    
    // Regular units (d6)
    const regularUnits = attackingUnits - commanderTypes.length;
    for (let i = 0; i < regularUnits; i++) {
      dice.push({
        value: 1, // Will be animated
        type: 'd6'
      });
    }
    
    // Commanders (d8 or d6 based on terrain/type)
    commanderTypes.forEach(commanderType => {
      dice.push({
        value: 1, // Will be animated
        type: getCommanderDieType(commanderType) as 'd6' | 'd8',
        isCommander: true,
        commanderType
      });
    });
    
    return dice;
  };

  const generateDefenderDice = (): DiceResult[] => {
    const dice: DiceResult[] = [];
    
    // Simplified: assume mostly regular units for defenders
    for (let i = 0; i < Math.min(defendingUnits, 2); i++) {
      dice.push({
        value: 1, // Will be animated
        type: 'd6' // Most defenders use d6
      });
    }
    
    return dice;
  };

  const getCommanderDieType = (commanderType: string): string => {
    // This should match your game logic
    switch (commanderType) {
      case 'land':
      case 'naval':
      case 'nuclear':
        return 'd8';
      case 'diplomat':
      default:
        return 'd6';
    }
  };

  const animateRolling = () => {
    // ✅ EXTENDED: Longer, more dramatic rolling animation
    const interval = setInterval(() => {
      setAttackerDiceDisplay(prev => prev.map(die => ({
        ...die,
        value: Math.floor(Math.random() * (die.type === 'd8' ? 8 : 6)) + 1
      })));
      
      setDefenderDiceDisplay(prev => prev.map(die => ({
        ...die,
        value: Math.floor(Math.random() * (die.type === 'd8' ? 8 : 6)) + 1
      })));
    }, 120); // Slightly slower for more dramatic effect

    // Keep rolling for longer
    setTimeout(() => {
      clearInterval(interval);
    }, 2700);
  };

  const animateFinalizing = () => {
    // ✅ NEW: Slower final rolling before stopping
    const interval = setInterval(() => {
      setAttackerDiceDisplay(prev => prev.map(die => ({
        ...die,
        value: Math.floor(Math.random() * (die.type === 'd8' ? 8 : 6)) + 1
      })));
      
      setDefenderDiceDisplay(prev => prev.map(die => ({
        ...die,
        value: Math.floor(Math.random() * (die.type === 'd8' ? 8 : 6)) + 1
      })));
    }, 200); // Slower rolling

    setTimeout(() => {
      clearInterval(interval);
    }, 1200);
  };

  const showFinalValues = () => {
    // Set final dice values from combat result and sort
    const attackerFinal = combatResult.attackerDice.map((value, index) => ({
      ...attackerDiceDisplay[index],
      value
    })).sort((a, b) => b.value - a.value);

    const defenderFinal = combatResult.defenderDice.map((value, index) => ({
      ...defenderDiceDisplay[index],
      value
    })).sort((a, b) => b.value - a.value);

    setAttackerDiceDisplay(attackerFinal);
    setDefenderDiceDisplay(defenderFinal);
  };

  const showMatches = () => {
    const newMatches = [];
    const maxMatches = Math.min(attackerDiceDisplay.length, defenderDiceDisplay.length);
    
    for (let i = 0; i < maxMatches; i++) {
      const attackerDie = attackerDiceDisplay[i];
      const defenderDie = defenderDiceDisplay[i];
      
      newMatches.push({
        attackerDie,
        defenderDie,
        winner: attackerDie.value > defenderDie.value ? 'attacker' : 'defender'
      });
    }
    
    setMatches(newMatches);
  };

  const handleSkip = () => {
    setStage('results');
    showFinalValues();
    showMatches();
  };

  const getDiceIcon = (die: DiceResult) => {
    if (die.isCommander) {
      switch (die.commanderType) {
        case 'land': return '⛰️';
        case 'naval': return '🚢';
        case 'nuclear': return '⚡';
        case 'diplomat': return '👤';
        default: return '🎖️';
      }
    }
    return '🎲';
  };

  const getDiceColor = (die: DiceResult) => {
    if (die.isCommander) {
      return die.type === 'd8' 
        ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
        : 'bg-gradient-to-br from-blue-400 to-purple-500';
    }
    return 'bg-gradient-to-br from-gray-400 to-gray-600';
  };

  const getDiceAnimation = () => {
    switch (stage) {
      case 'rolling':
        return 'animate-bounce';
      case 'finalizing':
        return 'animate-pulse';
      case 'sorting':
        return 'animate-ping';
      default:
        return '';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="dice-overlay-wrapper absolute inset-0 bg-black/85 backdrop-blur-sm z-70 flex items-center justify-center p-2 overflow-y-auto">
      <div className="dice-overlay-content bg-white/95 backdrop-blur-lg rounded-2xl w-full shadow-2xl my-auto">
        
        {/* Header - ✅ FIXED: Shows actual dice counts */}
        <div className="text-center dice-header">
          <div className="flex items-center justify-center space-x-4 mb-4 flex-wrap">
            <div className="text-center min-w-0 flex-shrink">
              <Sword className="text-red-500 mx-auto mb-1" size={24} />
              <div className="font-bold text-base text-gray-800 truncate">{fromTerritoryName}</div>
              <div className="text-gray-600 text-sm">{attackerDiceDisplay.length} dice</div>
            </div>
            
            <div className="text-4xl animate-pulse flex-shrink-0">⚔️</div>
            
            <div className="text-center min-w-0 flex-shrink">
              <Shield className="text-blue-500 mx-auto mb-1" size={24} />
              <div className="font-bold text-base text-gray-800 truncate">{toTerritoryName}</div>
              <div className="text-gray-600 text-sm">{defenderDiceDisplay.length} dice</div>
            </div>
          </div>
          
          <div className="text-base font-semibold text-gray-700 px-2">
            {stage === 'setup' && 'Preparing for Battle...'}
            {stage === 'rolling' && '🎲 Rolling the Dice of War! 🎲'}
            {stage === 'finalizing' && '⏳ Dice are Settling...'}
            {stage === 'sorting' && '📊 Sorting Results...'}
            {stage === 'matching' && '🔄 Matching Highest vs Highest...'}
            {stage === 'results' && (territoryConquered ? '🏆 Territory Conquered!' : '🛡️ Attack Repelled!')}
            {stage === 'extended_display' && (territoryConquered ? '👑 Victory is Yours!' : '⚔️ Defenders Hold Strong!')}
          </div>
          
          {/* Skip Button */}
          {canSkip && stage !== 'results' && stage !== 'extended_display' && (
            <button
              onClick={handleSkip}
              className="mt-3 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors flex items-center mx-auto space-x-2"
            >
              <FastForward size={14} />
              <span>Skip Animation</span>
            </button>
          )}
        </div>

        {/* Dice Display Area */}
        <div className="dice-display-grid">
          {/* Attacker Dice */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Sword size={16} className="text-red-500" />
              <span className="font-bold text-red-700 text-sm">Attacker Dice</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {attackerDiceDisplay.map((die, index) => (
                <div
                  key={index}
                  className={`dice-item relative flex items-center justify-center text-white font-bold shadow-xl transform transition-all duration-700 ${
                    getDiceAnimation()
                  } ${
                    stage === 'sorting' && index === 0 ? 'ring-2 ring-yellow-400 scale-110' : ''
                  } ${
                    stage === 'matching' && index < matches.length ? 'ring-2 ring-blue-400' : ''
                  } ${getDiceColor(die)}`}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    transform: stage === 'rolling' ? `rotate(${Math.random() * 360}deg)` : 'rotate(0deg)'
                  }}
                >
                  <div className="absolute -top-1 -right-1 text-xs">
                    {getDiceIcon(die)}
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black">{die.value}</div>
                    <div className="text-[10px] opacity-90 font-semibold">{die.type}</div>
                  </div>
                  {die.isCommander && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Defender Dice */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Shield size={16} className="text-blue-500" />
              <span className="font-bold text-blue-700 text-sm">Defender Dice</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {defenderDiceDisplay.map((die, index) => (
                <div
                  key={index}
                  className={`dice-item relative flex items-center justify-center text-white font-bold shadow-xl transform transition-all duration-700 ${
                    getDiceAnimation()
                  } ${
                    stage === 'sorting' && index === 0 ? 'ring-2 ring-yellow-400 scale-110' : ''
                  } ${
                    stage === 'matching' && index < matches.length ? 'ring-2 ring-red-400' : ''
                  } ${getDiceColor(die)}`}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    transform: stage === 'rolling' ? `rotate(${Math.random() * 360}deg)` : 'rotate(0deg)'
                  }}
                >
                  <div className="absolute -top-1 -right-1 text-xs">
                    {getDiceIcon(die)}
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black">{die.value}</div>
                    <div className="text-[10px] opacity-90 font-semibold">{die.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dice Matches Display */}
        {(stage === 'matching' || stage === 'results' || stage === 'extended_display') && matches.length > 0 && (
          <div className="dice-matches">
            <div className="text-center mb-3">
              <h3 className="font-bold text-gray-700 mb-1 text-sm">⚡ Dice Matchups ⚡</h3>
              <div className="text-gray-600 text-xs">Highest vs Highest • Ties go to Defender</div>
            </div>
            
            <div className="space-y-2">
              {matches.map((match, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-center space-x-3 p-2 rounded-xl transition-all duration-700 border-2 ${
                    match.winner === 'attacker' 
                      ? 'bg-red-50 border-red-300 shadow-red-100' 
                      : 'bg-blue-50 border-blue-300 shadow-blue-100'
                  }`}
                  style={{ 
                    animationDelay: `${index * 300}ms`,
                    opacity: stage === 'matching' ? 0 : 1,
                    animation: stage === 'matching' ? `fadeIn 0.5s ease-in-out ${index * 300}ms forwards` : 'none'
                  }}
                >
                  {/* Attacker Die */}
                  <div className={`match-die flex items-center justify-center text-white font-bold shadow-lg transition-all duration-500 ${
                    getDiceColor(match.attackerDie)
                  } ${match.winner === 'attacker' ? 'ring-2 ring-green-400 scale-110' : 'opacity-75 scale-95'}`}>
                    <div className="text-center">
                      <div className="text-base">{match.attackerDie.value}</div>
                    </div>
                  </div>
                  
                  {/* VS with result */}
                  <div className="text-center px-2">
                    <div className="text-[10px] font-bold text-gray-600 mb-0.5">VS</div>
                    <div className={`text-xs font-black flex items-center justify-center space-x-1 ${
                      match.winner === 'attacker' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {match.winner === 'attacker' ? (
                        <>
                          <Sword size={12} />
                          <span>WIN</span>
                        </>
                      ) : (
                        <>
                          <Shield size={12} />
                          <span>WIN</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Defender Die */}
                  <div className={`match-die flex items-center justify-center text-white font-bold shadow-lg transition-all duration-500 ${
                    getDiceColor(match.defenderDie)
                  } ${match.winner === 'defender' ? 'ring-2 ring-green-400 scale-110' : 'opacity-75 scale-95'}`}>
                    <div className="text-center">
                      <div className="text-base">{match.defenderDie.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Combat Results */}
        {(stage === 'results' || stage === 'extended_display') && (
          <div className="text-center combat-results">
            <div className={`p-3 rounded-xl mb-4 border-2 shadow-lg ${
              territoryConquered 
                ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300' 
                : 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-300'
            }`}>
              <div className="flex items-center justify-center space-x-2 mb-3">
                {territoryConquered ? (
                  <>
                    <Crown className="text-green-600" size={24} />
                    <span className="text-green-800 font-black text-lg">VICTORY!</span>
                    <Crown className="text-green-600" size={24} />
                  </>
                ) : (
                  <>
                    <Shield className="text-yellow-600" size={24} />
                    <span className="text-yellow-800 font-black text-lg">DEFENDED!</span>
                    <Shield className="text-yellow-600" size={24} />
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-red-600 font-bold mb-1 text-xs">💀 Attacker Losses</div>
                  <div className="text-2xl font-black text-red-700">{combatResult.attackerLosses}</div>
                  <div className="text-[10px] text-red-600 mt-0.5">units eliminated</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-bold mb-1 text-xs">💀 Defender Losses</div>
                  <div className="text-2xl font-black text-blue-700">{combatResult.defenderLosses}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">units eliminated</div>
                </div>
              </div>
              
              {territoryConquered && (
                <div className="mt-3 p-2 bg-green-200 rounded-lg">
                  <div className="text-green-800 font-bold text-xs">🏆 Territory conquered! Select additional units to move in.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3 dice-actions">
          {(stage === 'results' || stage === 'extended_display') ? (
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors shadow-lg"
            >
              {territoryConquered ? 'Select Move-In Forces' : 'Continue Game'}
            </button>
          ) : canSkip ? (
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center space-x-2"
            >
              <FastForward size={16} />
              <span>Skip to Results</span>
            </button>
          ) : (
            <div className="text-gray-500 italic text-sm">Preparing combat resolution...</div>
          )}
        </div>
        
        {/* Dramatic flair for extended display */}
        {stage === 'extended_display' && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
            <div className={`absolute inset-0 ${territoryConquered ? 'bg-green-200' : 'bg-yellow-500'} opacity-10 animate-pulse`}></div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dice-overlay-content {
          max-width: 800px;
          padding: 1.5rem;
          max-height: 95vh;
          overflow-y: auto;
        }

        .dice-header {
          margin-bottom: 1rem;
        }

        .dice-display-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .dice-item {
          width: 60px;
          height: 60px;
          border-radius: 0.75rem;
        }

        .match-die {
          width: 48px;
          height: 48px;
          border-radius: 0.5rem;
        }

        .dice-matches {
          margin-bottom: 1.5rem;
        }

        .combat-results {
          margin-bottom: 1rem;
        }

        .dice-actions {
          padding-bottom: 0.5rem;
        }

        /* Mobile landscape optimizations */
        @media (max-height: 600px) and (orientation: landscape) {
          .dice-overlay-wrapper {
            align-items: flex-start;
            padding: 0.5rem;
          }

          .dice-overlay-content {
            padding: 1rem;
            max-height: 98vh;
            margin: 0.25rem auto;
          }

          .dice-header {
            margin-bottom: 0.75rem;
          }

          .dice-display-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .dice-item {
            width: 48px;
            height: 48px;
          }

          .match-die {
            width: 40px;
            height: 40px;
          }

          .dice-matches {
            margin-bottom: 1rem;
          }

          .combat-results {
            margin-bottom: 0.75rem;
          }

          .dice-actions {
            padding-bottom: 0.25rem;
          }
        }

        /* Tablet and up */
        @media (min-width: 640px) {
          .dice-display-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }

          .dice-item {
            width: 70px;
            height: 70px;
          }

          .match-die {
            width: 56px;
            height: 56px;
          }
        }

        /* Desktop */
        @media (min-width: 1024px) {
          .dice-overlay-content {
            padding: 2rem;
          }

          .dice-header {
            margin-bottom: 2rem;
          }

          .dice-display-grid {
            gap: 3rem;
            margin-bottom: 2rem;
          }

          .dice-item {
            width: 80px;
            height: 80px;
          }

          .match-die {
            width: 64px;
            height: 64px;
          }

          .dice-matches {
            margin-bottom: 2rem;
          }

          .combat-results {
            margin-bottom: 2rem;
          }

          .dice-actions {
            padding-bottom: 0;
          }
        }

        /* Very small mobile screens */
        @media (max-width: 380px) {
          .dice-item {
            width: 52px;
            height: 52px;
          }

          .match-die {
            width: 42px;
            height: 42px;
          }
        }
      `}</style>
    </div>
  );
};

export default DiceRollOverlay;