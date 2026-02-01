// app/hooks/useDeckOperations.ts

import { useState, useEffect } from 'react'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import type { Deck } from '@/app/types/Deck'

interface UseDeckOperationsProps {
  currentPlayerId: string
  cardGameId: string
  spectatorMode: boolean
  isSandbox: boolean
}

interface DeckImportStatus {
  loading: boolean
  error: string | null
  step: string
}

export function useDeckOperations({ 
  currentPlayerId, 
  cardGameId, 
  spectatorMode, 
  isSandbox 
}: UseDeckOperationsProps) {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [deckImportStatus, setDeckImportStatus] = useState<DeckImportStatus>({
    loading: false,
    error: null,
    step: ''
  })

  // Load user's decks on mount
  useEffect(() => {
    if (spectatorMode || !currentPlayerId) {
      setLoadingDecks(false)
      return
    }
    
    async function loadDecks() {
      try {
        const { getUserDecks } = await import('@/app/serverActions/deckBuilder/deckActions')
        const result = await getUserDecks(currentPlayerId)
        if (result.success) {
          setDecks(result.decks)
        }
      } catch (error) {
        console.error('Failed to load decks:', error)
      } finally {
        setLoadingDecks(false)
      }
    }
    
    loadDecks()
  }, [currentPlayerId, spectatorMode])

  const handleCreateDeck = async (deckListText: string, deckName: string) => {
    if (spectatorMode || !currentPlayerId) return
    
    try {
      const { createDeck } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await createDeck(currentPlayerId, deckName, deckListText)
      
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to create deck')
      }
      
      if (result.deck) {
        setDecks(prev => [result.deck!, ...prev])
      }
    } catch (error) {
      console.error('Failed to create deck:', error)
      throw error
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (spectatorMode || !currentPlayerId) return
    
    try {
      const { deleteDeck } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await deleteDeck(currentPlayerId, deckId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete deck')
      }
      
      setDecks(prev => prev.filter(d => d.id !== deckId))
    } catch (error) {
      console.error('Failed to delete deck:', error)
      throw error
    }
  }

  const handleSelectDeck = async (deckId: string) => {
    if (spectatorMode) {
      alert('Spectators cannot import decks')
      return
    }
    
    setDeckImportStatus({ loading: true, error: null, step: 'Starting import...' })
    
    try {
      // Sandbox deck import
      if (isSandbox && deckId.startsWith('sandbox-')) {
        await importSandboxDeck(deckId, cardGameId, currentPlayerId, decks, setDeckImportStatus)
      } else {
        await importNormalDeck(deckId, cardGameId, currentPlayerId, decks, setDeckImportStatus)
      }
      
      // Shuffle and draw
      await shuffleAndDraw(cardGameId, currentPlayerId, setDeckImportStatus)
      
      setDeckImportStatus({ loading: false, error: null, step: '' })
      
    } catch (error) {
      setDeckImportStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        step: ''
      })
    }
  }

  const handleEditDeck = async (
    deckId: string,
    updatedCards: Array<{name: string, quantity: number}>,
    deckName: string
  ) => {
    if (spectatorMode || !currentPlayerId) return
  
    try {
      const { updateDeckFromEditor } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await updateDeckFromEditor(currentPlayerId, deckId, deckName, updatedCards)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update deck')
      }
    } catch (error) {
      console.error('Failed to update deck:', error)
      throw error
    }
  }

  const prefetchDecks = async () => {
    if (loadingDecks || decks.length > 0 || spectatorMode || !currentPlayerId) return
    
    setLoadingDecks(true)
    try {
      const { getUserDecks } = await import('@/app/serverActions/deckBuilder/deckActions')
      const result = await getUserDecks(currentPlayerId)
      if (result.success) {
        setDecks(result.decks)
      }
    } catch (error) {
      console.error('Failed to prefetch decks:', error)
    } finally {
      setLoadingDecks(false)
    }
  }

  return {
    decks,
    loadingDecks,
    deckImportStatus,
    setDeckImportStatus,
    handleCreateDeck,
    handleDeleteDeck,
    handleSelectDeck,
    handleEditDeck,
    prefetchDecks
  }
}

// Helper functions
async function importSandboxDeck(
  deckId: string,
  cardGameId: string,
  currentPlayerId: string,
  decks: Deck[],
  setStatus: (status: DeckImportStatus) => void
) {
  const sandboxIndex = parseInt(deckId.replace('sandbox-', ''))
  setStatus({ loading: true, error: null, step: 'Importing deck...' })
  
  await applyCardGameAction(cardGameId, {
    type: 'import_sandbox_deck',
    playerId: currentPlayerId,
    data: { deckIndex: sandboxIndex }
  })
}

async function importNormalDeck(
  deckId: string,
  cardGameId: string,
  currentPlayerId: string,
  decks: Deck[],
  setStatus: (status: DeckImportStatus) => void
) {
  let deck = decks.find(d => d.id === deckId)
  if (!deck) throw new Error('Deck not found')
  
  if (!deck.cards || deck.cards.length === 0) {
    throw new Error('Deck has no cards. Please edit the deck first.')
  }
  
  setStatus({ loading: true, error: null, step: 'Importing deck...' })
  
  try {
    await importDeckData(deck, cardGameId, currentPlayerId)
  } catch (firstError) {
    console.log('Import failed, attempting migration...')
    
    const { migrateDeck, needsMigration } = await import('@/app/types/Deck')
    if (needsMigration(deck)) {
      deck = migrateDeck(deck)
      await importDeckData(deck, cardGameId, currentPlayerId)
    } else {
      throw firstError
    }
  }
}

async function importDeckData(deck: Deck, cardGameId: string, currentPlayerId: string) {
  const deckListText = [
    ...(deck.commanders?.map(c => `Commander: ${c}`) || []),
    ...deck.cards
      .filter(card => !card.isCommander)
      .map(card => `${card.quantity || 1} ${card.name}`)
  ].filter(Boolean).join('\n')
  
  await applyCardGameAction(cardGameId, {
    type: 'import_deck',
    playerId: currentPlayerId,
    data: { 
      deckListText,
      deckName: deck.name,
      cardData: deck.cards.map(deckCard => ({
        id: deckCard.scryfallId || deckCard.id,
        name: deckCard.name,
        image_uris: {
          small: deckCard.imageUrl || '',
          normal: deckCard.imageUrl || '',
          large: deckCard.imageUrl || ''
        },
        type_line: deckCard.type || '',
        mana_cost: deckCard.manaCost || '',
        colors: deckCard.colors || [],
        color_identity: deckCard.colors || []
      }))
    }
  })
}

async function shuffleAndDraw(
  cardGameId: string,
  currentPlayerId: string,
  setStatus: (status: DeckImportStatus) => void
) {
  setStatus({ loading: true, error: null, step: 'Shuffling library...' })
  
  await applyCardGameAction(cardGameId, {
    type: 'shuffle_library',
    playerId: currentPlayerId,
    data: {}
  })

  setStatus({ loading: true, error: null, step: 'Drawing 7 cards...' })

  await applyCardGameAction(cardGameId, {
    type: 'draw_cards',
    playerId: currentPlayerId,
    data: { count: 7 }
  })
}