// app/components/CardGame/Sandbox/SandboxIndicator.tsx
'use client'

import { useState, useEffect } from 'react'

interface SandboxIndicatorProps {
  playerCount: number
  cursorCount: number
}

export function SandboxIndicator({ 
  playerCount, 
  cursorCount 
}: SandboxIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-expand every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsExpanded(true)
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed top-20 right-4 z-10">
      {isExpanded ? (
        // Expanded view
        <div className="bg-purple-600/90 px-4 py-2 rounded-lg shadow-lg border border-purple-500 transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-white font-semibold text-sm">
                🎮 Sandbox Mode: Shared Battlefield
              </div>
              <div className="text-purple-200 text-xs mt-1">
                👥 {playerCount} players connected
                {cursorCount > 10 && (
                  <span className="ml-1">(showing 10/{cursorCount} cursors)</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white hover:text-purple-200 transition-colors flex-shrink-0"
              aria-label="Collapse"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        // Collapsed view - compact purple pill
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600/90 hover:bg-purple-700/90 px-3 py-2 rounded-lg shadow-lg border border-purple-500 transition-all duration-300"
          aria-label="Expand sandbox info"
        >
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">🎮</span>
            <span className="text-white font-semibold text-xs">{playerCount}</span>
            <svg 
              className="w-3 h-3 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 15l7-7 7 7" 
              />
            </svg>
          </div>
        </button>
      )}
    </div>
  )
}