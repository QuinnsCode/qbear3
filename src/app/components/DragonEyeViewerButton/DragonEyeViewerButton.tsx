// app/components/DragonEyeViewerButton/DragonEyeViewerButton.tsx
"use client";

interface DragonEyeViewerButtonProps {
  viewerCount: number;
  onClick: () => void;
  isActive: boolean;
}

// Number formatting utility
const formatViewerCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return (count / 1000).toFixed(1) + 'K';
  } else {
    return (count / 1000000).toFixed(2) + 'M';
  }
};

export function DragonEyeViewerButton({ viewerCount, onClick, isActive }: DragonEyeViewerButtonProps) {
  const hasViewers = viewerCount > 0;
  const formattedCount = formatViewerCount(viewerCount);

  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-full shadow-lg transition-all transform hover:scale-105 touch-manipulation ${
        isActive ? 'ring-4 ring-amber-300/50' : ''
      } ${
        hasViewers 
          ? 'bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800' 
          : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
      }`}
    >
      {/* Dragon Eye or Tilde */}
      <div className="w-8 h-8 relative flex items-center justify-center">
        {!hasViewers ? (
          // Tilde with pulsing glow when no viewers
          <div className="text-gray-300 text-2xl font-bold animate-pulse" style={{
            textShadow: '0 0 8px rgba(255, 255, 255, 0.3), 0 0 16px rgba(255, 255, 255, 0.1)'
          }}>
            ~
          </div>
        ) : (
          // Dragon Eye SVG when has viewers
          <svg viewBox="0 0 32 32" className="w-full h-full">
            {/* Eye shape - scales with viewer count */}
            <ellipse 
              cx="16" 
              cy="16" 
              rx="14" 
              ry={viewerCount >= 1000 ? '12' : viewerCount >= 100 ? '10' : viewerCount >= 10 ? '9' : '8'}
              fill="url(#eyeGradient)"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.5"
            />
            
            {/* Iris */}
            <circle 
              cx="16" 
              cy="16" 
              r={viewerCount >= 1000 ? '7' : viewerCount >= 100 ? '6.5' : '6'}
              fill="url(#irisGradient)"
            />
            
            {/* Pupil - vertical slit */}
            <ellipse 
              cx="16" 
              cy="16" 
              rx={viewerCount >= 1000 ? '1.5' : '2'}
              ry={viewerCount >= 1000 ? '7' : viewerCount >= 100 ? '6' : '5'}
              fill="#000"
            />
            
            {/* Highlight */}
            <ellipse 
              cx="14" 
              cy="13" 
              rx="2" 
              ry="3" 
              fill="rgba(255,255,255,0.6)"
            />
            
            {/* Gradients */}
            <defs>
              <radialGradient id="eyeGradient" cx="0.3" cy="0.3">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>
              <radialGradient id="irisGradient" cx="0.4" cy="0.3">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
            </defs>
          </svg>
        )}
      </div>
      
      {/* Viewer count overlay */}
      {hasViewers && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border border-gray-600 min-w-6 text-center">
          {formattedCount}
        </div>
      )}
    </button>
  );
}