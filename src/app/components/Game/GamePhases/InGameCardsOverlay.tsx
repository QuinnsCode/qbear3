// app/components/Game/GamePhases/InGameCardsOverlay.tsx
'use client'

import { useState } from 'react';
import { X, Zap } from 'lucide-react';

interface Card {
  id: string;
  type: string;
  name: string;
  data: {
    cardTitle: string;
    cardCost?: number;
    commanderType?: string;
    cardText?: string;
    cardPhase?: number;
  };
}

interface ActiveScoutForce {
  cardId: string;
  targetTerritoryId: string;
  resolved: boolean;
}

interface InGameCardsOverlayProps {
  cards: Card[];
  playerEnergy: number;
  currentPhase: number;
  onClose: () => void;
  onCardClick?: (cardId: string) => void;
  activeScoutForces?: ActiveScoutForce[];
  territories?: Record<string, any>;
}

const COMMANDER_COLORS = {
  land: 'from-amber-600 to-amber-800',
  diplomat: 'from-blue-600 to-blue-800',
  naval: 'from-cyan-600 to-cyan-800',
  nuclear: 'from-red-600 to-red-800',
};

const COMMANDER_BORDER_COLORS = {
  land: 'border-amber-500',
  diplomat: 'border-blue-500',
  naval: 'border-cyan-500',
  nuclear: 'border-red-500',
};

export default function InGameCardsOverlay({
  cards,
  playerEnergy,
  currentPhase,
  onClose,
  onCardClick,
  activeScoutForces = [],
  territories = {}
}: InGameCardsOverlayProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  // Calculate card positions in an arch
  const getCardStyle = (index: number, total: number) => {
    if (total === 0) return {};
    
    // Center point
    const centerIndex = (total - 1) / 2;
    const offset = index - centerIndex;
    
    // Arch parameters
    const maxRotation = 15; // degrees
    const cardSpacing = 120; // pixels horizontal spacing
    const archHeight = 80; // pixels of vertical arch
    
    // Calculate rotation
    const rotation = (offset / centerIndex) * maxRotation;
    
    // Calculate horizontal position
    const xOffset = offset * cardSpacing;
    
    // Calculate vertical position (parabolic arch)
    const yOffset = Math.abs(offset) * archHeight / (total / 2);
    
    return {
      transform: `translateX(${xOffset}px) translateY(${yOffset}px) rotate(${rotation}deg)`,
      zIndex: total - Math.abs(offset), // Cards closer to center are on top
      transition: 'all 0.3s ease-out',
    };
  };

  const handleCardClick = (cardId: string) => {
    if (selectedCard === cardId) {
      setSelectedCard(null);
    } else {
      setSelectedCard(cardId);
    }
    
    if (onCardClick) {
      onCardClick(cardId);
    }
  };

  return (
    <div className="fixed inset-0 z-60 pointer-events-none">
      {/* Cards Container - Bottom Center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-8 pointer-events-auto">
        <div className="relative" style={{ width: '100vw', height: '280px' }}>
          {/* Card Hand */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end justify-center">
            {cards.length === 0 ? (
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 text-white text-center">
                <p className="text-lg">No cards in hand</p>
                <p className="text-sm text-gray-400 mt-2">Purchase cards in Phase 3</p>
              </div>
            ) : (
              <div className="relative flex items-center justify-center" style={{ height: '250px' }}>
                {cards.map((card, index) => {
                  const isSelected = selectedCard === card.id;
                  const commanderType = card.data.commanderType || 'land';
                  const cardCost = card.data.cardCost || 0;
                  const canAfford = playerEnergy >= cardCost;
                  
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      className={`
                        absolute
                        w-32 h-44
                        rounded-xl
                        border-4
                        shadow-2xl
                        cursor-pointer
                        hover:scale-110
                        ${COMMANDER_BORDER_COLORS[commanderType]}
                        ${isSelected ? 'scale-125 shadow-yellow-500/50' : ''}
                        ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      style={getCardStyle(index, cards.length)}
                      disabled={!canAfford}
                    >
                      {/* Card Background */}
                      <div className={`
                        w-full h-full 
                        bg-gradient-to-br ${COMMANDER_COLORS[commanderType]}
                        rounded-lg
                        p-2
                        flex flex-col
                        text-white
                      `}>
                        {/* Card Title */}
                        <div className="text-xs font-bold text-center mb-1 line-clamp-2">
                          {card.data.cardTitle}
                        </div>
                        
                        {/* Commander Type Badge */}
                        <div className="text-[10px] bg-black/30 rounded px-1 py-0.5 text-center mb-1">
                          {commanderType.toUpperCase()}
                        </div>
                        
                        {/* Card Text (truncated) */}
                        <div className="flex-1 text-[9px] leading-tight overflow-hidden">
                          {card.data.cardText}
                        </div>
                        
                        {/* Energy Cost */}
                        <div className="flex items-center justify-center gap-1 mt-1 bg-black/40 rounded px-2 py-1">
                          <Zap size={12} className="text-yellow-400" />
                          <span className="text-sm font-bold">{cardCost}</span>
                        </div>
                        
                        {/* Phase Indicator */}
                        {card.data.cardPhase !== undefined && (
                          <div className="text-[8px] text-center mt-1 bg-black/20 rounded px-1">
                            Phase {card.data.cardPhase}
                          </div>
                        )}
                      </div>
                      
                      {/* Selection Glow */}
                      {isSelected && (
                        <div className="absolute inset-0 rounded-xl border-4 border-yellow-400 animate-pulse pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Card Count & Energy Display */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2">
          <div className="bg-black/80 backdrop-blur-sm rounded-full px-6 py-2 flex items-center gap-4 text-white shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm">🃏</span>
              <span className="font-bold">{cards.length}</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="font-bold">{playerEnergy}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-xl transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Selected Card Detail Panel (Optional) */}
      {selectedCard && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          {(() => {
            const card = cards.find(c => c.id === selectedCard);
            if (!card) return null;
            
            const commanderType = card.data.commanderType || 'land';
            const cardCost = card.data.cardCost || 0;
            const canAfford = playerEnergy >= cardCost;
            
            return (
              <div className={`
                bg-gradient-to-br ${COMMANDER_COLORS[commanderType]}
                border-4 ${COMMANDER_BORDER_COLORS[commanderType]}
                rounded-2xl p-6 shadow-2xl
                max-w-md
                text-white
              `}>
                {/* Title */}
                <h2 className="text-2xl font-bold mb-2 text-center">
                  {card.data.cardTitle}
                </h2>
                
                {/* Commander Type */}
                <div className="text-sm bg-black/30 rounded-lg px-3 py-1 text-center mb-4">
                  {commanderType.toUpperCase()} COMMANDER
                </div>
                
                {/* Full Card Text */}
                <div className="bg-black/20 rounded-lg p-4 mb-4 text-sm leading-relaxed">
                  {card.data.cardText || 'No description available'}
                </div>
                
                {/* Stats Row */}
                <div className="flex items-center justify-around text-center">
                  <div>
                    <div className="text-xs text-gray-300">Cost</div>
                    <div className="flex items-center gap-1 justify-center mt-1">
                      <Zap size={16} className="text-yellow-400" />
                      <span className="font-bold text-lg">{cardCost}</span>
                    </div>
                  </div>
                  
                  {card.data.cardPhase !== undefined && (
                    <>
                      <div className="w-px h-12 bg-white/20" />
                      <div>
                        <div className="text-xs text-gray-300">Phase</div>
                        <div className="font-bold text-lg mt-1">
                          {card.data.cardPhase}
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="w-px h-12 bg-white/20" />
                  <div>
                    <div className="text-xs text-gray-300">Affordable</div>
                    <div className="text-2xl mt-1">
                      {canAfford ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
                
                {/* Play Button (if in Phase 4) */}
                {currentPhase === 4 && canAfford && (
                  <button
                    onClick={() => {
                      if (onCardClick) onCardClick(card.id);
                      setSelectedCard(null);
                    }}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    Play Card
                  </button>
                )}
                
                {!canAfford && (
                  <div className="w-full mt-4 bg-red-900/50 text-white text-center py-3 rounded-lg">
                    Not Enough Energy
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Background Dimmer */}
      {selectedCard && (
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10"
          onClick={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}