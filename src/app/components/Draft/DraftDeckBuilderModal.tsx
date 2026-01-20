// app/components/Draft/DraftDeckBuilderModal.tsx
'use client'

import { useState, useMemo, useCallback } from 'react'
import type { CubeCard } from '@/app/types/Draft'
import type { DeckV4, BasicLandColor } from '@/app/types/Deck'
import { BASIC_LANDS } from '@/app/types/Deck'
import { X, Plus, Minus, Check } from 'lucide-react'

interface Props {
  draftPool: string[]  // scryfallIds of all drafted cards
  cubeCards: CubeCard[]  // Full card data
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

type ColumnType = 'creatures' | 'spells' | 'lands'

export default function DraftDeckBuilderModal({
  draftPool,
  cubeCards,
  playerId,
  playerName,
  onClose,
  onFinalize,
  initialConfig
}: Props) {
  // Active tab: main deck or sideboard
  const [activeTab, setActiveTab] = useState<'main' | 'sideboard'>('main')
  
  // Main deck cards (scryfallId → quantity)
  const [mainDeck, setMainDeck] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    initialConfig?.mainDeck.forEach(({ scryfallId, quantity }) => {
      map.set(scryfallId, quantity)
    })
    return map
  })
  
  // Sideboard cards (scryfallId → quantity)
  const [sideboard, setSideboard] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    initialConfig?.sideboard.forEach(({ scryfallId, quantity }) => {
      map.set(scryfallId, quantity)
    })
    return map
  })
  
  // Basic lands
  const [basics, setBasics] = useState<Record<BasicLandColor, number>>(
    initialConfig?.basics || { W: 0, U: 0, B: 0, R: 0, G: 0 }
  )
  
  const [isFinalizing, setIsFinalizing] = useState(false)

  // Calculate totals
  const mainDeckCardCount = useMemo(() => {
    return Array.from(mainDeck.values()).reduce((sum, qty) => sum + qty, 0)
  }, [mainDeck])

  const basicLandCount = useMemo(() => {
    return Object.values(basics).reduce((sum, count) => sum + count, 0)
  }, [basics])

  const totalMainDeckCards = mainDeckCardCount + basicLandCount

  const sideboardCardCount = useMemo(() => {
    return Array.from(sideboard.values()).reduce((sum, qty) => sum + qty, 0)
  }, [sideboard])

  const canFinalize = totalMainDeckCards >= 40

  // Get cards still available in pool
  const availableInPool = useMemo(() => {
    const used = new Set<string>()
    mainDeck.forEach((qty, id) => used.add(id))
    sideboard.forEach((qty, id) => used.add(id))
    
    return draftPool.filter(id => !used.has(id)).map(id => 
      cubeCards.find(c => c.scryfallId === id)
    ).filter(Boolean) as CubeCard[]
  }, [draftPool, cubeCards, mainDeck, sideboard])

  // Get current deck/sideboard as card entries
  const currentDeckEntries = useMemo(() => {
    const map = activeTab === 'main' ? mainDeck : sideboard
    return Array.from(map.entries()).map(([scryfallId, quantity]) => ({
      scryfallId,
      card: cubeCards.find(c => c.scryfallId === scryfallId)!,
      quantity
    })).filter(e => e.card)
  }, [activeTab, mainDeck, sideboard, cubeCards])

  // Organize deck into columns
  const deckColumns = useMemo(() => {
    const creatures: DeckCardEntry[] = []
    const spells: DeckCardEntry[] = []
    const lands: DeckCardEntry[] = []

    currentDeckEntries.forEach(entry => {
      const type = entry.card.types.join(' ').toLowerCase()
      
      if (type.includes('creature')) {
        creatures.push(entry)
      } else if (type.includes('land')) {
        lands.push(entry)
      } else {
        spells.push(entry)
      }
    })

    // Sort by CMC, then name
    const sortFn = (a: DeckCardEntry, b: DeckCardEntry) => {
      const cmcDiff = (a.card.cmc || 0) - (b.card.cmc || 0)
      if (cmcDiff !== 0) return cmcDiff
      return a.card.name.localeCompare(b.card.name)
    }

    creatures.sort(sortFn)
    spells.sort(sortFn)
    lands.sort(sortFn)

    return { creatures, spells, lands }
  }, [currentDeckEntries])

  // Add card to deck/sideboard
  const addCard = useCallback((scryfallId: string) => {
    if (activeTab === 'main') {
      setMainDeck(prev => {
        const newMap = new Map(prev)
        newMap.set(scryfallId, (newMap.get(scryfallId) || 0) + 1)
        return newMap
      })
    } else {
      setSideboard(prev => {
        const newMap = new Map(prev)
        newMap.set(scryfallId, (newMap.get(scryfallId) || 0) + 1)
        return newMap
      })
    }
  }, [activeTab])

  // Remove card from deck/sideboard
  const removeCard = useCallback((scryfallId: string) => {
    if (activeTab === 'main') {
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
    } else {
      setSideboard(prev => {
        const newMap = new Map(prev)
        const current = newMap.get(scryfallId) || 0
        if (current > 1) {
          newMap.set(scryfallId, current - 1)
        } else {
          newMap.delete(scryfallId)
        }
        return newMap
      })
    }
  }, [activeTab])

  // Adjust basic lands
  const adjustBasic = useCallback((color: BasicLandColor, delta: number) => {
    setBasics(prev => ({
      ...prev,
      [color]: Math.max(0, prev[color] + delta)
    }))
  }, [])

  // Auto-suggest basics based on deck colors
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

    // Adjust to exactly landsNeeded
    const total = Object.values(suggestedBasics).reduce((sum, count) => sum + count, 0)
    if (total !== landsNeeded) {
      const mainColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as BasicLandColor
      if (mainColor) {
        suggestedBasics[mainColor] += (landsNeeded - total)
      }
    }

    setBasics(suggestedBasics)
  }, [currentDeckEntries, mainDeckCardCount])

  // Finalize and export
  const handleFinalize = async () => {
    if (!canFinalize) return

    setIsFinalizing(true)
    try {
      await onFinalize({
        mainDeck: Array.from(mainDeck.entries()).map(([scryfallId, quantity]) => ({
          scryfallId,
          quantity
        })),
        sideboard: Array.from(sideboard.entries()).map(([scryfallId, quantity]) => ({
          scryfallId,
          quantity
        })),
        basics
      })
    } catch (error) {
      console.error('Failed to finalize deck:', error)
      alert('Failed to save deck. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
  }

  const renderPoolCard = (card: CubeCard) => (
    <button
      key={card.scryfallId}
      onClick={() => addCard(card.scryfallId)}
      className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 border-slate-700 hover:border-blue-500 transition-all group cursor-pointer"
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-all bg-blue-600 text-white rounded-full p-2">
          <Plus className="w-6 h-6" />
        </div>
      </div>
    </button>
  )

  const renderDeckCard = (entry: DeckCardEntry) => (
    <button
      key={entry.scryfallId}
      onClick={() => removeCard(entry.scryfallId)}
      className="flex items-center gap-2 p-2 rounded bg-slate-700 hover:bg-slate-600 transition-all group"
    >
      <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
        {entry.quantity}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{entry.card.name}</p>
      </div>
      <div className="flex-shrink-0 bg-purple-600 text-white rounded px-2 py-0.5 text-xs font-bold">
        {entry.card.cmc}
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
        <X className="w-4 h-4 text-red-400" />
      </div>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
        <div>
          <h2 className="text-white text-2xl font-bold">Build Your Deck</h2>
          <p className="text-gray-400 text-sm">{playerName}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white text-3xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Draft Pool */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <h3 className="text-white font-bold mb-3">📦 Draft Pool ({availableInPool.length} cards available)</h3>
        <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
          {availableInPool.map(card => renderPoolCard(card))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 flex">
        <button
          onClick={() => setActiveTab('main')}
          className={`flex-1 py-3 font-semibold transition-colors ${
            activeTab === 'main'
              ? 'bg-slate-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Main Deck: {totalMainDeckCards}/40 {totalMainDeckCards >= 40 ? '✅' : '⚠️'}
        </button>
        <button
          onClick={() => setActiveTab('sideboard')}
          className={`flex-1 py-3 font-semibold transition-colors ${
            activeTab === 'sideboard'
              ? 'bg-slate-700 text-white border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sideboard ({sideboardCardCount})
        </button>
      </div>

      {/* Deck Builder */}
      <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6">
          {/* Creatures Column */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-white font-bold mb-3 flex items-center justify-between">
              <span>🐲 Creatures</span>
              <span className="text-sm text-gray-400">
                ({deckColumns.creatures.reduce((sum, e) => sum + e.quantity, 0)})
              </span>
            </h4>
            <div className="space-y-2">
              {deckColumns.creatures.length > 0 ? (
                deckColumns.creatures.map(entry => renderDeckCard(entry))
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No creatures</p>
              )}
            </div>
          </div>

          {/* Spells Column */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-white font-bold mb-3 flex items-center justify-between">
              <span>⚡ Spells</span>
              <span className="text-sm text-gray-400">
                ({deckColumns.spells.reduce((sum, e) => sum + e.quantity, 0)})
              </span>
            </h4>
            <div className="space-y-2">
              {deckColumns.spells.length > 0 ? (
                deckColumns.spells.map(entry => renderDeckCard(entry))
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No spells</p>
              )}
            </div>
          </div>

          {/* Lands Column */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-white font-bold mb-3 flex items-center justify-between">
              <span>🏔️ Lands</span>
              <span className="text-sm text-gray-400">
                ({deckColumns.lands.reduce((sum, e) => sum + e.quantity, 0) + basicLandCount})
              </span>
            </h4>
            <div className="space-y-2">
              {deckColumns.lands.map(entry => renderDeckCard(entry))}
              
              {/* Basic Lands */}
              {activeTab === 'main' && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs font-semibold">BASIC LANDS</p>
                    <button
                      onClick={suggestBasics}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Auto-fill
                    </button>
                  </div>
                  
                  {(Object.keys(BASIC_LANDS) as BasicLandColor[]).map(color => (
                    <div key={color} className="flex items-center gap-2 mb-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-lg">
                          {color === 'W' ? '⚪' : color === 'U' ? '🔵' : color === 'B' ? '⚫' : color === 'R' ? '🔴' : '🟢'}
                        </span>
                        <span className="text-white text-sm">{BASIC_LANDS[color].name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustBasic(color, -1)}
                          disabled={basics[color] === 0}
                          className="p-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-white font-mono text-sm w-8 text-center">
                          {basics[color]}
                        </span>
                        <button
                          onClick={() => adjustBasic(color, 1)}
                          className="p-1 bg-slate-700 hover:bg-slate-600 rounded"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-white">
              <span className="font-bold text-2xl">{totalMainDeckCards}</span>
              <span className="text-gray-400"> / 40 cards</span>
            </div>
            {totalMainDeckCards < 40 && (
              <p className="text-amber-400 text-sm">
                ⚠️ Need {40 - totalMainDeckCards} more card{40 - totalMainDeckCards !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalize}
              disabled={!canFinalize || isFinalizing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              {isFinalizing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Finalize & Export to Sanctum
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isFinalizing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin text-6xl">⚙️</div>
            <div className="text-white text-xl font-bold">Exporting deck to Sanctum...</div>
          </div>
        </div>
      )}
    </div>
  )
}