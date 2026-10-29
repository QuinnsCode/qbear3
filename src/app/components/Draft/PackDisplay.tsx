// app/components/Draft/PackDisplay.tsx
'use client'

import type { CubeCard } from '@/app/types/Draft'
import DraftCard from './DraftCard'

interface Props {
  pack: CubeCard[]
  selectedCards: string[]
  onCardClick: (cardId: string) => void
  /** Changes whenever a new pack arrives so the entry animation replays */
  packKey?: string
  disabled?: boolean
}

export default function PackDisplay({ pack, selectedCards, onCardClick, packKey, disabled }: Props) {
  return (
    <div
      key={packKey}
      className="grid gap-4 sm:gap-5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
    >
      {pack.filter(Boolean).map((card, i) => {
        const selIdx = selectedCards.indexOf(card.scryfallId)
        return (
          <DraftCard
            key={card.scryfallId}
            card={card}
            index={i}
            isSelected={selIdx !== -1}
            selectionIndex={selIdx !== -1 ? selIdx + 1 : undefined}
            disabled={disabled}
            onClick={() => onCardClick(card.scryfallId)}
          />
        )
      })}
    </div>
  )
}
