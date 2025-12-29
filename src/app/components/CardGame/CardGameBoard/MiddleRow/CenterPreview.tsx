'use client'

import type { CardGameState } from '@/app/services/cardGame/CardGameState'

interface Props {
  gameState: CardGameState
}

export default function CenterPreview({ gameState }: Props) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-sm">Card Preview</p>
        <p className="text-xs mt-1">Hover over cards to preview them here</p>
      </div>
    </div>
  )
}