// app/components/Draft/DraftContent.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useDraftSync } from '@/app/hooks/draft/useDraftSync'
import PackDisplay from './PackDisplay'
import DraftPool from './DraftPool'
import DraftProgress from './DraftProgress'
import DraftDeckBuilderModal from './DraftDeckBuilderModal'
import type { DraftState } from '@/app/types/Draft'
import { makePick as makePickAction } from '@/app/serverActions/draft/makePick'
import { exportDraftDeck } from '@/app/serverActions/draft/exportDraftDeck'

interface Props {
  draftId: string
  initialState: DraftState
  userId: string
  userName: string
  isLoggedIn: boolean
}

export default function DraftContent({ 
  draftId, 
  initialState, 
  userId,
  userName,
  isLoggedIn 
}: Props) {
  const { draftState, isConnected, makePick } = useDraftSync({
    draftId,
    initialState,
    currentPlayerId: userId
  })
  
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [showDeckBuilder, setShowDeckBuilder] = useState(false)
  
  useEffect(() => {
    if (!isLoggedIn) {
      const cookieName = `draft_user_${draftId}`
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)
      document.cookie = `${cookieName}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
      console.log('🍪 Set draft cookie:', userId)
    }
  }, [userId, draftId, isLoggedIn])
  
  const currentPlayer = draftState?.players?.find(p => p.id === userId)
  
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto text-white">
          <h1 className="text-3xl font-bold mb-4">Draft Starting...</h1>
          <p className="text-slate-400 mb-2">Status: {draftState?.status}</p>
          <p className="text-slate-400 mb-2">Players: {draftState?.players?.length}</p>
          <div className="mt-4">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-700 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  const currentPack = currentPlayer?.currentPack
  const pickCount = draftState.config.pickCount
  const isDraftComplete = draftState.status === 'complete'
  const hasBuiltDeck = currentPlayer?.deckConfiguration?.isFinalized
  const isAI = currentPlayer?.isAI
  
  const handleCardClick = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(prev => prev.filter(id => id !== cardId))
    } else {
      if (selectedCards?.length < pickCount) {
        setSelectedCards(prev => [...prev, cardId])
      }
    }
  }
  
  const handleConfirmPick = async () => {
    if (selectedCards?.length === pickCount) {
      const result = await makePickAction(draftId, selectedCards, userId)
      if (result.success) {
        setSelectedCards([])
      } else {
        alert('Failed to make pick')
      }
    }
  }
  
  // ✅ NEW: Handle deck finalization
  const handleFinalizeDeck = async (deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<'W' | 'U' | 'B' | 'R' | 'G', number>
  }) => {
    try {
      const result = await exportDraftDeck(draftId, userId, deckConfig)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to export deck')
      }
      
      // Close modal and show success
      setShowDeckBuilder(false)
      
    } catch (error) {
      console.error('Failed to export deck:', error)
      throw error // Let modal handle the error display
    }
  }
  
  // ✅ UPDATED: Draft complete screen with deck builder
  if (isDraftComplete && !isAI) {
    // Show deck builder button if not finalized
    if (!hasBuiltDeck) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl p-8 max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-white text-3xl font-bold mb-2">Draft Complete!</h2>
              <p className="text-gray-400 text-lg">
                You drafted {currentPlayer.draftPool.length} cards
              </p>
            </div>
            
            {/* Draft Pool Preview */}
            <div className="mb-8">
              <h3 className="text-white font-semibold mb-3">Your Cards:</h3>
              <DraftPool 
                cards={currentPlayer.draftPool} 
                draftId={draftId} 
                compact 
              />
            </div>
            
            {/* Build Deck Button */}
            <button
              onClick={() => setShowDeckBuilder(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all text-lg shadow-lg hover:shadow-xl"
            >
              🃏 Build Your Deck
            </button>
            
            <div className="mt-4 text-center space-y-1">
              <p className="text-gray-400 text-sm">
                • Minimum 40 cards required
              </p>
              <p className="text-gray-400 text-sm">
                • Add unlimited basic lands
              </p>
              <p className="text-gray-400 text-sm">
                • Export to Sanctum when done
              </p>
            </div>
          </div>
          
          {/* ✅ NEW: Deck Builder Modal */}
          {showDeckBuilder && (
            <DraftDeckBuilderModal
              draftPool={currentPlayer.draftPool}
              cubeCards={draftState.cubeCards || []}
              playerId={userId}
              playerName={userName}
              onClose={() => setShowDeckBuilder(false)}
              onFinalize={handleFinalizeDeck}
              initialConfig={currentPlayer.deckConfiguration}
            />
          )}
        </div>
      )
    }
    
    // ✅ NEW: Show success screen after deck is finalized
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-white text-2xl font-bold mb-2">Deck Exported!</h2>
          <p className="text-gray-400 mb-6">
            Your {currentPlayer.deckConfiguration?.totalCards}-card draft deck has been saved to Sanctum.
          </p>
          
          <div className="flex flex-col gap-3">
            <a
              href="/sanctum"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              📚 View in Sanctum
            </a>
            <button
              onClick={() => setShowDeckBuilder(true)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              ✏️ Edit Deck
            </button>
            <a
              href="/draft/new"
              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              🎴 Start New Draft
            </a>
          </div>
        </div>
        
        {/* Allow editing even after finalization */}
        {showDeckBuilder && (
          <DraftDeckBuilderModal
            draftPool={currentPlayer.draftPool}
            cubeCards={draftState.cubeCards || []}
            playerId={userId}
            playerName={userName}
            onClose={() => setShowDeckBuilder(false)}
            onFinalize={handleFinalizeDeck}
            initialConfig={currentPlayer.deckConfiguration}
          />
        )}
      </div>
    )
  }
  
  // ✅ AI players or draft in progress - show normal draft UI
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Cube Draft</h1>
            <DraftProgress 
              round={draftState.currentRound + 1}
              pick={draftState.currentPick + 1}
              totalRounds={draftState.config.packsPerPlayer}
              totalPicks={draftState.config.packSize}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{userName}</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-slate-300 text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {currentPack ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl text-white font-semibold">
                    Pick {pickCount} card{pickCount > 1 ? 's' : ''}
                  </h2>
                  <button
                    type="button"
                    onClick={handleConfirmPick}
                    disabled={selectedCards?.length !== pickCount}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                      selectedCards?.length === pickCount
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Confirm Pick ({selectedCards?.length}/{pickCount})
                  </button>
                </div>
                
                <PackDisplay 
                  pack={currentPack.cards}
                  selectedCards={selectedCards}
                  onCardClick={handleCardClick}
                />
              </>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl text-slate-400">Waiting for other players...</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">
            Your Picks ({currentPlayer?.draftPool?.length || 0})
          </h3>
          <DraftPool 
            cards={currentPlayer?.draftPool || []} 
            draftId={draftId} 
            compact 
          />
        </div>
      </div>
    </div>
  )
}