// app/components/CardGame/CardGameRestartButton.tsx
'use client'

import { useState } from 'react'
import { restartCardGame } from '@/app/serverActions/cardGame/cardGameActions'

interface Props {
  cardGameId: string
}

export default function CardGameRestartButton({ cardGameId }: Props) {
  const [clickCount, setClickCount] = useState(0)
  const [isRestarting, setIsRestarting] = useState(false)

  const handleClick = async () => {
    if (clickCount === 0) {
      setClickCount(1)
      // Reset after 3 seconds if they don't click again
      setTimeout(() => setClickCount(0), 3000)
    } else if (clickCount === 1) {
      setIsRestarting(true)
      try {
        await restartCardGame(cardGameId)
        setClickCount(0)
        // Game will reload via WebSocket broadcast
      } catch (error) {
        console.error('Failed to restart game:', error)
        setIsRestarting(false)
        setClickCount(0)
      }
    }
  }

  const getButtonText = () => {
    if (isRestarting) return 'Restarting...'
    if (clickCount === 1) return 'Are You Sure?'
    return 'Restart Game?'
  }

  return (
    <button
      onClick={handleClick}
      disabled={isRestarting}
      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
    >
      {getButtonText()}
    </button>
  )
}