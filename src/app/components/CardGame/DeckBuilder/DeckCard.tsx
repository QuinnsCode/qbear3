// app/components/DeckBuilder/DeckCard.tsx
'use client'

import { useState } from 'react'
import type { Deck } from '@/app/types/Deck'

interface Props {
  deck: Deck
  onSelect: () => void
  onDelete: () => void
  onEdit: () => void
}

export default function DeckCard({ deck, onSelect, onDelete, onEdit }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Safety check - if deck is undefined/null, render nothing
  if (!deck) {
    console.error('DeckCard: deck is undefined')
    return null
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x, y })
  }

  // Calculate parallax offset (moves opposite to mouse for depth effect)
  const parallaxX = isHovered ? (mousePos.x - 0.5) * -20 : 0
  const parallaxY = isHovered ? (mousePos.y - 0.5) * -20 : 0
  
  // Calculate shine position
  const glareX = mousePos.x * 100
  const glareY = mousePos.y * 100

  // Color indicators
  const colorMap: Record<string, string> = {
    W: 'bg-yellow-100',
    U: 'bg-blue-500',
    B: 'bg-gray-900',
    R: 'bg-red-600',
    G: 'bg-green-600',
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className="group relative bg-slate-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-slate-700 hover:border-blue-500"
      style={{
        height: '320px',
        perspective: '1000px',
      }}
    >
      {/* Commander Image with Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        {deck.commanderImageUrl ? (
          <div
            className="absolute inset-0 transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${parallaxX}px, ${parallaxY}px) scale(${isHovered ? 1.1 : 1})`,
              willChange: 'transform',
            }}
          >
            <img
              src={deck.commanderImageUrl}
              alt={deck.commander || 'Commander'}
              className="w-full h-full object-cover"
            />
            
            {/* Holographic Shine Effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, transparent 50%)`,
                mixBlendMode: 'overlay',
              }}
            />
            
            {/* Rainbow Gradient Overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-300"
              style={{
                background: `linear-gradient(${glareX * 3.6}deg, 
                  rgba(255, 0, 255, 0.3) 0%,
                  rgba(0, 255, 255, 0.3) 25%,
                  rgba(255, 255, 0, 0.3) 50%,
                  rgba(255, 0, 255, 0.3) 75%,
                  rgba(0, 255, 255, 0.3) 100%)`,
                mixBlendMode: 'color-dodge',
              }}
            />
            
            {/* Animated Ripple Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-30"
                style={{
                  background: 'radial-gradient(circle, transparent 10%, rgba(255,255,255,0.15) 10%, rgba(255,255,255,0.15) 20%, transparent 20%)',
                  backgroundSize: '30px 30px',
                  animation: 'ripple 4s linear infinite',
                }}
              />
            </div>
            
            {/* Sparkle Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div
                className="absolute w-2 h-2 bg-white rounded-full"
                style={{
                  top: `${20 + Math.sin(glareX) * 30}%`,
                  left: `${30 + Math.cos(glareY) * 40}%`,
                  animation: 'sparkle 2s ease-in-out infinite',
                  boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                }}
              />
              <div
                className="absolute w-1.5 h-1.5 bg-white rounded-full"
                style={{
                  top: `${60 + Math.cos(glareX) * 20}%`,
                  left: `${70 + Math.sin(glareY) * 30}%`,
                  animation: 'sparkle 2.5s ease-in-out infinite 0.5s',
                  boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                }}
              />
              <div
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  top: `${40 + Math.sin(glareY) * 25}%`,
                  left: `${15 + Math.cos(glareX) * 35}%`,
                  animation: 'sparkle 3s ease-in-out infinite 1s',
                  boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                }}
              />
            </div>
            
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <div className="text-6xl">🃏</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-4">
        {/* Top: Colors */}
        <div className="flex gap-1">
          {deck.colors && deck.colors.length > 0 ? (
            deck.colors.map((color) => (
              <div
                key={color}
                className={`w-6 h-6 rounded-full ${colorMap[color] || 'bg-gray-500'} border-2 border-white shadow-lg transition-transform group-hover:scale-110`}
                title={color}
              />
            ))
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white shadow-lg transition-transform group-hover:scale-110" title="Colorless" />
          )}
        </div>

        {/* Bottom: Deck Info */}
        <div className="space-y-2">
          <h3 className="text-white font-bold text-xl line-clamp-2 drop-shadow-lg">
            {deck.name || 'Unnamed Deck'}
          </h3>
          
          {deck.commander && (
            <p className="text-blue-300 text-sm font-semibold drop-shadow-lg">
              Commander: {deck.commander}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>{deck.totalCards || 0} cards</span>
            <span>{deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Delete button action bar */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
          title="Edit deck"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
          title="Delete deck"
        >
          ×
        </button>
      </div>

      {/* Border Glow Effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(59, 130, 246, 0.4) 0%, transparent 60%)`,
          filter: 'blur(15px)',
        }}
      />

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent" />
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(30px, 30px);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}