'use client'

import { useState } from 'react'
import DraftDeckBuilderModal from '@/app/components/Draft/DraftDeckBuilderModal'
import { updateDeckFromEditor } from '@/app/serverActions/deckBuilder/deckActions'
import type { CubeCard } from '@/app/types/Draft'
import { BASIC_LANDS, type BasicLandColor, type DeckCard } from '@/app/types/Deck'

interface Props {
  deckId: string
  deckName: string
  draftId: string
  draftPool: string[]
  cubeCards: CubeCard[]
  playerId: string
  playerName: string
  initialConfig?: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<BasicLandColor, number>
    totalCards: number
    isFinalized: boolean
  }
}

export default function DraftDeckEditorClient({
  deckId,
  deckName,
  draftId,
  draftPool,
  cubeCards,
  playerId,
  playerName,
  initialConfig
}: Props) {
  const [saving, setSaving] = useState(false)

  const handleFinalize = async (deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<BasicLandColor, number>
  }) => {
    setSaving(true)

    try {
      // Convert draft deck config to full deck cards
      const fromCube = (zone: 'main' | 'sideboard') => ({ scryfallId, quantity }: { scryfallId: string; quantity: number }): DeckCard[] => {
        const card = cubeCards.find(c => c.scryfallId === scryfallId)
        if (!card) return []
        return [{
          id: scryfallId,
          scryfallId,
          name: card.name,
          quantity,
          imageUrl: card.imageUrl || '',
          type: card.types.join(' '),
          manaCost: '',
          colors: card.colors,
          isCommander: false,
          zone,
          cmc: card.cmc || 0,
          rarity: card.rarity || 'common'
        }]
      }
      const basics: DeckCard[] = (Object.keys(deckConfig.basics) as BasicLandColor[])
        .filter(color => deckConfig.basics[color] > 0)
        .map(color => ({
          id: BASIC_LANDS[color].scryfallId,
          scryfallId: BASIC_LANDS[color].scryfallId,
          name: BASIC_LANDS[color].name,
          quantity: deckConfig.basics[color],
          imageUrl: BASIC_LANDS[color].imageUrl,
          type: BASIC_LANDS[color].type,
          manaCost: '',
          colors: [...BASIC_LANDS[color].colors],
          isCommander: false,
          zone: 'main' as const,
          cmc: 0,
          rarity: 'common'
        }))
      const allCards = [
        ...deckConfig.mainDeck.flatMap(fromCube('main')),
        ...deckConfig.sideboard.flatMap(fromCube('sideboard')),
        ...basics
      ]

      // Save to deck using updateDeckFromEditor
      const result = await updateDeckFromEditor(playerId, deckId, deckName, allCards)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save deck')
      }

      // Redirect back to sanctum
      window.location.href = '/sanctum'
    } catch (error) {
      console.error('Failed to save draft deck:', error)
      alert('Failed to save deck. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    window.location.href = '/sanctum'
  }

  return (
    <div className="h-screen w-screen bg-slate-900">
      <DraftDeckBuilderModal
        draftId={draftId}
        draftPool={draftPool}
        cubeCards={cubeCards}
        playerId={playerId}
        playerName={playerName}
        onClose={handleClose}
        onFinalize={handleFinalize}
        finalizeLabel="Save Deck"
        initialConfig={initialConfig}
      />
      {saving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-slate-800 rounded-lg p-6 text-white">
            <div className="text-xl font-bold mb-2">Saving deck...</div>
          </div>
        </div>
      )}
    </div>
  )
}
