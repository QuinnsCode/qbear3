// app/components/Game/Cards/ActiveScoutForces.tsx
'use client'

import { useState } from 'react';
import { Target, MapPin, X } from 'lucide-react';

interface ActiveScoutForce {
  cardId: string;
  targetTerritoryId: string;
  resolved: boolean;
}

interface ActiveScoutForcesProps {
  activeScoutForces: ActiveScoutForce[];
  territories: Record<string, any>;
  playerColor: string;
}

export default function ActiveScoutForces({
  activeScoutForces,
  territories,
  playerColor
}: ActiveScoutForcesProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!activeScoutForces || activeScoutForces.length === 0) return null;

  const activeCount = activeScoutForces.filter(sf => !sf.resolved).length;
  
  return (
    <>
      {/* Compact Reminder Icon */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="fixed top-40 right-24 z-60 group"
      >
        {/* Icon Container - Fallout Pip-Boy style */}
        <div className="relative bg-amber-900/90 backdrop-blur-sm border-2 border-amber-600 rounded-lg p-3 shadow-2xl hover:bg-amber-800/90 transition-all hover:scale-105">
          {/* Robot/Scout Icon */}
          <div className="text-2xl">🤖</div>
          
          {/* Badge Count (if multiple) */}
          {activeCount > 1 && (
            <div className="absolute -top-2 -right-2 bg-red-600 border-2 border-amber-400 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
              {activeCount}
            </div>
          )}
          
          {/* Pulse animation for active scouts */}
          {activeCount > 0 && (
            <div className="absolute inset-0 bg-amber-500/30 rounded-lg animate-pulse pointer-events-none" />
          )}
        </div>
        
        {/* Hover Tooltip */}
        <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/90 text-amber-300 text-xs whitespace-nowrap px-3 py-1 rounded-lg border border-amber-600 shadow-xl">
            {activeCount} Active Scout {activeCount === 1 ? 'Force' : 'Forces'}
          </div>
        </div>
      </button>

      {/* Details Popup Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          {/* Background Overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDetails(false)}
          />
          
          {/* Modal Content - Fallout Terminal Style */}
          <div className="relative bg-gradient-to-br from-amber-950 to-stone-950 border-4 border-amber-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            {/* Scanline effect overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10 rounded-xl" 
                 style={{
                   backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                 }}
            />
            
            {/* Header */}
            <div className="bg-amber-900/50 border-b-2 border-amber-700 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🤖</div>
                  <div>
                    <h3 className="text-amber-400 font-bold text-lg tracking-wide font-mono">
                      SCOUT FORCES
                    </h3>
                    <p className="text-amber-600 text-xs font-mono">
                      ACTIVE RECONNAISSANCE
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-amber-400 hover:text-amber-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Scout Forces List */}
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {activeScoutForces.map((scoutForce, index) => {
                const territory = territories[scoutForce.targetTerritoryId];
                if (!territory) return null;

                const isResolved = scoutForce.resolved;

                return (
                  <div
                    key={`scout-${scoutForce.cardId}-${index}`}
                    className={`
                      bg-stone-900/50 border-2 border-amber-700/50
                      rounded-lg p-4
                      ${isResolved ? 'opacity-50' : 'opacity-100'}
                      transition-all duration-300
                      font-mono
                    `}
                  >
                    {/* Target Territory */}
                    <div className="flex items-start gap-3 mb-3">
                      <MapPin size={18} className="text-amber-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-amber-300 font-bold text-sm mb-1">
                          {territory.name}
                        </div>
                        <div className={`text-xs ${isResolved ? 'text-green-400' : 'text-amber-500'}`}>
                          {isResolved ? '✓ Mission Complete' : '⚡ Target Acquired'}
                        </div>
                      </div>
                    </div>

                    {/* Reward Info */}
                    <div className={`
                      border-l-4 pl-3 py-2
                      ${isResolved ? 'border-green-500 bg-green-950/30' : 'border-amber-500 bg-amber-950/30'}
                    `}>
                      <div className={`text-xs font-bold ${isResolved ? 'text-green-400' : 'text-amber-400'}`}>
                        {isResolved ? '✓ BONUS APPLIED: +5 MODs' : '🎯 CONQUER FOR: +5 MODs'}
                      </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={`font-bold ${isResolved ? 'text-green-400' : 'text-amber-400'}`}>
                        [{isResolved ? 'RESOLVED' : 'ACTIVE'}]
                      </span>
                      {!isResolved && (
                        <span className="text-amber-600 animate-pulse">
                          ▸▸▸
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Instructions */}
            {activeScoutForces.some(sf => !sf.resolved) && (
              <div className="bg-amber-900/30 border-t-2 border-amber-700 px-6 py-3 rounded-b-lg">
                <p className="text-amber-400 text-xs font-mono text-center">
                  💡 Conquer highlighted territories to collect bonuses
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}