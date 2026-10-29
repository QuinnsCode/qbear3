// app/components/Draft/DraftCard.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { CubeCard } from '@/app/types/Draft'
import { cardImage } from '@/app/lib/scryfallImage'

interface Props {
  card: CubeCard
  isSelected: boolean
  /** 1-based position among the selected cards, shown as a badge */
  selectionIndex?: number
  /** Position in the pack, used to stagger the entry animation */
  index?: number
  disabled?: boolean
  onClick: () => void
}

const RARITY_RING: Record<string, string> = {
  mythic: 'from-orange-400 via-amber-300 to-orange-500',
  rare: 'from-yellow-300 via-amber-200 to-yellow-500',
  uncommon: 'from-slate-200 via-slate-300 to-slate-400',
  common: 'from-slate-600 via-slate-500 to-slate-600',
}

export default function DraftCard({
  card,
  isSelected,
  selectionIndex,
  index = 0,
  disabled = false,
  onClick,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const src = cardImage(card, 'normal')

  // Images rendered during SSR can finish loading before React attaches onLoad.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete) {
      if (img.naturalWidth > 0) setLoaded(true)
      else setFailed(true)
    }
  }, [src])
  const rarity = (card.rarity || 'common').toLowerCase()
  const ring = RARITY_RING[rarity] || RARITY_RING.common

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`${card.name}${isSelected ? ' (selected)' : ''}`}
      title={card.name}
      style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
      className={`draft-card-in group relative aspect-[5/7] rounded-xl text-left outline-none transition-transform duration-200 ease-out
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
        ${isSelected
          ? 'z-20 -translate-y-2 scale-[1.04]'
          : disabled ? '' : 'hover:z-10 hover:-translate-y-1.5 hover:scale-[1.03] focus-visible:-translate-y-1.5 focus-visible:scale-[1.03]'}
      `}
    >
      {/* Glow / rarity ring */}
      <div
        className={`absolute -inset-[2px] rounded-[14px] bg-gradient-to-br transition-opacity duration-200
          ${isSelected ? `${'from-amber-300 via-yellow-200 to-amber-500'} opacity-100` : `${ring} opacity-0 group-hover:opacity-80 group-focus-visible:opacity-80`}
        `}
        aria-hidden
      />

      {/* Card body */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-xl bg-slate-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]
          ${isSelected ? 'shadow-[0_18px_40px_-12px_rgba(251,191,36,0.45)]' : ''}
        `}
      >
        {!loaded && !failed && <div className="absolute inset-0 draft-shimmer" aria-hidden />}

        {!failed ? (
          <img
            ref={imgRef}
            src={src}
            alt={card.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-800 to-slate-900 p-3 text-center">
            <span className="text-sm font-semibold text-slate-200">{card.name}</span>
            <span className="text-[11px] uppercase tracking-wide text-slate-500">{card.types?.[0] || 'Card'}</span>
          </div>
        )}

        {/* Hover name plate */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 via-black/70 to-transparent px-2.5 pb-2 pt-6 transition-transform duration-200
            ${isSelected ? 'translate-y-0' : 'group-hover:translate-y-0 group-focus-visible:translate-y-0'}
          `}
        >
          <div className="truncate text-[12px] font-semibold text-white drop-shadow">{card.name}</div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-300">
            <span className={`inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-br ${ring}`} />
            {rarity}
            {typeof card.cmc === 'number' && <span className="text-slate-500">· {card.cmc} cmc</span>}
          </div>
        </div>

        {/* Selected overlay */}
        {isSelected && (
          <div className="pointer-events-none absolute inset-0 bg-amber-300/10">
            <div className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-black text-slate-950 shadow-lg ring-2 ring-slate-950/40">
              {selectionIndex ?? <Check className="h-4 w-4" strokeWidth={3} />}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
