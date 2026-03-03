// app/pages/sanctum/components/sections/DecksSection.tsx
import { DecksSectionClient } from './DecksSectionClient'
import type { Deck } from '@/app/types/Deck'

interface Props {
  decks: Deck[]
  userId: string
  currentTier: string
  maxDecks: number
  atLimit: boolean
}

export function DecksSection({ decks, userId, currentTier, maxDecks, atLimit }: Props) {
  // Server component - could fetch fresh data here if needed
  return (
    <DecksSectionClient
      decks={decks}
      userId={userId}
      currentTier={currentTier}
      maxDecks={maxDecks}
      atLimit={atLimit}
    />
  )
}
