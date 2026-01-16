// app/components/DeckBuilder/DeckCard.tsx
'use client'

import { useState, useEffect } from 'react'
import type { Deck } from '@/app/types/Deck'

interface Props {
  deck: Deck
  onSelect: () => void
  onDelete?: () => void
  onEdit?: () => void
  isSandbox?: boolean
}

export default function DeckCard({ deck, onSelect, onDelete, onEdit, isSandbox = false }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [activeCommanderIndex, setActiveCommanderIndex] = useState(0)

  if (!deck) {
    console.error('DeckCard: deck is undefined')
    return null
  }

  const hasPartners = deck.commanders && deck.commanders.length > 1
  const commanderImages = deck.commanderImageUrls || []

  // Auto-rotate between partner commanders every 4 seconds when hovered
  useEffect(() => {
    if (!hasPartners || !isHovered) return

    const interval = setInterval(() => {
      setActiveCommanderIndex(prev => (prev + 1) % 2)
    }, 4000)

    return () => clearInterval(interval)
  }, [hasPartners, isHovered])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x, y })
  }

  // Subtle parallax - less movement for elegance
  const parallaxX = isHovered ? (mousePos.x - 0.5) * -15 : 0
  const parallaxY = isHovered ? (mousePos.y - 0.5) * -15 : 0
  
  // Shine position
  const glareX = mousePos.x * 100
  const glareY = mousePos.y * 100

  // Color indicators
  const colorMap: Record<string, { bg: string, glow: string }> = {
    W: { bg: 'bg-yellow-50', glow: 'rgba(254, 240, 138, 0.6)' },
    U: { bg: 'bg-blue-500', glow: 'rgba(59, 130, 246, 0.6)' },
    B: { bg: 'bg-gray-900', glow: 'rgba(0, 0, 0, 0.8)' },
    R: { bg: 'bg-red-600', glow: 'rgba(220, 38, 38, 0.6)' },
    G: { bg: 'bg-green-600', glow: 'rgba(22, 163, 74, 0.6)' },
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setActiveCommanderIndex(0) // Reset to first commander
      }}
      onMouseMove={handleMouseMove}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] border-2 border-slate-700/50 hover:border-blue-500/50 shadow-xl hover:shadow-2xl"
      style={{
        height: '380px',
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Commander Art Background with Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        {commanderImages.length > 0 ? (
          <>
            {/* Image Layers - Slide animation for partners */}
            {commanderImages.map((imageUrl, idx) => (
              <div
                key={idx}
                className="absolute inset-0 transition-all duration-1000 ease-in-out"
                style={{
                  transform: hasPartners
                    ? `translateX(${(idx - activeCommanderIndex) * 100}%) translate(${parallaxX}px, ${parallaxY}px) scale(${isHovered ? 1.08 : 1.05})`
                    : `translate(${parallaxX}px, ${parallaxY}px) scale(${isHovered ? 1.08 : 1.05})`,
                  willChange: 'transform',
                  opacity: hasPartners ? (idx === activeCommanderIndex ? 1 : 0) : 1,
                }}
              >
                <img
                  src={imageUrl}
                  alt={deck.commanders?.[idx] || 'Commander'}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 20%' }}
                />
              </div>
            ))}
            
            {/* Edge Fade Vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/90" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-slate-900/60" />
            
            {/* Holographic Shine */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle 400px at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
                mixBlendMode: 'overlay',
              }}
            />
            
            {/* Subtle Rainbow Refraction */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none"
              style={{
                background: `linear-gradient(${glareX * 2}deg, 
                  rgba(147, 51, 234, 0.15) 0%,
                  rgba(59, 130, 246, 0.15) 33%,
                  rgba(16, 185, 129, 0.15) 66%,
                  rgba(251, 191, 36, 0.15) 100%)`,
                mixBlendMode: 'screen',
              }}
            />
            
            {/* Animated Scan Lines */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
              <div
                className="h-full w-full"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                }}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-8xl opacity-20">🃏</div>
          </div>
        )}
      </div>

      {/* Content Card - Frosted Glass Effect */}
      <div className="relative h-full flex flex-col justify-between p-5">
        {/* Top Section: Color Pips + Partner Indicator */}
        <div className="flex justify-between items-start">
          <div className="flex gap-2 drop-shadow-lg">
            {deck.colors && deck.colors.length > 0 ? (
              deck.colors.map((color, idx) => (
                <div
                  key={`${color}-${idx}`}
                  className={`w-7 h-7 rounded-full ${colorMap[color]?.bg || 'bg-gray-500'} border-2 border-white/80 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}
                  style={{
                    boxShadow: isHovered ? `0 0 20px ${colorMap[color]?.glow || 'rgba(100,100,100,0.5)'}` : undefined,
                    transitionDelay: `${idx * 50}ms`
                  }}
                  title={color}
                />
              ))
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-400 border-2 border-white/80 shadow-lg" title="Colorless" />
            )}
          </div>

          {/* Partner Indicator Dots */}
          {hasPartners && (
            <div className="flex gap-1.5">
              {[0, 1].map(idx => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    idx === activeCommanderIndex
                      ? 'bg-purple-400 shadow-lg shadow-purple-500/50 scale-125'
                      : 'bg-slate-600 scale-100'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Section: Info Card with Frosted Glass */}
        <div 
          className="bg-slate-900/85 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl transition-all duration-300 group-hover:bg-slate-900/90 group-hover:border-white/20"
          style={{
            boxShadow: isHovered ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.4)'
          }}
        >
          <h3 className="text-white font-bold text-xl mb-2 line-clamp-2 drop-shadow-lg tracking-tight">
            {deck.name || 'Unnamed Deck'}
          </h3>
          
          {deck.commanders && deck.commanders.length > 0 && (
            <div className="text-blue-300/90 text-sm font-medium mb-3 drop-shadow-md">
              {deck.commanders.length === 1 ? (
                <p className="line-clamp-1">⚔️ {deck.commanders[0]}</p>
              ) : (
                <div className="relative h-5 overflow-hidden">
                  {deck.commanders.map((commander, idx) => (
                    <p
                      key={idx}
                      className={`absolute inset-x-0 line-clamp-1 transition-all duration-700 ${
                        idx === 0 ? 'text-blue-300/90' : 'text-purple-300/90'
                      }`}
                      style={{
                        transform: `translateY(${(idx - activeCommanderIndex) * 100}%)`,
                        opacity: idx === activeCommanderIndex ? 1 : 0,
                      }}
                    >
                      {idx === 0 ? '⚔️' : '🤝'} {commander}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400/80 font-medium">
            <span className="flex items-center gap-1">
              <span className="text-slate-500">🃏</span>
              {deck.totalCards || 0} cards
            </span>
            <span className="text-slate-500">
              {deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only show if not sandbox */}
      {!isSandbox && onEdit && onDelete && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="bg-blue-600/90 hover:bg-blue-700 backdrop-blur-sm text-white rounded-lg w-9 h-9 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 border border-blue-400/30"
            title="Edit deck"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="bg-red-600/90 hover:bg-red-700 backdrop-blur-sm text-white rounded-lg w-9 h-9 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 border border-red-400/30"
            title="Delete deck"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Border Glow on Hover */}
      <div
        className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle 600px at ${glareX}% ${glareY}%, rgba(59, 130, 246, 0.4), transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />
    </div>
  )
}