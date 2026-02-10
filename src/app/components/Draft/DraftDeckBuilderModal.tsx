// app/components/Draft/DraftDeckBuilderModal.tsx
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { CubeCard } from '@/app/types/Draft'
import type { BasicLandColor } from '@/app/types/Deck'
import { BASIC_LANDS } from '@/app/types/Deck'
import { X, Plus, Minus, ZoomIn, ZoomOut, LayoutGrid, BarChart3, Lock, Unlock } from 'lucide-react'

// Basic land display info - using Scryfall API for reliable images
const BASIC_LAND_INFO: Record<BasicLandColor, { name: string; scryfallId: string; imageUrl: string }> = {
  W: {
    name: 'Plains',
    scryfallId: 'plains',
    imageUrl: 'https://api.scryfall.com/cards/named?exact=Plains&set=fdn&format=image&version=large'
  },
  U: {
    name: 'Island',
    scryfallId: 'island',
    imageUrl: 'https://api.scryfall.com/cards/named?exact=Island&set=fdn&format=image&version=large'
  },
  B: {
    name: 'Swamp',
    scryfallId: 'swamp',
    imageUrl: 'https://api.scryfall.com/cards/named?exact=Swamp&set=fdn&format=image&version=large'
  },
  R: {
    name: 'Mountain',
    scryfallId: 'mountain',
    imageUrl: 'https://api.scryfall.com/cards/named?exact=Mountain&set=fdn&format=image&version=large'
  },
  G: {
    name: 'Forest',
    scryfallId: 'forest',
    imageUrl: 'https://api.scryfall.com/cards/named?exact=Forest&set=fdn&format=image&version=large'
  }
}

interface Props {
  draftId: string
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
type DeckViewMode = 'cmc' | 'freestack'

export default function DraftDeckBuilderModal({
  draftId,
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

  // Separate scales for deck and sideboard
  const [deckScale, setDeckScale] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deckBuilder:deckScale')
      return saved ? parseFloat(saved) : 1.0
    }
    return 1.0
  })
  const [sideboardScale, setSideboardScale] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deckBuilder:sideboardScale')
      return saved ? parseFloat(saved) : 1.0
    }
    return 1.0
  })
  const [scalesLocked, setScalesLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deckBuilder:scalesLocked')
      return saved === 'true'
    }
    return true // Default to locked
  })

  const [deckViewMode, setDeckViewMode] = useState<DeckViewMode>('cmc')
  const [draggedCard, setDraggedCard] = useState<{ scryfallId: string; fromColumn: number } | null>(null)

  // Custom columns for freestack mode - array of arrays, each representing a column
  const [customColumns, setCustomColumns] = useState<string[][]>(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.customColumns && Array.isArray(parsed.customColumns)) {
          return parsed.customColumns
        }
      }
    } catch (err) {
      console.warn('Failed to load customColumns from localStorage:', err)
    }
    // Start with 8 empty columns
    return Array(8).fill(null).map(() => [])
  })

  // localStorage key for this draft
  const storageKey = `draft_deck_${draftId}_${playerId}`

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Save scale settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deckBuilder:deckScale', deckScale.toString())
    }
  }, [deckScale])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deckBuilder:sideboardScale', sideboardScale.toString())
    }
  }, [sideboardScale])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deckBuilder:scalesLocked', scalesLocked.toString())
    }
  }, [scalesLocked])

  // Handlers for scale changes
  const handleDeckScaleChange = (newScale: number) => {
    setDeckScale(newScale)
    if (scalesLocked) {
      setSideboardScale(newScale)
    }
  }

  const handleSideboardScaleChange = (newScale: number) => {
    setSideboardScale(newScale)
    if (scalesLocked) {
      setDeckScale(newScale)
    }
  }

  const toggleScalesLock = () => {
    const newLocked = !scalesLocked
    setScalesLocked(newLocked)
    if (newLocked) {
      // When locking, sync sideboard to deck scale
      setSideboardScale(deckScale)
    }
  }

  const [mainDeck, setMainDeck] = useState<Map<string, number>>(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const map = new Map<string, number>()
        if (parsed.mainDeck && Array.isArray(parsed.mainDeck)) {
          parsed.mainDeck.forEach(([id, qty]: [string, number]) => {
            map.set(id, qty)
          })
          return map
        }
      }
    } catch (err) {
      console.warn('Failed to load saved deck from localStorage:', err)
    }

    // Fall back to initialConfig
    const map = new Map<string, number>()
    initialConfig?.mainDeck.forEach(({ scryfallId, quantity }) => {
      map.set(scryfallId, quantity)
    })
    return map
  })

  // Initialize customColumns from mainDeck
  useEffect(() => {
    const allCardsInColumns = customColumns.flat()
    const mainDeckIds = Array.from(mainDeck.keys())

    // If there are cards in mainDeck not in customColumns, add them to first column
    const missingCards = mainDeckIds.filter(id => !allCardsInColumns.includes(id))
    if (missingCards.length > 0) {
      setCustomColumns(prev => {
        const newColumns = [...prev]
        newColumns[0] = [...newColumns[0], ...missingCards]
        return newColumns
      })
    }
  }, [mainDeck, customColumns])

  const [basics, setBasics] = useState<Record<BasicLandColor, number>>(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.basics) {
          return parsed.basics
        }
      }
    } catch (err) {
      console.warn('Failed to load saved basics from localStorage:', err)
    }

    // Fall back to initialConfig or defaults
    return initialConfig?.basics || { W: 0, U: 0, B: 0, R: 0, G: 0 }
  })

  // Save to localStorage whenever deck changes
  useEffect(() => {
    try {
      const deckData = {
        mainDeck: Array.from(mainDeck.entries()),
        basics,
        customColumns,
        timestamp: Date.now()
      }
      localStorage.setItem(storageKey, JSON.stringify(deckData))
    } catch (err) {
      console.warn('Failed to save deck to localStorage:', err)
    }
  }, [mainDeck, basics, customColumns, storageKey])
  
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

  // Freestack columns with card entries
  const freestackColumns = useMemo(() => {
    return customColumns.map(column =>
      column
        .map(scryfallId => currentDeckEntries.find(e => e.scryfallId === scryfallId))
        .filter(Boolean) as DeckCardEntry[]
    )
  }, [customColumns, currentDeckEntries])

  const addCard = useCallback((scryfallId: string) => {
    setMainDeck(prev => {
      const newMap = new Map(prev)
      const currentQty = newMap.get(scryfallId) || 0
      newMap.set(scryfallId, currentQty + 1)

      // Add to first column of custom columns if not already there
      if (currentQty === 0) {
        setCustomColumns(cols => {
          const newCols = [...cols]
          if (!newCols.flat().includes(scryfallId)) {
            newCols[0] = [...newCols[0], scryfallId]
          }
          return newCols
        })
      }

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
        // Remove from all custom columns
        setCustomColumns(cols =>
          cols.map(col => col.filter(id => id !== scryfallId))
        )
      }
      return newMap
    })
  }, [])

  const moveCardToColumn = useCallback((scryfallId: string, fromColumn: number, toColumn: number, toIndex: number) => {
    setCustomColumns(cols => {
      const newCols = cols.map(col => [...col])
      // Remove from source column
      newCols[fromColumn] = newCols[fromColumn].filter(id => id !== scryfallId)
      // Add to destination column at specified index
      newCols[toColumn].splice(toIndex, 0, scryfallId)
      return newCols
    })
  }, [])

  const addColumn = useCallback(() => {
    setCustomColumns(cols => [...cols, []])
  }, [])

  const removeColumn = useCallback((columnIndex: number) => {
    setCustomColumns(cols => {
      const newCols = [...cols]
      // Move cards from removed column to first column
      const cardsToMove = newCols[columnIndex]
      newCols[0] = [...newCols[0], ...cardsToMove]
      newCols.splice(columnIndex, 1)
      return newCols
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

      // Clear localStorage after successful finalization
      try {
        localStorage.removeItem(storageKey)
      } catch (err) {
        console.warn('Failed to clear saved deck from localStorage:', err)
      }
    } catch (error) {
      console.error('Failed to finalize deck:', error)
      alert('Failed to save deck. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Render card with quantity badge
  // stackMode: 'none' = full card, 'column' = stack in CMC column with last card full
  const renderDeckCard = (
    entry: DeckCardEntry,
    stackMode: 'none' | 'column' = 'none',
    isLastInStack: boolean = false,
    columnIndex?: number,
    cardIndexInColumn?: number
  ) => {
    const isExpanded = expandedCard === entry.scryfallId

    // Calculate scaled dimensions (50% larger base size: 64 -> 96)
    const baseWidth = 96
    const scaledWidth = Math.round(baseWidth * deckScale)
    const scaledHeight = Math.round(scaledWidth * 1.4)

    // Arena-style stacking: show top 30% of stacked cards
    const stackedShowHeight = Math.round(scaledHeight * 0.3)

    // Determine if this card should show fully
    const shouldShowFull = stackMode === 'none' || isLastInStack || isExpanded

    const isDraggable = deckViewMode === 'freestack' && columnIndex !== undefined
    const isBeingDragged = draggedCard?.scryfallId === entry.scryfallId

    return (
      <div
        key={entry.scryfallId}
        draggable={isDraggable}
        onDragStart={(e) => {
          if (isDraggable && columnIndex !== undefined) {
            setDraggedCard({ scryfallId: entry.scryfallId, fromColumn: columnIndex })
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('cardId', entry.scryfallId)
            e.dataTransfer.setData('fromColumn', columnIndex.toString())
          }
        }}
        onDragEnd={() => setDraggedCard(null)}
        onDragOver={(e) => {
          if (deckViewMode === 'freestack') {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDrop={(e) => {
          if (deckViewMode === 'freestack' && columnIndex !== undefined && cardIndexInColumn !== undefined) {
            e.preventDefault()
            e.stopPropagation()
            const draggedCardId = e.dataTransfer.getData('cardId')
            const fromColumn = parseInt(e.dataTransfer.getData('fromColumn'))
            if (draggedCardId && !isNaN(fromColumn)) {
              moveCardToColumn(draggedCardId, fromColumn, columnIndex, cardIndexInColumn)
            }
          }
        }}
        className="relative"
        style={{
          height: shouldShowFull ? `${scaledHeight}px` : `${stackedShowHeight}px`,
          width: `${scaledWidth}px`,
          opacity: isBeingDragged ? 0.5 : 1,
          cursor: isDraggable ? 'grab' : 'default'
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

  const renderPoolCard = (card: CubeCard, scale: number) => {
    const isExpanded = expandedCard === card.scryfallId

    const baseWidth = 96
    const scaledWidth = Math.round(baseWidth * scale)
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
        } transition-all group shrink-0`}
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

  const renderBasicLandCard = (color: BasicLandColor) => {
    const landInfo = BASIC_LAND_INFO[color]
    const quantity = basics[color]
    const isExpanded = expandedCard === landInfo.scryfallId

    const baseWidth = 96
    const scaledWidth = Math.round(baseWidth * deckScale)
    const scaledHeight = Math.round(scaledWidth * 1.4)

    return (
      <div key={color} className="relative shrink-0">
        <button
          onClick={() => adjustBasic(color, 1)}
          onContextMenu={(e) => {
            e.preventDefault()
            if (quantity > 0) adjustBasic(color, -1)
          }}
          onMouseEnter={() => !isMobile && setExpandedCard(landInfo.scryfallId)}
          onMouseLeave={() => !isMobile && setExpandedCard(null)}
          className={`relative rounded overflow-hidden border-2 ${
            quantity > 0 ? 'border-blue-500' : 'border-slate-600 opacity-50'
          } ${
            isExpanded ? 'shadow-2xl scale-105 z-20' : ''
          } transition-all group`}
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`
          }}
        >
          <img
            src={landInfo.imageUrl}
            alt={landInfo.name}
            className="w-full h-full object-cover pointer-events-none"
          />
          {quantity > 0 && (
            <div className="absolute top-0 right-0 bg-black/90 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl z-10">
              {quantity}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
            <div className="text-white text-xs font-semibold text-center">{landInfo.name}</div>
          </div>
          {isExpanded && (
            <div className="absolute inset-0 bg-blue-500/10 transition-colors flex items-center justify-center">
              <div className="bg-blue-600 text-white rounded-full p-2">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          )}
        </button>
        {quantity > 0 && (
          <button
            onClick={() => adjustBasic(color, -1)}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-lg z-20 transition-all"
            title={`Remove ${landInfo.name}`}
          >
            <Minus className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700 shrink-0">
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
              <h3 className="text-white text-sm font-bold shrink-0">📦 Pool ({availableInPool.length})</h3>
              
              {/* Deck Scale Slider */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[9px] text-slate-400 shrink-0">Deck:</span>
                <ZoomOut className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={deckScale}
                  onChange={(e) => handleDeckScaleChange(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
                />
                <ZoomIn className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-[9px] text-slate-400 w-8 text-center shrink-0">
                  {Math.round(deckScale * 100)}%
                </span>
              </div>

              {/* Lock Button */}
              <button
                onClick={toggleScalesLock}
                className={`p-1 rounded transition-all ${
                  scalesLocked
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
                title={scalesLocked ? 'Unlock scales' : 'Lock scales together'}
              >
                {scalesLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>

              {/* Sideboard Scale Slider */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[9px] text-slate-400 shrink-0">Side:</span>
                <ZoomOut className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={sideboardScale}
                  onChange={(e) => handleSideboardScaleChange(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-0"
                />
                <ZoomIn className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-[9px] text-slate-400 w-8 text-center shrink-0">
                  {Math.round(sideboardScale * 100)}%
                </span>
              </div>
              
              {sideboardCount > 0 && (
                <span className="text-purple-400 text-xs bg-purple-600/20 px-2 py-0.5 rounded-full shrink-0">
                  💼 {sideboardCount} → Sideboard
                </span>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {availableInPool.map(card => renderPoolCard(card, deckScale))}
            </div>
          </div>

          {/* Deck Builder */}
          <div className="p-2">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1 bg-slate-800 rounded p-0.5">
                <button
                  onClick={() => setDeckViewMode('cmc')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                    deckViewMode === 'cmc'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>CMC</span>
                </button>
                <button
                  onClick={() => setDeckViewMode('freestack')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                    deckViewMode === 'freestack'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Freestack</span>
                </button>
              </div>
              {deckViewMode === 'freestack' && (
                <span className="text-xs text-slate-400">Drag cards to reorder</span>
              )}
            </div>

            {deckViewMode === 'cmc' ? (
              // CMC Columns View
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
                    <div key={cmc} className="shrink-0">
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
            ) : (
              // Freestack View - Custom Columns
              <div className="flex gap-1 overflow-x-auto">
                {freestackColumns.map((column, columnIndex) => {
                  const cardsCount = column.reduce((sum, e) => sum + e.quantity, 0)

                  return (
                    <div
                      key={columnIndex}
                      className="shrink-0"
                      onDragOver={(e) => {
                        if (deckViewMode === 'freestack') {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }
                      }}
                      onDrop={(e) => {
                        if (deckViewMode === 'freestack') {
                          e.preventDefault()
                          const draggedCardId = e.dataTransfer.getData('cardId')
                          const fromColumn = parseInt(e.dataTransfer.getData('fromColumn'))
                          if (draggedCardId && !isNaN(fromColumn)) {
                            // Drop at end of column
                            moveCardToColumn(draggedCardId, fromColumn, columnIndex, column.length)
                          }
                        }
                      }}
                    >
                      <div className="bg-slate-800 rounded p-1 mb-1 text-center flex items-center justify-between gap-2">
                        <span className="text-white text-xs font-bold flex-1">
                          Col {columnIndex + 1}
                        </span>
                        <span className="text-gray-400 text-xs">({cardsCount})</span>
                        {columnIndex > 0 && column.length === 0 && (
                          <button
                            onClick={() => removeColumn(columnIndex)}
                            className="text-red-400 hover:text-red-300 text-xs"
                            title="Remove column"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col min-h-[100px] bg-slate-900/30 rounded p-1">
                        {column.map((entry, cardIndex) =>
                          renderDeckCard(entry, 'column', cardIndex === column.length - 1, columnIndex, cardIndex)
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Add Column Button */}
                <div className="shrink-0">
                  <button
                    onClick={addColumn}
                    className="bg-slate-800/50 hover:bg-slate-700 rounded p-2 min-h-[100px] flex items-center justify-center border-2 border-dashed border-slate-600 hover:border-slate-500 transition-all"
                    style={{ width: '96px' }}
                  >
                    <Plus className="w-6 h-6 text-slate-500" />
                  </button>
                </div>
              </div>
            )}

            {/* Lands Section - Card Display */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white text-sm font-bold">🏔️ Basic Lands ({basicLandCount})</h4>
                <button
                  onClick={suggestBasics}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                >
                  Auto-fill Lands
                </button>
              </div>

              <div className="text-xs text-slate-400 mb-2">
                Click to add • Right-click to remove • Auto-fill suggests lands based on your deck colors
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {(Object.keys(BASIC_LANDS) as BasicLandColor[]).map(color =>
                  renderBasicLandCard(color)
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Sideboard View - Full cards in grid
        <div className="flex-1 overflow-y-auto bg-slate-900 flex flex-col">
          {/* Sideboard Scale Control */}
          <div className="bg-slate-800/50 border-b border-slate-700 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">Sideboard Scale:</span>
              <ZoomOut className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={sideboardScale}
                onChange={(e) => handleSideboardScaleChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-0"
              />
              <ZoomIn className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-[9px] text-slate-400 w-8 text-center shrink-0">
                {Math.round(sideboardScale * 100)}%
              </span>
              <button
                onClick={toggleScalesLock}
                className={`p-1 rounded transition-all ${
                  scalesLocked
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
                title={scalesLocked ? 'Scales are locked - changes affect both' : 'Lock scales together'}
              >
                {scalesLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {availableInPool.length > 0 ? (
              <div className="grid grid-cols-8 gap-2">
                {availableInPool.map(card => renderPoolCard(card, sideboardScale))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg mb-2">Sideboard is empty</p>
                <p className="text-sm">Remove cards from main deck to add them here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-2 flex items-center justify-between shrink-0">
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