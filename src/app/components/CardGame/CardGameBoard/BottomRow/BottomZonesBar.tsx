// app/components/CardGame/CardGameBoard/BottomRow/BottomZonesBar.tsx
'use client'

import YourZones from '@/app/components/CardGame/CardGameBoard/legacy/YourZones'
import type { MTGPlayer, CardGameState } from '@/app/services/cardGame/CardGameState'
import type { Deck } from '@/app/types/Deck'

interface BottomZonesBarProps {
  player: MTGPlayer
  gameState: CardGameState
  cardGameId: string
  viewingZone: { playerId: string, zone: string } | null
  onViewZone: (zone: string) => void
  onSelectBattlefield: () => void
  decks: Deck[]
  onCreateDeck: (deckListText: string, deckName: string) => Promise<void>
  onDeleteDeck: (deckId: string) => Promise<void>
  onSelectDeck: (deckId: string) => Promise<void>
  onEditDeck: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  onPrefetchDecks: () => Promise<void>
  isSandbox: boolean
}

export default function BottomZonesBar({
  player,
  gameState,
  cardGameId,
  viewingZone,
  onViewZone,
  onSelectBattlefield,
  decks,
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck,
  onPrefetchDecks,
  isSandbox
}: BottomZonesBarProps) {
  const isViewingHand = viewingZone?.zone === 'hand' && viewingZone?.playerId === player.id
  
  return (
    <YourZones
      player={player}
      gameState={gameState}
      cardGameId={cardGameId}
      onViewZone={onViewZone}
      onSelectBattlefield={onSelectBattlefield}
      isViewingHand={isViewingHand}
      decks={decks}
      userId={player.id}
      onCreateDeck={onCreateDeck}
      onDeleteDeck={onDeleteDeck}
      onSelectDeck={onSelectDeck}
      onEditDeck={onEditDeck}
      onPrefetchDecks={onPrefetchDecks}
      spectatorMode={false}
      isSandbox={isSandbox}
    />
  )
}