// app/components/DeckBuilder/hooks/useCardPrintings.ts
'use client'

import { useState, useCallback } from 'react'
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'
import type { DeckCard } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'
import * as DeckFn from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'

export function useCardPrintings(cards: DeckCard[], setCards: (cards: DeckCard[]) => void) {
  const [printingsModal, setPrintingsModal] = useState<string | null>(null)
  const [availablePrintings, setAvailablePrintings] = useState<ScryfallCard[]>([])
  const [loadingPrintings, setLoadingPrintings] = useState(false)

  const openPrintingsModal = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    setPrintingsModal(cardId)
    setLoadingPrintings(true)

    try {
      const printings = await DeckFn.fetchCardPrintings(card.name)
      setAvailablePrintings(printings)
    } catch (error) {
      alert('Failed to load printings')
    } finally {
      setLoadingPrintings(false)
    }
  }, [cards])

  const changePrinting = useCallback((cardId: string, newPrinting: ScryfallCard) => {
    setCards(DeckFn.changeCardPrinting(cards, cardId, newPrinting))
    setPrintingsModal(null)
    setAvailablePrintings([])
  }, [cards, setCards])

  const closePrintingsModal = useCallback(() => {
    setPrintingsModal(null)
    setAvailablePrintings([])
  }, [])

  return {
    printingsModal,
    availablePrintings,
    loadingPrintings,
    openPrintingsModal,
    changePrinting,
    closePrintingsModal
  }
}