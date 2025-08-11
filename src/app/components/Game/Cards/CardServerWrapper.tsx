// app/components/Game/Cards/Card.tsx
import React from 'react';
import { 
  User,      // Diplomat
  Mountain,  // Land
  Ship,      // Naval
  Zap,       // Nuclear
  Coins,     // Cost indicator
  Clock,     // Phase indicator
  Sword,     // Attack phase
  Shield,    // Defense phase
  Home,      // End game phase
  ArrowRight // End of turn phase
} from 'lucide-react';

// Card types based on your game data
export interface GameCard {
  id?: string;
  cardTitle: string;
  cardPhase: 0 | 1 | 2 | 3; // 0=before invasions, 1=opponent invades, 2=end game, 3=end of turn
  cardCost: number;
  cardText: string;
  commanderType: 'diplomat' | 'naval' | 'land' | 'nuclear';
}

interface CardProps {
  card: GameCard;
  isAvailable?: boolean; // Can the player afford/use this card
  isOwned?: boolean;     // Does player control the required commander
  onClick?: () => void;
  className?: string;
}

// Helper to get commander icon and colors
const getCommanderInfo = (type: GameCard['commanderType']) => {
  const configs = {
    diplomat: { icon: User, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', iconColor: 'text-blue-600', titleColor: 'text-blue-800' },
    naval: { icon: Ship, bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', iconColor: 'text-cyan-600', titleColor: 'text-cyan-800' },
    land: { icon: Mountain, bgColor: 'bg-amber-50', borderColor: 'border-amber-200', iconColor: 'text-amber-600', titleColor: 'text-amber-800' },
    nuclear: { icon: Zap, bgColor: 'bg-red-50', borderColor: 'border-red-200', iconColor: 'text-red-600', titleColor: 'text-red-800' }
  };
  return configs[type];
};

// Helper to get phase info
const getPhaseInfo = (phase: GameCard['cardPhase']) => {
  const phases = {
    0: { name: 'Before Invasions', icon: Sword, color: 'text-green-600', bgColor: 'bg-green-100' },
    1: { name: 'Opponent Invades', icon: Shield, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    2: { name: 'End Game', icon: Home, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    3: { name: 'End of Turn', icon: ArrowRight, color: 'text-blue-600', bgColor: 'bg-blue-100' }
  };
  return phases[phase];
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  isAvailable = true, 
  isOwned = true, 
  onClick, 
  className = '' 
}) => {
  const commanderInfo = getCommanderInfo(card.commanderType);
  const phaseInfo = getPhaseInfo(card.cardPhase);
  const CommanderIcon = commanderInfo.icon;
  const PhaseIcon = phaseInfo.icon;

  // Determine card state styling
  const getCardStyling = () => {
    if (!isOwned) {
      return {
        opacity: 'opacity-50',
        cursor: 'cursor-not-allowed',
        filter: 'grayscale(50%)'
      };
    }
    if (!isAvailable) {
      return {
        opacity: 'opacity-75',
        cursor: 'cursor-not-allowed'
      };
    }
    return {
      opacity: 'opacity-100',
      cursor: onClick ? 'cursor-pointer' : 'cursor-default'
    };
  };

  const cardStyling = getCardStyling();

  return (
    <div 
      className={`
        ${commanderInfo.bgColor} ${commanderInfo.borderColor} 
        ${cardStyling.opacity} ${cardStyling.cursor} ${cardStyling.filter || ''}
        border-2 rounded-lg p-4 transition-all duration-200
        ${onClick && isAvailable && isOwned ? 'hover:shadow-lg hover:scale-105' : ''}
        ${className}
      `}
      onClick={onClick && isAvailable && isOwned ? onClick : undefined}
    >
      {/* Header: Title + Cost */}
      <div className="flex items-start justify-between mb-3">
        <h3 className={`font-bold text-sm ${commanderInfo.titleColor} leading-tight flex-1 mr-2`}>
          {card.cardTitle}
        </h3>
        <div className="flex items-center space-x-1 bg-yellow-100 px-2 py-1 rounded-full min-w-fit">
          <Coins size={14} className="text-yellow-600" />
          <span className="text-xs font-semibold text-yellow-800">{card.cardCost}</span>
        </div>
      </div>

      {/* Commander Icon (Large, centered) */}
      <div className="flex justify-center mb-3">
        <div className={`p-3 rounded-full ${commanderInfo.bgColor} border ${commanderInfo.borderColor}`}>
          <CommanderIcon size={32} className={commanderInfo.iconColor} />
        </div>
      </div>

      {/* Phase Info */}
      <div className={`flex items-center space-x-2 mb-3 px-2 py-1 rounded-full ${phaseInfo.bgColor}`}>
        <PhaseIcon size={12} className={phaseInfo.color} />
        <span className={`text-xs font-medium ${phaseInfo.color}`}>
          {phaseInfo.name}
        </span>
      </div>

      {/* Card Text */}
      <p className="text-xs text-gray-700 leading-relaxed bg-white/50 p-2 rounded border">
        {card.cardText}
      </p>

      {/* Status Indicators */}
      {!isOwned && (
        <div className="mt-2 text-xs text-red-600 font-medium text-center">
          Requires {card.commanderType.charAt(0).toUpperCase() + card.commanderType.slice(1)} Commander
        </div>
      )}
      {isOwned && !isAvailable && (
        <div className="mt-2 text-xs text-orange-600 font-medium text-center">
          Not enough energy
        </div>
      )}
    </div>
  );
};

export default Card;