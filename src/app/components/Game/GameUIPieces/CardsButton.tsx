// app/components/Game/GameUiPieces/CardsButton.tsx
'use client'

import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CardsButtonProps {
  cardCount: number;
  onClick: () => void;
  isOpen?: boolean;
}

export default function CardsButton({ cardCount, onClick, isOpen = false }: CardsButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <button
      onClick={() => {
        if (isExpanded) {
          onClick();
        } else {
          setIsExpanded(true);
        }
      }}
      className="fixed left-4 md:left-6 top-[10rem] z-50 group"
    >
      {isExpanded ? (
        /* EXPANDED STATE: Full vertical tab (desktop/when expanded) */
        <div className={`
          relative
          bg-gradient-to-b from-stone-800 to-stone-900
          border-2 border-amber-700/80
          rounded-r-xl
          px-3 py-6
          shadow-2xl
          transition-all duration-300
          ${isOpen ? 'translate-x-0 border-amber-500' : '-translate-x-1 hover:translate-x-0'}
          ${isOpen ? 'bg-gradient-to-b from-amber-900 to-stone-900' : ''}
        `}>
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-5 rounded-r-xl" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
               }}
          />
          
          {/* Collapse button - top right corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="absolute top-1 right-1 p-1 hover:bg-amber-700/30 rounded transition-colors z-10"
            title="Minimize"
          >
            <ChevronLeft size={14} className="text-amber-500" />
          </button>
          
          {/* Cards Icon Stack */}
          <div className="relative flex flex-col items-center gap-3 mt-2">
            {/* Card Stack Visual */}
            <div className="relative w-10 h-12">
              {/* Back cards */}
              <div className="absolute inset-0 bg-amber-800 border-2 border-amber-600 rounded transform rotate-6 opacity-40" />
              <div className="absolute inset-0 bg-amber-800 border-2 border-amber-600 rounded transform rotate-3 opacity-60" />
              {/* Front card */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-500 rounded shadow-lg flex items-center justify-center">
                <span className="text-amber-200 text-2xl font-bold">🃏</span>
              </div>
            </div>
            
            {/* Count Badge */}
            <div className={`
              bg-amber-950 border-2 border-amber-600
              rounded-full
              w-8 h-8
              flex items-center justify-center
              shadow-lg
              ${cardCount > 0 ? 'animate-pulse' : ''}
            `}>
              <span className="text-amber-400 font-bold text-sm font-mono">
                {cardCount}
              </span>
            </div>
            
            {/* Label */}
            <div className="text-amber-500 text-xs font-bold tracking-wider font-mono [writing-mode:vertical-lr] rotate-180">
              CARDS
            </div>
          </div>
          
          {/* Glow effect when open */}
          {isOpen && (
            <div className="absolute inset-0 bg-amber-500/20 rounded-r-xl animate-pulse pointer-events-none" />
          )}
          
          {/* Corner decoration */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50" />
          <div className="absolute bottom-2 right-2 w-2 h-2 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50" />
        </div>
      ) : (
        /* COLLAPSED STATE: Compact card icon with notification badge */
        <div className={`
          relative
          bg-gradient-to-br from-stone-800 to-stone-900
          border-2 border-amber-700/80
          rounded-lg
          p-2.5
          shadow-2xl
          transition-all duration-300
          hover:border-amber-500 hover:scale-105
          ${isOpen ? 'border-amber-500 bg-gradient-to-br from-amber-900 to-stone-900' : ''}
        `}>
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-5 rounded-lg" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
               }}
          />
          
          {/* Compact Card Icon */}
          <div className="relative w-8 h-10">
            {/* Back card */}
            <div className="absolute inset-0 bg-amber-800 border border-amber-600 rounded-sm transform rotate-3 opacity-60" />
            {/* Front card */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500 rounded-sm shadow-md flex items-center justify-center">
              <span className="text-amber-200 text-lg font-bold">🃏</span>
            </div>
          </div>
          
          {/* Notification Badge - bottom right corner (Twitter style) */}
          {cardCount > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-red-600 border-2 border-stone-900 rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-white font-bold text-xs">
                {cardCount > 9 ? '9+' : cardCount}
              </span>
            </div>
          )}
          
          {/* Glow effect when open */}
          {isOpen && (
            <div className="absolute inset-0 bg-amber-500/20 rounded-lg animate-pulse pointer-events-none" />
          )}
          
          {/* Corner indicator */}
          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50" />
        </div>
      )}
      
      {/* Hover tooltip (appears on right side) */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/90 text-amber-400 text-sm whitespace-nowrap px-4 py-2 rounded-lg border border-amber-600 shadow-xl font-mono">
          <div className="font-bold">{isExpanded ? 'VIEW HAND' : 'EXPAND CARDS'}</div>
          <div className="text-xs text-amber-600 mt-1">{cardCount} {cardCount === 1 ? 'card' : 'cards'}</div>
        </div>
      </div>
    </button>
  );
}