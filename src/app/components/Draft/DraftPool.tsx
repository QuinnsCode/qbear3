// app/components/Draft/DraftPool.tsx
'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ZoomIn, ZoomOut, ArrowRightToLine, ArrowLeftToLine, Trash2, Layers } from 'lucide-react'
import type { CubeCard } from '@/app/types/Draft'
import { scryfallImageUrl } from '@/app/lib/scryfallImage'

interface Props {
  cards: string[]
  draftId: string
  compact?: boolean
  sideboardCards?: string[]
  onMoveToSideboard?: (cardId: string) => void
  onMoveToMainDeck?: (cardId: string) => void
  showDeckCounter?: boolean
  onClearSideboard?: () => void
  /** Cube data from the draft state. When provided no network fetch is needed. */
  cubeCards?: CubeCard[]
}

type SortMode = 'cmc' | 'color'

interface PoolCard {
  name: string
  cmc: number
  colors: string[]
  imageUrl?: string
}

const COLOR_ORDER = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'] as const
const COLOR_PIP: Record<string, string> = {
  White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G', Multicolor: 'M', Colorless: 'C',
}

export default function DraftPool({
  cards,
  draftId,
  compact = false,
  sideboardCards = [],
  onMoveToSideboard,
  onMoveToMainDeck,
  showDeckCounter = false,
  onClearSideboard,
  cubeCards,
}: Props) {
  const [fetched, setFetched] = useState<Record<string, PoolCard>>({})
  const [loading, setLoading] = useState(false)
  const [selectedView, setSelectedView] = useState<'maindeck' | 'sideboard'>('maindeck')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('cmc')
  const [cardScale, setCardScale] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('draftPool:cardScale')
        return saved ? parseFloat(saved) : 1.0
      } catch { return 1.0 }
    }
    return 1.0
  })

  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const [isDraggingOverSideboard, setIsDraggingOverSideboard] = useState(false)
  const [isDraggingOverMain, setIsDraggingOverMain] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('draftPool:cardScale', cardScale.toString()) } catch {}
  }, [cardScale])

  // Index of cube cards (instant, no network)
  const cubeIndex = useMemo(() => {
    const idx: Record<string, PoolCard> = {}
    for (const c of cubeCards || []) {
      idx[c.scryfallId] = { name: c.name, cmc: c.cmc ?? 0, colors: c.colors || [], imageUrl: c.imageUrl }
    }
    return idx
  }, [cubeCards])

  // Fetch only what the cube index doesn't know about
  const lastFetchedKey = useRef('')
  useEffect(() => {
    const allCards = [...new Set([...cards, ...sideboardCards])]
    const missing = allCards.filter(id => !cubeIndex[id] && !fetched[id])
    const fetchKey = [...missing].sort().join(',')
    if (missing.length === 0 || fetchKey === lastFetchedKey.current) return
    lastFetchedKey.current = fetchKey

    let cancelled = false
    const run = async () => {
      setLoading(true)
      const next: Record<string, PoolCard> = {}
      for (const chunk of chunkArray(missing, 75)) {
        try {
          const response = await fetch('https://api.scryfall.com/cards/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifiers: chunk.map(id => ({ id })) }),
          })
          const data: any = await response.json()
          for (const card of data.data || []) {
            next[card.id] = {
              name: card.name,
              cmc: card.cmc || 0,
              colors: card.colors || card.card_faces?.[0]?.colors || [],
              imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal,
            }
          }
          await new Promise(r => setTimeout(r, 100))
        } catch (error) {
          console.error('Failed to fetch cards:', error)
        }
      }
      if (!cancelled) {
        setFetched(prev => ({ ...prev, ...next }))
        setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [cards, sideboardCards, cubeIndex, fetched])

  const getCard = (id: string): PoolCard | undefined => cubeIndex[id] || fetched[id]

  const displayCards = selectedView === 'maindeck' ? cards : sideboardCards
  const hasCards = displayCards.length > 0
  const hasSideboard = !!(onMoveToSideboard && onMoveToMainDeck)

  const grouped = sortMode === 'cmc' ? groupByCMC(displayCards, getCard) : groupByColor(displayCards, getCard)

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragEnd = () => {
    setDraggedCard(null)
    setIsDraggingOverSideboard(false)
    setIsDraggingOverMain(false)
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDropOnSideboard = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedCard && onMoveToSideboard) onMoveToSideboard(draggedCard)
    handleDragEnd()
  }
  const handleDropOnMainDeck = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedCard && onMoveToMainDeck) onMoveToMainDeck(draggedCard)
    handleDragEnd()
  }

  const mainPct = Math.min(100, (cards.length / 40) * 100)
  const baseWidth = compact ? 64 : 84
  const scaledWidth = Math.round(baseWidth * cardScale)
  const scaledHeight = Math.round(scaledWidth * 1.4)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      {(showDeckCounter || hasSideboard) && (
        <div className="space-y-2 border-b border-white/5 px-3 pb-2 pt-3">
          {showDeckCounter && (
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  <span className={cards.length >= 40 ? 'text-emerald-300' : 'text-amber-300'}>{cards.length}</span>
                  <span className="text-slate-500">/40 main</span>
                </span>
                {hasSideboard && (
                  <span className="text-fuchsia-300/90">{sideboardCards.length} side</span>
                )}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${cards.length >= 40 ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-300 to-orange-400'}`}
                  style={{ width: `${mainPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <div className="flex rounded-lg bg-slate-800/80 p-0.5 ring-1 ring-white/5">
              {(['cmc', 'color'] as SortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all ${
                    sortMode === mode ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title={mode === 'cmc' ? 'Group by mana value' : 'Group by color'}
                >
                  {mode === 'cmc' ? 'Curve' : 'Color'}
                </button>
              ))}
            </div>

            {/* Scale */}
            <div className="flex flex-1 items-center gap-1.5">
              <ZoomOut className="h-3 w-3 shrink-0 text-slate-500" />
              <input
                type="range"
                min="0.6"
                max="2.0"
                step="0.1"
                value={cardScale}
                onChange={(e) => setCardScale(parseFloat(e.target.value))}
                aria-label="Card size"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-amber-300 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-300"
              />
              <ZoomIn className="h-3 w-3 shrink-0 text-slate-500" />
            </div>
          </div>

          {hasSideboard && (
            <div className="flex gap-1.5">
              <div className="flex flex-1 rounded-lg bg-slate-800/80 p-0.5 ring-1 ring-white/5">
                <button
                  onClick={() => setSelectedView('maindeck')}
                  onDragOver={selectedView === 'sideboard' ? handleDragOver : undefined}
                  onDragEnter={selectedView === 'sideboard' ? () => setIsDraggingOverMain(true) : undefined}
                  onDragLeave={selectedView === 'sideboard' ? () => setIsDraggingOverMain(false) : undefined}
                  onDrop={selectedView === 'sideboard' ? handleDropOnMainDeck : undefined}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all ${
                    selectedView === 'maindeck'
                      ? 'bg-slate-700 text-white shadow'
                      : isDraggingOverMain
                        ? 'bg-sky-500/30 text-white ring-2 ring-sky-400'
                        : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Main <span className="tabular-nums text-slate-400">{cards.length}</span>
                </button>
                <button
                  onClick={() => setSelectedView('sideboard')}
                  onDragOver={selectedView === 'maindeck' ? handleDragOver : undefined}
                  onDragEnter={selectedView === 'maindeck' ? () => setIsDraggingOverSideboard(true) : undefined}
                  onDragLeave={selectedView === 'maindeck' ? () => setIsDraggingOverSideboard(false) : undefined}
                  onDrop={selectedView === 'maindeck' ? handleDropOnSideboard : undefined}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all ${
                    selectedView === 'sideboard'
                      ? 'bg-fuchsia-600 text-white shadow'
                      : isDraggingOverSideboard
                        ? 'bg-fuchsia-500/40 text-white ring-2 ring-fuchsia-400'
                        : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Side <span className="tabular-nums opacity-70">{sideboardCards.length}</span>
                  {draggedCard && selectedView === 'maindeck' && <span className="ml-1 text-fuchsia-200">drop</span>}
                </button>
              </div>

              {selectedView === 'sideboard' && sideboardCards.length > 0 && onClearSideboard && (
                <button
                  onClick={() => {
                    if (confirm(`Move all ${sideboardCards.length} sideboard cards back to the main deck?`)) onClearSideboard()
                  }}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-rose-300 transition-colors hover:bg-rose-500/20"
                  title="Move everything back to main deck"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Groups */}
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {!hasCards ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 ring-1 ring-white/5">
              <Layers className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">
              {selectedView === 'sideboard' ? 'Nothing in the sideboard yet' : 'Your picks will stack up here'}
            </p>
            {loading && <p className="text-xs text-slate-600">Loading card data…</p>}
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, cardIds]) => (
            <div key={groupName}>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {sortMode === 'color'
                  ? <span className={`mana-pip mana-pip-${COLOR_PIP[groupName] || 'C'}`}>{COLOR_PIP[groupName] === 'M' ? '' : COLOR_PIP[groupName]}</span>
                  : <span className="mana-pip mana-pip-C">{groupName}</span>}
                <span className="text-slate-300">{sortMode === 'color' ? groupName : `${groupName} drop${groupName === '1' ? '' : 's'}`}</span>
                <span className="text-slate-600">{cardIds.length}</span>
              </h4>

              <div className="relative">
                <div className="flex flex-wrap gap-x-1 gap-y-1">
                  {cardIds.map((cardId, index) => {
                    const card = getCard(cardId)
                    const imageUrl = card?.imageUrl || scryfallImageUrl(cardId, 'small')
                    const isHovered = hoveredCard === cardId
                    const isDragging = draggedCard === cardId
                    const zIndex = cardIds.length - 1 - index

                    return (
                      <div
                        key={`${cardId}-${index}`}
                        draggable={hasSideboard}
                        onDragStart={(e) => handleDragStart(e, cardId)}
                        onDragEnd={handleDragEnd}
                        className={`group relative cursor-grab select-none active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
                        style={{ width: `${scaledWidth}px`, zIndex: isHovered ? 999 : zIndex }}
                        onMouseEnter={() => setHoveredCard(cardId)}
                        onMouseLeave={() => setHoveredCard(null)}
                        title={card?.name}
                      >
                        <div
                          className={`relative overflow-hidden rounded-md shadow-md transition-transform duration-200 ${isHovered ? 'scale-[1.6] shadow-2xl ring-1 ring-white/20' : ''}`}
                          style={{ height: `${scaledHeight}px`, transformOrigin: index === 0 ? 'left center' : 'center' }}
                        >
                          <img
                            src={imageUrl}
                            alt={card?.name || 'Card'}
                            loading="lazy"
                            className="pointer-events-none h-full w-full object-cover"
                          />
                        </div>

                        {isHovered && hasSideboard && !isDragging && (
                          <div className="absolute -bottom-7 left-0 right-0 z-[1000] flex">
                            {selectedView === 'maindeck' && onMoveToSideboard && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onMoveToSideboard(cardId) }}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-fuchsia-600 px-1.5 py-1 text-[10px] font-semibold text-white shadow-lg transition-colors hover:bg-fuchsia-500"
                                title="Move to sideboard"
                              >
                                <ArrowRightToLine className="h-3 w-3" /> Side
                              </button>
                            )}
                            {selectedView === 'sideboard' && onMoveToMainDeck && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onMoveToMainDeck(cardId) }}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-sky-600 px-1.5 py-1 text-[10px] font-semibold text-white shadow-lg transition-colors hover:bg-sky-500"
                                title="Move to main deck"
                              >
                                <ArrowLeftToLine className="h-3 w-3" /> Main
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ height: hasSideboard ? 30 : 6 }} />
              </div>
            </div>
          ))
        )}
      </div>

      {hasSideboard && selectedView === 'maindeck' && cards.length > 0 && (
        <div className="border-t border-white/5 px-3 py-1.5 text-center text-[11px] text-slate-500">
          Drag a card onto <span className="text-fuchsia-300">Side</span> or hover and click the button
        </div>
      )}
    </div>
  )
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))
  return chunks
}

function groupByCMC(cardIds: string[], get: (id: string) => PoolCard | undefined): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const cardId of cardIds) {
    const card = get(cardId)
    const key = String(card?.cmc ?? 0)
    ;(groups[key] ||= []).push(cardId)
  }
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => parseInt(a) - parseInt(b)))
}

function groupByColor(cardIds: string[], get: (id: string) => PoolCard | undefined): Record<string, string[]> {
  const groups: Record<string, string[]> = Object.fromEntries(COLOR_ORDER.map(c => [c, []]))
  const names: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }
  for (const cardId of cardIds) {
    const colors = get(cardId)?.colors || []
    const key = colors.length === 0 ? 'Colorless' : colors.length > 1 ? 'Multicolor' : names[colors[0]] || 'Colorless'
    groups[key].push(cardId)
  }
  return Object.fromEntries(Object.entries(groups).filter(([, ids]) => ids.length > 0))
}
