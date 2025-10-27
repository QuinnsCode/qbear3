// app/components/Game/Cards/CardsToggleButton.tsx
'use client'

import { useState } from 'react';
import { Layers, ChevronUp, ChevronDown } from 'lucide-react';

interface CardsToggleButtonProps {
  cardCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export default function CardsToggleButton({ 
  cardCount, 
  onClick,
  isOpen 
}: CardsToggleButtonProps) {
  
  return (
    <button
      onClick={onClick}
      className={`
        z-60
        bg-gradient-to-br from-purple-600 to-purple-800
        hover:from-purple-500 hover:to-purple-700
        text-white
        rounded-full
        px-6 py-3
        shadow-2xl
        flex items-center gap-3
        transition-all duration-300
        border-2 border-purple-400
        ${isOpen ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
      `}
    >
      {/* Icon */}
      <Layers size={24} />
      
      {/* Card Count Badge */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">{cardCount}</span>
        <span className="text-sm">Cards</span>
      </div>
      
      {/* Arrow indicator */}
      {isOpen ? (
        <ChevronDown size={20} className="animate-bounce" />
      ) : (
        <ChevronUp size={20} className="animate-bounce" />
      )}
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl -z-10 animate-pulse" />
    </button>
  );
}