// app/components/Game/Animations/Invasion/ConquestAnimation.tsx
'use client'

import { useState, useEffect, useRef } from 'react';

interface ConquestAnimationProps {
  territoryId: string;
  position: { x: number; y: number };
  ownerId: string | null;
  onAnimationComplete?: (territoryId: string) => void;
}

export const ConquestAnimation = ({ 
  territoryId, 
  position, 
  ownerId,
  onAnimationComplete 
}: ConquestAnimationProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const previousOwnerRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only trigger animation if ownership actually changed (not initial render)
    const prevOwner = previousOwnerRef.current;
    const hasOwnershipChanged = prevOwner !== null && prevOwner !== ownerId && ownerId !== null;
    
    if (hasOwnershipChanged) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Start animation
      setIsAnimating(true);
      setAnimationKey(prev => prev + 1); // Force re-render of animation
      
      // End animation after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.(territoryId);
      }, 2000);
    }
    
    // Update previous owner reference
    previousOwnerRef.current = ownerId;
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [ownerId, territoryId, onAnimationComplete]);

  if (!isAnimating) return null;

  return (
    <g key={`conquest-${territoryId}-${animationKey}`}>
      <style jsx>{`
        @keyframes conquest-ripple-1 {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          50% {
            transform: scale(2);
            opacity: 0.6;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        @keyframes conquest-ripple-2 {
          0% {
            transform: scale(0.3);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.8);
            opacity: 0.4;
          }
          100% {
            transform: scale(3.5);
            opacity: 0;
          }
        }
        
        @keyframes conquest-ripple-3 {
          0% {
            transform: scale(0.1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.3;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
        
        .conquest-ripple-1 {
          animation: conquest-ripple-1 2s ease-out;
          transform-origin: center;
        }
        
        .conquest-ripple-2 {
          animation: conquest-ripple-2 2s ease-out 0.2s;
          transform-origin: center;
        }
        
        .conquest-ripple-3 {
          animation: conquest-ripple-3 2s ease-out 0.4s;
          transform-origin: center;
        }
      `}</style>
      
      {/* First ripple wave */}
      <circle
        cx={position.x}
        cy={position.y}
        r={20}
        fill="none"
        stroke="white"
        strokeWidth="4"
        className="conquest-ripple-1"
        style={{
          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
        }}
      />
      
      {/* Second ripple wave */}
      <circle
        cx={position.x}
        cy={position.y}
        r={18}
        fill="none"
        stroke="white"
        strokeWidth="3"
        className="conquest-ripple-2"
        style={{
          filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))'
        }}
      />
      
      {/* Third ripple wave */}
      <circle
        cx={position.x}
        cy={position.y}
        r={16}
        fill="none"
        stroke="white"
        strokeWidth="2"
        className="conquest-ripple-3"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))'
        }}
      />
      
      {/* Central flash effect */}
      <circle
        cx={position.x}
        cy={position.y}
        r={12}
        fill="rgba(255, 255, 255, 0.3)"
        stroke="none"
        className="animate-pulse"
        style={{
          filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))'
        }}
      />
    </g>
  );
};