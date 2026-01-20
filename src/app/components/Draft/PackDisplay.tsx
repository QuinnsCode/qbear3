// app/components/Draft/PackDisplay.tsx
'use client'

import type { CubeCard } from '@/app/types/Draft'
import DraftCard from './DraftCard'

interface Props {
  pack: CubeCard[]  // ← Changed from Pack type
  selectedCards: string[]
  onCardClick: (cardId: string) => void
}

export default function PackDisplay({ pack, selectedCards, onCardClick }: Props) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {pack.map(card => (
        <DraftCard
          key={card.scryfallId}
          card={card}  // ← Pass full object
          isSelected={selectedCards.includes(card.scryfallId)}
          onClick={() => onCardClick(card.scryfallId)}
        />
      ))}
    </div>
  )
}