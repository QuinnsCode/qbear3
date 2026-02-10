// app/components/Draft/DraftPool.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

interface Props {
  cards: string[]
  draftId: string
  compact?: boolean
  sideboardCards?: string[]
  onMoveToSideboard?: (cardId: string) => void
  onMoveToMainDeck?: (cardId: string) => void
  showDeckCounter?: boolean
  onClearSideboard?: () => void
}

type SortMode = 'cmc' | 'color'

export default function DraftPool({
  cards,
  draftId,
  compact = false,
  sideboardCards = [],
  onMoveToSideboard,
  onMoveToMainDeck,
  showDeckCounter = false,
  onClearSideboard
}: Props) {
  const [cardData, setCardData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'maindeck' | 'sideboard'>('maindeck')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('cmc')
  const [cardScale, setCardScale] = useState(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draftPool:cardScale')
      return saved ? parseFloat(saved) : 1.0
    }
    return 1.0
  })
  
  // Drag state
  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const [isDraggingOverSideboard, setIsDraggingOverSideboard] = useState(false)
  const sideboardDropRef = useRef<HTMLDivElement>(null)

  // Save scale to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('draftPool:cardScale', cardScale.toString())
    }
  }, [cardScale])
  
  // Fetch all cards (both maindeck and sideboard)
  useEffect(() => {
    const allCards = [...new Set([...cards, ...sideboardCards])]
    
    if (allCards.length === 0) {
      setLoading(false)
      return
    }
    
    const fetchCards = async () => {
      const chunks = chunkArray(allCards, 75)
      const allData: Record<string, any> = {}
      
      for (const chunk of chunks) {
        try {
          const response = await fetch('https://api.scryfall.com/cards/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifiers: chunk.map(id => ({ id }))
            })
          })
          
          const data = await response.json()
          data.data.forEach((card: any) => {
            allData[card.id] = card
          })
          
          await new Promise(r => setTimeout(r, 100))
        } catch (error) {
          console.error('Failed to fetch cards:', error)
        }
      }
      
      setCardData(allData)
      setLoading(false)
    }
    
    fetchCards()
  }, [cards, sideboardCards])
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin text-4xl">⚙️</div>
        <p className="text-slate-400 mt-2">Loading cards...</p>
      </div>
    )
  }
  
  const displayCards = selectedView === 'maindeck' ? cards : sideboardCards
  const hasCards = displayCards.length > 0
  const hasSideboard = onMoveToSideboard && onMoveToMainDeck
  
  if (!hasCards && selectedView === 'maindeck' && cards.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No cards picked yet
      </div>
    )
  }
  
  const grouped = sortMode === 'cmc' 
    ? groupByCMC(displayCards, cardData)
    : groupByColor(displayCards, cardData)
  
  // Drag handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragEnd = () => {
    setDraggedCard(null)
    setIsDraggingOverSideboard(false)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDropOnSideboard = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedCard && onMoveToSideboard) {
      onMoveToSideboard(draggedCard)
    }
    setDraggedCard(null)
    setIsDraggingOverSideboard(false)
  }
  
  const handleDropOnMainDeck = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedCard && onMoveToMainDeck) {
      onMoveToMainDeck(draggedCard)
    }
    setDraggedCard(null)
    setIsDraggingOverSideboard(false)
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header: Counter, View Toggle, Sort Toggle */}
      {(showDeckCounter || hasSideboard) && (
        <div className="flex flex-col gap-2 mb-2 px-2">
          {/* Top row: Counter + Sort */}
          <div className="flex items-center justify-between">
            {showDeckCounter && (
              <div className="text-sm font-semibold">
                <span className={cards.length >= 40 ? 'text-green-400' : 'text-yellow-400'}>
                  Main: {cards.length}/40
                </span>
                {hasSideboard && (
                  <span className="text-purple-400 ml-3">
                    Side: {sideboardCards.length}
                  </span>
                )}
              </div>
            )}

            {/* Sort toggle */}
            <div className="flex gap-1 bg-slate-700/50 rounded p-1">
              <button
                onClick={() => setSortMode('cmc')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                  sortMode === 'cmc'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by mana cost"
              >
                CMC
              </button>
              <button
                onClick={() => setSortMode('color')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                  sortMode === 'color'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by color"
              >
                Color
              </button>
            </div>
          </div>

          {/* Card Scale Slider */}
          <div className="flex items-center gap-2">
            <ZoomOut className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={cardScale}
              onChange={(e) => setCardScale(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
            />
            <ZoomIn className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[9px] text-slate-400 w-8 text-center shrink-0">
              {Math.round(cardScale * 100)}%
            </span>
          </div>
          
          {/* Bottom row: View Toggle + Sideboard Drop Zone */}
          {hasSideboard && (
            <div className="flex gap-2">
              <div className="flex gap-1 bg-slate-700/50 rounded p-1 flex-1">
                <button
                  onClick={() => setSelectedView('maindeck')}
                  onDragOver={selectedView === 'sideboard' ? handleDragOver : undefined}
                  onDrop={selectedView === 'sideboard' ? handleDropOnMainDeck : undefined}
                  className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    selectedView === 'maindeck'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-600'
                  }`}
                >
                  Main Deck ({cards.length})
                </button>
                <button
                  ref={sideboardDropRef}
                  onClick={() => setSelectedView('sideboard')}
                  onDragOver={selectedView === 'maindeck' ? handleDragOver : undefined}
                  onDragEnter={selectedView === 'maindeck' ? () => setIsDraggingOverSideboard(true) : undefined}
                  onDragLeave={selectedView === 'maindeck' ? () => setIsDraggingOverSideboard(false) : undefined}
                  onDrop={selectedView === 'maindeck' ? handleDropOnSideboard : undefined}
                  className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    selectedView === 'sideboard'
                      ? 'bg-purple-600 text-white'
                      : isDraggingOverSideboard
                        ? 'bg-purple-500 text-white ring-2 ring-purple-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                  }`}
                >
                  Sideboard ({sideboardCards.length})
                  {selectedView === 'maindeck' && ' ⬅ Drop here'}
                </button>
              </div>
              
              {/* Clear Sideboard Button */}
              {selectedView === 'sideboard' && sideboardCards.length > 0 && onClearSideboard && (
                <button
                  onClick={() => {
                    if (confirm(`Clear all ${sideboardCards.length} cards from sideboard?\n\nThey will be moved back to main deck.`)) {
                      onClearSideboard()
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded text-xs font-semibold transition-all border border-red-600/50"
                  title="Clear sideboard"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Card Groups - Pile Stacking */}
      <div className="flex-1 overflow-y-auto space-y-2 px-2">
        {!hasCards ? (
          <div className="text-center py-8 text-slate-500">
            {selectedView === 'sideboard' ? 'No cards in sideboard' : 'No cards picked yet'}
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, cardIds]) => (
            <div key={groupName}>
              <h4 className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                {sortMode === 'color' ? getColorIcon(groupName) : `💎 ${groupName}`}
                {sortMode === 'color' ? groupName : `CMC ${groupName}`} ({cardIds.length})
              </h4>

              {/* Card Pile Container - Show LAST card on top */}
              <div className="relative">
                <div className="flex flex-wrap gap-x-1">
                  {cardIds.map((cardId, index) => {
                    const card = cardData[cardId]
                    const imageUrl = card?.image_uris?.small || card?.card_faces?.[0]?.image_uris?.small
                    const isHovered = hoveredCard === cardId
                    const isDragging = draggedCard === cardId

                    // Reverse index so last card appears on top
                    const displayIndex = cardIds.length - 1 - index
                    const zIndex = displayIndex

                    // Calculate scaled dimensions
                    const baseWidth = compact ? 60 : 80
                    const baseHeight = compact ? 84 : 112
                    const scaledWidth = Math.round(baseWidth * cardScale)
                    const scaledHeight = Math.round(baseHeight * cardScale)

                    return (
                      <div
                        key={`${cardId}-${index}`}
                        draggable={hasSideboard}
                        onDragStart={(e) => handleDragStart(e, cardId)}
                        onDragEnd={handleDragEnd}
                        className={`relative group cursor-pointer select-none ${
                          isDragging ? 'opacity-50' : ''
                        }`}
                        style={{
                          width: `${scaledWidth}px`,
                          zIndex: isHovered ? 999 : zIndex,
                        }}
                        onMouseEnter={() => setHoveredCard(cardId)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {/* Card Image - Show last in pile */}
                        <div
                          className={`relative transition-all duration-200 ${
                            isHovered ? 'scale-150 shadow-2xl' : ''
                          }`}
                          style={{
                            height: `${scaledHeight}px`,
                          }}
                        >
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={card.name}
                              className="w-full h-full object-cover rounded shadow-lg pointer-events-none"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-700 rounded" />
                          )}
                        </div>
                        
                        {/* Quick Move Buttons on Hover */}
                        {isHovered && hasSideboard && !isDragging && (
                          <div className="absolute -bottom-8 left-0 right-0 flex gap-1 z-[1000]">
                            {selectedView === 'maindeck' && onMoveToSideboard && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMoveToSideboard(cardId)
                                }}
                                className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-all shadow-lg"
                                title="Move to sideboard"
                              >
                                →Side
                              </button>
                            )}
                            {selectedView === 'sideboard' && onMoveToMainDeck && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMoveToMainDeck(cardId)
                                }}
                                className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-all shadow-lg"
                                title="Move to main deck"
                              >
                                →Main
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Spacer for hover buttons */}
                <div style={{ height: '40px' }} />
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Drag instruction hint */}
      {hasSideboard && selectedView === 'maindeck' && cards.length > 0 && (
        <div className="px-2 py-2 text-xs text-slate-400 text-center border-t border-slate-700">
          💡 Drag cards to Sideboard button or click →Side
        </div>
      )}
    </div>
  )
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

function getCMC(card: any): number {
  if (!card) return 0
  return card.cmc || 0
}

function groupByCMC(cardIds: string[], cardData: Record<string, any>): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  
  for (const cardId of cardIds) {
    const card = cardData[cardId]
    if (!card) continue
    
    const cmc = getCMC(card)
    const key = cmc.toString()
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(cardId)
  }
  
  // Sort by CMC numerically
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => parseInt(a) - parseInt(b))
  )
}

function groupByColor(cardIds: string[], cardData: Record<string, any>): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    'White': [],
    'Blue': [],
    'Black': [],
    'Red': [],
    'Green': [],
    'Multicolor': [],
    'Colorless': []
  }
  
  for (const cardId of cardIds) {
    const card = cardData[cardId]
    if (!card) continue
    
    const colors = card.colors || []
    
    if (colors.length === 0) {
      groups['Colorless'].push(cardId)
    } else if (colors.length > 1) {
      groups['Multicolor'].push(cardId)
    } else {
      const color = colors[0]
      const colorName = {
        'W': 'White',
        'U': 'Blue',
        'B': 'Black',
        'R': 'Red',
        'G': 'Green'
      }[color] || 'Colorless'
      
      groups[colorName].push(cardId)
    }
  }
  
  return Object.fromEntries(
    Object.entries(groups).filter(([_, cards]) => cards.length > 0)
  )
}

function getColorIcon(color: string): string {
  const icons: Record<string, string> = {
    'White': '☀️',
    'Blue': '💧',
    'Black': '💀',
    'Red': '🔥',
    'Green': '🌳',
    'Multicolor': '🌈',
    'Colorless': '⚪'
  }
  return icons[color] || '⚪'
}