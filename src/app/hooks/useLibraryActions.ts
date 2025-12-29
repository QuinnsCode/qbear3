// app/hooks/useLibraryActions.ts
import { useState } from 'react'
import { applyCardGameAction } from '@/app/serverActions/cardGame/cardGameActions'
import type { MTGPlayer } from '@/app/services/cardGame/CardGameState'

interface UseLibraryActionsProps {
  cardGameId: string
  player: MTGPlayer
  onViewZone: (zone: string) => void
}

export function useLibraryActions({ cardGameId, player, onViewZone }: UseLibraryActionsProps) {
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [drawCount, setDrawCount] = useState(1)

  const handleDrawCards = async (count: number) => {
    setShowDrawModal(false)
    try {
      await applyCardGameAction(cardGameId, {
        type: 'draw_cards',
        playerId: player.id,
        data: { count }
      })
      onViewZone('hand')
    } catch (error) {
      console.error('Failed to draw cards:', error)
    }
  }

  const handleShuffleLibrary = async () => {
    try {
      await applyCardGameAction(cardGameId, {
        type: 'shuffle_library',
        playerId: player.id,
        data: {}
      })
    } catch (error) {
      console.error('Failed to shuffle library:', error)
    }
  }

  const handleMillCards = async (count: number) => {
    try {
      for (let i = 0; i < count; i++) {
        const topCardId = player.zones.library[i]
        if (!topCardId) break
        
        await applyCardGameAction(cardGameId, {
          type: 'move_card',
          playerId: player.id,
          data: { 
            cardId: topCardId,
            fromZone: 'library',
            toZone: 'graveyard'
          }
        })
      }
    } catch (error) {
      console.error('Failed to mill cards:', error)
    }
  }

  const handleRevealTopCard = async () => {
    try {
      const topCardId = player.zones.library[0]
      if (!topCardId) {
        alert('Library is empty')
        return
      }
      
      await applyCardGameAction(cardGameId, {
        type: 'flip_card',
        playerId: player.id,
        data: { 
          cardId: topCardId,
          isFaceUp: true 
        }
      })
    } catch (error) {
      console.error('Failed to reveal top card:', error)
    }
  }

  const handleMulligan = async () => {
    if (!confirm('Mulligan? This will shuffle your hand into library and draw 7 new cards.')) {
      return
    }
    
    try {
      // Move all cards from hand to library
      for (const cardId of player.zones.hand) {
        await applyCardGameAction(cardGameId, {
          type: 'move_card',
          playerId: player.id,
          data: { cardId, fromZone: 'hand', toZone: 'library' }
        })
      }
      
      // Shuffle library
      await applyCardGameAction(cardGameId, {
        type: 'shuffle_library',
        playerId: player.id,
        data: {}
      })
      
      // Draw 7 cards
      await applyCardGameAction(cardGameId, {
        type: 'draw_cards',
        playerId: player.id,
        data: { count: 7 }
      })
      
      onViewZone('hand')
    } catch (error) {
      console.error('Failed to mulligan:', error)
    }
  }

  const handleLibraryToHand = async () => {
    const topCardId = player.zones.library[0]
    if (!topCardId) {
      alert('Library is empty')
      return
    }
    
    try {
      await applyCardGameAction(cardGameId, {
        type: 'move_card',
        playerId: player.id,
        data: { 
          cardId: topCardId,
          fromZone: 'library',
          toZone: 'hand'
        }
      })
    } catch (error) {
      console.error('Failed to move card to hand:', error)
    }
  }

  const handleHandToBattlefieldTapped = async () => {
    if (player.zones.hand.length === 0) {
      alert('Your hand is empty')
      return
    }
    
    if (confirm('Move all cards from hand to battlefield tapped?')) {
      try {
        for (const cardId of player.zones.hand) {
          await applyCardGameAction(cardGameId, {
            type: 'move_card',
            playerId: player.id,
            data: {
              cardId,
              fromZone: 'hand',
              toZone: 'battlefield',
              position: { x: Math.random() * 200, y: Math.random() * 200 },
              isFaceUp: true,
              isTapped: true
            }
          })
        }
      } catch (error) {
        console.error('Failed to move cards to battlefield:', error)
      }
    } else {
      onViewZone('hand')
    }
  }

  const openDrawModal = () => {
    setShowDrawModal(true)
    setDrawCount(1)
  }

  return {
    showDrawModal,
    drawCount,
    setDrawCount,
    setShowDrawModal,
    handleDrawCards,
    handleShuffleLibrary,
    handleMillCards,
    handleRevealTopCard,
    handleMulligan,
    handleLibraryToHand,
    handleHandToBattlefieldTapped,
    openDrawModal
  }
}