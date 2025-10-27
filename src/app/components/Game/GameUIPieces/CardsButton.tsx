// app/components/Game/GameUiPieces/CardsButton.tsx
'use client'

interface CardsButtonProps {
  cardCount: number;
  onClick: () => void;
  isOpen?: boolean;
}

export default function CardsButton({ cardCount, onClick, isOpen = false }: CardsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed left-6 top-1/2 -translate-y-1/2 z-50 group"
    >
      {/* Fallout-style vertical tab */}
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
        
        {/* Cards Icon Stack */}
        <div className="relative flex flex-col items-center gap-3">
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
      
      {/* Hover tooltip (appears on right side) */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/90 text-amber-400 text-sm whitespace-nowrap px-4 py-2 rounded-lg border border-amber-600 shadow-xl font-mono">
          <div className="font-bold">VIEW HAND</div>
          <div className="text-xs text-amber-600 mt-1">{cardCount} {cardCount === 1 ? 'card' : 'cards'}</div>
        </div>
      </div>
    </button>
  );
}