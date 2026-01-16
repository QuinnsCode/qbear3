// app/hooks/useCardRefresh.ts
/**
 * React hook for refreshing card data
 * 
 * Provides easy-to-use interface for components to refresh
 * card data from Scryfall.
 */

import { useState, useCallback } from 'react'
import { cardRefreshService } from '@/app/services/cardRefresh/CardRefreshService'
import type { DeckCard } from '@/app/types/Deck'
import type { RefreshProgress } from '@/app/services/cardRefresh/CardRefreshService'

interface UseCardRefreshReturn {
  // State
  refreshing: boolean
  progress: RefreshProgress | null
  error: string | null
  
  // Actions
  refreshCard: (card: DeckCard) => Promise<DeckCard | null>
  refreshAllCards: (cards: DeckCard[]) => Promise<DeckCard[]>
  refreshCardsInBatches: (cards: DeckCard[], batchSize?: number) => Promise<DeckCard[]>
  
  // Utilities
  needsRefresh: (card: DeckCard) => boolean
  getCardsNeedingRefresh: (cards: DeckCard[]) => DeckCard[]
}

export function useCardRefresh(): UseCardRefreshReturn {
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState<RefreshProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Refresh a single card
   */
  const refreshCard = useCallback(async (card: DeckCard): Promise<DeckCard | null> => {
    setRefreshing(true)
    setError(null)

    try {
      const result = await cardRefreshService.refreshCard(card)
      
      if (result.success && result.updatedCard) {
        return result.updatedCard
      } else {
        setError(result.error || 'Failed to refresh card')
        return null
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return null
    } finally {
      setRefreshing(false)
    }
  }, [])

  /**
   * Refresh all cards sequentially with progress tracking
   */
  const refreshAllCards = useCallback(async (cards: DeckCard[]): Promise<DeckCard[]> => {
    setRefreshing(true)
    setError(null)
    setProgress({ current: 0, total: cards.length, failed: [] })

    try {
      const result = await cardRefreshService.refreshCards(cards, (progressUpdate) => {
        setProgress(progressUpdate)
      })

      if (!result.success && result.failedCards.length > 0) {
        setError(`Failed to refresh ${result.failedCards.length} card(s)`)
      }

      return result.updatedCards
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return cards // Return original cards on complete failure
    } finally {
      setRefreshing(false)
      setProgress(null)
    }
  }, [])

  /**
   * Refresh cards in batches (for large decks)
   */
  const refreshCardsInBatches = useCallback(async (
    cards: DeckCard[],
    batchSize: number = 10
  ): Promise<DeckCard[]> => {
    setRefreshing(true)
    setError(null)
    setProgress({ current: 0, total: cards.length, failed: [] })

    try {
      const result = await cardRefreshService.refreshCardsInBatches(
        cards,
        batchSize,
        (progressUpdate) => {
          setProgress(progressUpdate)
        }
      )

      if (!result.success && result.failedCards.length > 0) {
        setError(`Failed to refresh ${result.failedCards.length} card(s)`)
      }

      return result.updatedCards
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return cards
    } finally {
      setRefreshing(false)
      setProgress(null)
    }
  }, [])

  /**
   * Check if a card needs refreshing
   */
  const needsRefresh = useCallback((card: DeckCard): boolean => {
    return cardRefreshService.needsRefresh(card)
  }, [])

  /**
   * Get cards that need refreshing
   */
  const getCardsNeedingRefresh = useCallback((cards: DeckCard[]): DeckCard[] => {
    return cardRefreshService.getCardsNeedingRefresh(cards)
  }, [])

  return {
    refreshing,
    progress,
    error,
    refreshCard,
    refreshAllCards,
    refreshCardsInBatches,
    needsRefresh,
    getCardsNeedingRefresh
  }
}