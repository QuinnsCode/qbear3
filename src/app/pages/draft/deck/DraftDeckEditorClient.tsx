'use client'

import { useState } from 'react'
import DraftDeckBuilderModal from '@/app/components/Draft/DraftDeckBuilderModal'
import { updateDeckFromEditor } from '@/app/serverActions/deckBuilder/deckActions'
import type { CubeCard } from '@/app/types/Draft'
import type { BasicLandColor } from '@/app/types/Deck'

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
      // Convert draft deck config to deck editor format
      const allCards = [
        ...deckConfig.mainDeck,
        ...deckConfig.sideboard,
        ...Object.entries(deckConfig.basics).map(([color, quantity]) => ({
          scryfallId: getBasicLandScryfallId(color as BasicLandColor),
          quantity
        }))
      ]

      // Save to deck using updateDeckFromEditor
      const result = await updateDeckFromEditor(playerId, deckId, {
        name: deckName,
        cards: allCards,
        format: 'draft',
        draftId
      })

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

// Helper to get basic land Scryfall IDs
function getBasicLandScryfallId(color: BasicLandColor): string {
  const basicLands: Record<BasicLandColor, string> = {
    W: 'bc0b8b01-8dcd-4df0-aa16-e3d2e51f8d5f', // Plains from FDN
    U: '8cfc936d-d139-420f-b4f9-7cf85a5e65d8', // Island from FDN
    B: '5462ea83-2993-4738-8e8d-98e287f4c3db', // Swamp from FDN
    R: '611a37c4-ef3c-4c5e-9e2e-8f5b55af8b5d', // Mountain from FDN
    G: '276db1e0-a3c2-459e-bbe8-29e0c0754f6e'  // Forest from FDN
  }
  return basicLands[color]
}
