// app/components/Draft/DraftDeckBuilderModal.tsx
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { CubeCard } from '@/app/types/Draft'
import type { BasicLandColor } from '@/app/types/Deck'
import { BASIC_LANDS } from '@/app/types/Deck'
import { X, Plus, Minus, ZoomIn, ZoomOut } from 'lucide-react'

interface Props {
  draftPool: string[]
  cubeCards: CubeCard[]
  playerId: string
  playerName: string
  onClose: () => void
  onFinalize: (deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<BasicLandColor, number>
  }) => Promise<void>
  initialConfig?: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<BasicLandColor, number>
  }
}

interface DeckCardEntry {
  scryfallId: string
  card: CubeCard
  quantity: number
}

type ViewTab = 'deck' | 'sideboard'

export default function DraftDeckBuilderModal({
  draftPool,
  cubeCards,
  playerId,
  playerName,
  onClose,
  onFinalize,
  initialConfig
}: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [viewTab, setViewTab] = useState<ViewTab>('deck')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [cardScale, setCardScale] = useState(1.0)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const [mainDeck, setMainDeck] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    initialConfig?.mainDeck.forEach(({ scryfallId, quantity }) => {
      map.set(scryfallId, quantity)
    })
    return map
  })
  
  const [basics, setBasics] = useState<Record<BasicLandColor, number>>(
    initialConfig?.basics || { W: 0, U: 0, B: 0, R: 0, G: 0 }
  )
  
  const [isFinalizing, setIsFinalizing] = useState(false)

  const mainDeckCardCount = useMemo(() => {
    return Array.from(mainDeck.values()).reduce((sum, qty) => sum + qty, 0)
  }, [mainDeck])

  const basicLandCount = useMemo(() => {
    return Object.values(basics).reduce((sum, count) => sum + count, 0)
  }, [basics])

  const totalMainDeckCards = mainDeckCardCount + basicLandCount

  const sideboardCount = useMemo(() => {
    const mainDeckIds = new Set(Array.from(mainDeck.keys()))
    return draftPool.filter(id => !mainDeckIds.has(id)).length
  }, [draftPool, mainDeck])

  const canFinalize = totalMainDeckCards >= 40

  const availableInPool = useMemo(() => {
    const used = new Set(Array.from(mainDeck.keys()))
    return draftPool.filter(id => !used.has(id)).map(id => 
      cubeCards.find(c => c.scryfallId === id)
    ).filter(Boolean) as CubeCard[]
  }, [draftPool, cubeCards, mainDeck])

  const currentDeckEntries = useMemo(() => {
    return Array.from(mainDeck.entries()).map(([scryfallId, quantity]) => ({
      scryfallId,
      card: cubeCards.find(c => c.scryfallId === scryfallId)!,
      quantity
    })).filter(e => e.card)
  }, [mainDeck, cubeCards])

  // Group by CMC (Arena style)
  const deckByCMC = useMemo(() => {
    const groups: Record<number, DeckCardEntry[]> = {}
    
    currentDeckEntries.forEach(entry => {
      const cmc = entry.card.cmc || 0
      if (!groups[cmc]) groups[cmc] = []
      groups[cmc].push(entry)
    })
    
    // Sort within each CMC group by name
    Object.values(groups).forEach(group => {
      group.sort((a, b) => a.card.name.localeCompare(b.card.name))
    })
    
    return groups
  }, [currentDeckEntries])

  const addCard = useCallback((scryfallId: string) => {
    setMainDeck(prev => {
      const newMap = new Map(prev)
      newMap.set(scryfallId, (newMap.get(scryfallId) || 0) + 1)
      return newMap
    })
  }, [])

  const removeCard = useCallback((scryfallId: string) => {
    setMainDeck(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(scryfallId) || 0
      if (current > 1) {
        newMap.set(scryfallId, current - 1)
      } else {
        newMap.delete(scryfallId)
      }
      return newMap
    })
  }, [])

  const adjustBasic = useCallback((color: BasicLandColor, delta: number) => {
    setBasics(prev => ({
      ...prev,
      [color]: Math.max(0, prev[color] + delta)
    }))
  }, [])

  const suggestBasics = useCallback(() => {
    const colorCounts: Record<string, number> = {}
    currentDeckEntries.forEach(entry => {
      entry.card.colors.forEach(color => {
        colorCounts[color] = (colorCounts[color] || 0) + entry.quantity
      })
    })

    const totalColorSymbols = Object.values(colorCounts).reduce((sum, count) => sum + count, 0)
    const landsNeeded = Math.max(0, 40 - mainDeckCardCount)

    if (landsNeeded === 0 || totalColorSymbols === 0) return

    const suggestedBasics: Record<BasicLandColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 }
    
    Object.entries(colorCounts).forEach(([color, count]) => {
      const ratio = count / totalColorSymbols
      suggestedBasics[color as BasicLandColor] = Math.round(landsNeeded * ratio)
    })

    const total = Object.values(suggestedBasics).reduce((sum, count) => sum + count, 0)
    if (total !== landsNeeded) {
      const mainColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as BasicLandColor
      if (mainColor) {
        suggestedBasics[mainColor] += (landsNeeded - total)
      }
    }

    setBasics(suggestedBasics)
  }, [currentDeckEntries, mainDeckCardCount])

  const handleFinalize = async () => {
    if (!canFinalize) return
    setIsFinalizing(true)
    try {
      const mainDeckIds = new Set(Array.from(mainDeck.keys()))
      const sideboardCards = draftPool
        .filter(scryfallId => !mainDeckIds.has(scryfallId))
        .map(scryfallId => ({ scryfallId, quantity: 1 }))
      
      await onFinalize({
        mainDeck: Array.from(mainDeck.entries()).map(([scryfallId, quantity]) => ({
          scryfallId,
          quantity
        })),
        sideboard: sideboardCards,
        basics
      })
    } catch (error) {
      console.error('Failed to finalize deck:', error)
      alert('Failed to save deck. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Render card with quantity badge
  // stackMode: 'none' = full card, 'column' = stack in CMC column with last card full
  const renderDeckCard = (entry: DeckCardEntry, stackMode: 'none' | 'column' = 'none', isLastInStack: boolean = false) => {
    const isExpanded = expandedCard === entry.scryfallId
    
    // Calculate scaled dimensions
    const baseWidth = 64
    const scaledWidth = Math.round(baseWidth * cardScale)
    const scaledHeight = Math.round(scaledWidth * 1.4)
    
    // Arena-style stacking: show top 30% of stacked cards
    const stackedShowHeight = Math.round(scaledHeight * 0.3)
    
    // Determine if this card should show fully
    const shouldShowFull = stackMode === 'none' || isLastInStack || isExpanded
    
    return (
      <div
        key={entry.scryfallId}
        className="relative"
        style={{
          height: shouldShowFull ? `${scaledHeight}px` : `${stackedShowHeight}px`,
          width: `${scaledWidth}px`,
        }}
      >
        <button
          onClick={() => {
            if (isMobile && !isExpanded) {
              setExpandedCard(entry.scryfallId)
            } else {
              removeCard(entry.scryfallId)
              setExpandedCard(null)
            }
          }}
          onMouseEnter={() => !isMobile && setExpandedCard(entry.scryfallId)}
          onMouseLeave={() => !isMobile && setExpandedCard(null)}
          className={`absolute top-0 left-0 rounded overflow-hidden border border-slate-700 ${
            isExpanded ? 'border-red-500 z-20 shadow-2xl' : 'z-10'
          } transition-all group`}
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <img 
            src={entry.card.imageUrl} 
            alt={entry.card.name} 
            className="w-full h-full object-cover pointer-events-none"
          />
          {entry.quantity > 1 && (
            <div className="absolute top-0 right-0 bg-black/90 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl z-10">
              {entry.quantity}
            </div>
          )}
          {isExpanded && (
            <div className="absolute inset-0 bg-red-500/10 transition-colors" />
          )}
        </button>
      </div>
    )
  }

  const renderPoolCard = (card: CubeCard) => {
    const isExpanded = expandedCard === card.scryfallId
    
    const baseWidth = 64
    const scaledWidth = Math.round(baseWidth * cardScale)
    const scaledHeight = Math.round(scaledWidth * 1.4)
    
    return (
      <button
        key={card.scryfallId}
        onClick={() => {
          if (isMobile && !isExpanded) {
            setExpandedCard(card.scryfallId)
          } else {
            addCard(card.scryfallId)
            setExpandedCard(null)
          }
        }}
        onMouseEnter={() => !isMobile && setExpandedCard(card.scryfallId)}
        onMouseLeave={() => !isMobile && setExpandedCard(null)}
        className={`relative rounded overflow-hidden border border-slate-700 ${
          isExpanded ? 'border-blue-500 z-20 shadow-2xl scale-110' : ''
        } transition-all group flex-shrink-0`}
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`
        }}
      >
        <img 
          src={card.imageUrl} 
          alt={card.name} 
          className="w-full h-full object-cover pointer-events-none"
        />
        {isExpanded && (
          <div className="absolute inset-0 bg-blue-500/10 transition-colors flex items-center justify-center">
            <div className="bg-blue-600 text-white rounded-full p-1">
              <Plus className="w-3 h-3" />
            </div>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-white text-lg font-bold">{isMobile ? 'Build Deck' : 'Build Your Deck'}</h2>
            <p className="text-gray-400 text-xs">{playerName}</p>
          </div>
          
          {/* Deck/Sideboard Tabs */}
          <div className="flex gap-1 bg-slate-700/50 rounded p-0.5">
            <button
              onClick={() => setViewTab('deck')}
              className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                viewTab === 'deck'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Deck ({totalMainDeckCards}/40)
            </button>
            <button
              onClick={() => setViewTab('sideboard')}
              className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                viewTab === 'sideboard'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sideboard ({sideboardCount})
            </button>
          </div>
        </div>
        
        <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">×</button>
      </div>

      {/* Content */}
      {viewTab === 'deck' ? (
        <div className="flex-1 overflow-y-auto bg-slate-900">
          {/* Draft Pool */}
          <div className="border-b border-slate-700 p-2 bg-slate-800/50">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-white text-sm font-bold flex-shrink-0">📦 Pool ({availableInPool.length})</h3>
              
              {/* Horizontal Scale Slider */}
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <ZoomOut className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={cardScale}
                  onChange={(e) => setCardScale(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
                />
                <ZoomIn className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-[9px] text-slate-400 w-8 text-center flex-shrink-0">
                  {Math.round(cardScale * 100)}%
                </span>
              </div>
              
              {sideboardCount > 0 && (
                <span className="text-purple-400 text-xs bg-purple-600/20 px-2 py-0.5 rounded-full flex-shrink-0">
                  💼 {sideboardCount} → Sideboard
                </span>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {availableInPool.map(card => renderPoolCard(card))}
            </div>
          </div>

          {/* Deck Builder - CMC Columns */}
          <div className="p-2">
            <div className="flex gap-1 overflow-x-auto">
              {/* CMC Columns 0-7+ */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map(cmc => {
                const cards = deckByCMC[cmc] || []
                const allHighCMCCards = cmc === 7
                  ? Object.entries(deckByCMC)
                      .filter(([c]) => parseInt(c) >= 7)
                      .flatMap(([_, entries]) => entries)
                  : cards
                
                const displayCmc = cmc === 7 ? '7+' : cmc.toString()
                const cardsCount = allHighCMCCards.reduce((sum, e) => sum + e.quantity, 0)
                
                return (
                  <div key={cmc} className="flex-shrink-0">
                    <div className="bg-slate-800 rounded p-1 mb-1 text-center">
                      <span className="text-white text-xs font-bold">{displayCmc}</span>
                      <span className="text-gray-400 text-xs ml-1">({cardsCount})</span>
                    </div>
                    <div className="flex flex-col min-h-[100px]">
                      {allHighCMCCards.map((entry, index) => 
                        renderDeckCard(entry, 'column', index === allHighCMCCards.length - 1)
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Lands Section - Horizontal Stack */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white text-sm font-bold">🏔️ Lands ({basicLandCount})</h4>
                <button
                  onClick={suggestBasics}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Auto-fill
                </button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(BASIC_LANDS) as BasicLandColor[]).map(color => (
                  basics[color] > 0 && (
                    <div key={color} className="flex items-center gap-1 bg-slate-800 rounded p-1">
                      <span className="text-sm">
                        {color === 'W' ? '⚪' : color === 'U' ? '🔵' : color === 'B' ? '⚫' : color === 'R' ? '🔴' : '🟢'}
                      </span>
                      <button
                        onClick={() => adjustBasic(color, -1)}
                        className="p-0.5 hover:bg-slate-700 rounded"
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                      <span className="text-white font-mono text-sm w-6 text-center">{basics[color]}</span>
                      <button
                        onClick={() => adjustBasic(color, 1)}
                        className="p-0.5 hover:bg-slate-700 rounded"
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )
                ))}
                
                {/* Show zero-count lands */}
                {(Object.keys(BASIC_LANDS) as BasicLandColor[]).map(color => (
                  basics[color] === 0 && (
                    <button
                      key={color}
                      onClick={() => adjustBasic(color, 1)}
                      className="flex items-center gap-1 bg-slate-800/50 hover:bg-slate-800 rounded p-1 border border-dashed border-slate-600"
                    >
                      <span className="text-sm opacity-50">
                        {color === 'W' ? '⚪' : color === 'U' ? '🔵' : color === 'B' ? '⚫' : color === 'R' ? '🔴' : '🟢'}
                      </span>
                      <Plus className="w-3 h-3 text-slate-500" />
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Sideboard View - Full cards in grid
        <div className="flex-1 overflow-y-auto bg-slate-900 p-3">
          {availableInPool.length > 0 ? (
            <div className="grid grid-cols-8 gap-2">
              {availableInPool.map(card => renderPoolCard(card))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg mb-2">Sideboard is empty</p>
              <p className="text-sm">Remove cards from main deck to add them here</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-white text-sm">
            <span className="font-bold text-lg">{totalMainDeckCards}</span>
            <span className="text-gray-400">/40</span>
          </div>
          {totalMainDeckCards < 40 && (
            <span className="text-amber-400 text-xs">Need {40 - totalMainDeckCards} more</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            disabled={!canFinalize || isFinalizing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded text-sm font-semibold"
          >
            {isFinalizing ? 'Saving...' : `Export Deck`}
          </button>
        </div>
      </div>

      {isFinalizing && (
        <div className="fixed inset-0 bg-black/70 z-10 flex items-center justify-center">
          <div className="bg-slate-800 rounded-xl p-6 flex flex-col items-center gap-3">
            <div className="animate-spin text-4xl">⚙️</div>
            <div className="text-white text-lg font-bold">Exporting...</div>
          </div>
        </div>
      )}
    </div>
  )
}