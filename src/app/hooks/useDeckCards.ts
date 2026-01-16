// app/components/DeckBuilder/hooks/useDeckCards.ts
'use client'

import { useState, useCallback } from 'react'
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'
import type { DeckCard, CardZone } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'
import * as DeckFn from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'
import type { Deck } from '@/app/types/Deck'

export function useDeckCards(deck: Deck) {
  const [cards, setCards] = useState<DeckCard[]>(
    (deck.cards || []).map(card => ({
      id: card.id || '',
      scryfallId: card.scryfallId || card.id || '',
      name: card.name || 'Unknown Card',
      quantity: card.quantity || 1,
      imageUrl: card.imageUrl || '',
      type: card.type || '',
      manaCost: card.manaCost || '',
      colors: card.colors || [],
      zone: (card.isCommander ? 'commander' : 'main') as CardZone,
      cmc: DeckFn.parseManaValue(card.manaCost || ''),
      rarity: (card as any).rarity || 'common'
    }))
  )

  const handleAddCard = useCallback((scryfallCard: ScryfallCard) => {
    setCards(prev => DeckFn.addCardToDeck(prev, scryfallCard))
    alert(`Added ${scryfallCard.name}!`)
  }, [])

  const incrementCard = useCallback((cardId: string) => {
    setCards(prev => DeckFn.incrementCardQuantity(prev, cardId))
  }, [])

  const decrementCard = useCallback((cardId: string) => {
    setCards(prev => DeckFn.decrementCardQuantity(prev, cardId))
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setCards(prev => DeckFn.removeCardFromDeck(prev, cardId))
  }, [])

  const moveCardToZone = useCallback((cardId: string, newZone: CardZone) => {
    setCards(prev => DeckFn.moveCardToZone(prev, cardId, newZone))
  }, [])

  const changeCardImage = useCallback((cardId: string, newImageUrl: string) => {
    setCards(prev => DeckFn.changeCardImage(prev, cardId, newImageUrl))
  }, [])

  const handleImageUpload = useCallback((cardId: string, file: File) => {
    DeckFn.handleImageUpload(file, (dataUrl) => {
      changeCardImage(cardId, dataUrl)
    })
  }, [changeCardImage])

  return {
    cards,
    setCards,
    handleAddCard,
    incrementCard,
    decrementCard,
    removeCard,
    moveCardToZone,
    changeCardImage,
    handleImageUpload
  }
}