// app/hooks/useDeckManagement.ts
import { useState, useEffect } from 'react'
import type { Deck } from '@/app/types/Deck'

interface UseDeckManagementProps {
  hasNoDeck: boolean | undefined
  onPrefetchDecks?: () => Promise<void>
}

export function useDeckManagement({ hasNoDeck, onPrefetchDecks }: UseDeckManagementProps) {
  const [isDeckBuilderOpen, setIsDeckBuilderOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Auto-open deck builder if no deck in sandbox mode
  useEffect(() => {
    if (hasNoDeck && !isDeckBuilderOpen) {
      setIsDeckBuilderOpen(true)
    }
  }, [hasNoDeck, isDeckBuilderOpen])

  const handleOpenDeckBuilder = () => {
    setIsDeckBuilderOpen(true)
  }

  const handleCloseDeckBuilder = () => {
    setIsDeckBuilderOpen(false)
  }

  const handleImportDeck = async () => {
    setIsDeckBuilderOpen(true)
  }

  return {
    isDeckBuilderOpen,
    isImporting,
    setIsImporting,
    handleOpenDeckBuilder,
    handleCloseDeckBuilder,
    handleImportDeck
  }
}