// app/components/Draft/DraftContent.tsx - ENHANCED WITH SIDEBOARD
'use client'

import React, { useState, useEffect } from 'react'
import { useDraftSync } from '@/app/hooks/draft/useDraftSync'
import PackDisplay from './PackDisplay'
import DraftPool from './DraftPool'
import DraftProgress from './DraftProgress'
import DraftDeckBuilderModal from './DraftDeckBuilderModal'
import DraftAuthBanner from './DraftAuthBanner'
import MobileDraftTabs, { type DraftTab } from './MobileDraftTabs'
import DragHandle from '../CardGame/CardGameBoard/ui/DragHandle'
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
  const { draftState, isConnected, error, utils } = useDraftSync({
    draftId,
    initialState,
    currentPlayerId: userId,
    onError: (err) => console.error('Draft error:', err)
  })
  
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [showDeckBuilder, setShowDeckBuilder] = useState(false)
  const [showReconnecting, setShowReconnecting] = useState(false)
  
  // Sideboard state - persisted to localStorage
  const [sideboardCards, setSideboardCards] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(`draft:${draftId}:sideboard`)
      const parsed = stored ? JSON.parse(stored) : []
      if (parsed.length > 0) {
        console.log('♻️ Restored sideboard from previous session:', parsed.length, 'cards')
      }
      return parsed
    } catch {
      return []
    }
  })
  
  // Persist sideboard changes to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`draft:${draftId}:sideboard`, JSON.stringify(sideboardCards))
      console.log('💾 Saved sideboard state:', sideboardCards.length, 'cards')
    } catch (error) {
      console.error('Failed to save sideboard:', error)
    }
  }, [sideboardCards, draftId])
  
  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [mobileTab, setMobileTab] = useState<DraftTab>('pack')
  
  // Desktop drag state - persisted to localStorage
  const [poolWidth, setPoolWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    try {
      const stored = localStorage.getItem('draft:poolWidth')
      return stored ? parseInt(stored) : 320
    } catch {
      return 320
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isPoolCollapsed, setIsPoolCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem('draft:poolCollapsed')
      return stored === 'true'
    } catch {
      return false
    }
  })
  
  // Persist layout preferences
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('draft:poolWidth', poolWidth.toString())
    } catch (error) {
      console.error('Failed to save pool width:', error)
    }
  }, [poolWidth])
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('draft:poolCollapsed', isPoolCollapsed.toString())
    } catch (error) {
      console.error('Failed to save pool collapsed state:', error)
    }
  }, [isPoolCollapsed])
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Desktop drag handling
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      const constrainedWidth = Math.max(260, Math.min(600, newWidth))
      setPoolWidth(constrainedWidth)
      
      // Auto-collapse if dragged very small
      if (newWidth < 100) {
        setIsPoolCollapsed(true)
        setIsDragging(false)
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])
  
  // Show reconnecting overlay
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isConnected) {
      timeout = setTimeout(() => setShowReconnecting(true), 2000)
    } else {
      setShowReconnecting(false)
    }
    return () => clearTimeout(timeout)
  }, [isConnected])
  
  // Set guest cookie
  useEffect(() => {
    if (!isLoggedIn) {
      const cookieName = `draft_user_${draftId}`
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)
      document.cookie = `${cookieName}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
      console.log('🍪 Set draft cookie for guest:', userId)
    }
  }, [userId, draftId, isLoggedIn])
  
  const currentPlayer = draftState?.players?.find(p => p.id === userId)
  
  // Sideboard handlers
  const handleMoveToSideboard = (cardId: string) => {
    setSideboardCards(prev => [...prev, cardId])
  }
  
  const handleMoveToMainDeck = (cardId: string) => {
    setSideboardCards(prev => prev.filter(id => id !== cardId))
  }
  
  const handleClearSideboard = () => {
    setSideboardCards([])
    console.log('🧹 Cleared sideboard')
  }
  
  // Get main deck cards (pool minus sideboard)
  const mainDeckCards = currentPlayer?.draftPool?.filter(
    cardId => !sideboardCards.includes(cardId)
  ) || []
  
  // Export deck to text (for guest users)
  const handleExportDeck = async () => {
    if (!currentPlayer) return
    
    const pool = currentPlayer.draftPool
    const cubeCards = draftState.cubeCards || []
    const cardsByName: Record<string, number> = {}
    
    // Group main deck cards
    const mainCards = pool.filter(id => !sideboardCards.includes(id))
    mainCards.forEach(scryfallId => {
      const card = cubeCards.find(c => c.scryfallId === scryfallId)
      if (card) {
        cardsByName[card.name] = (cardsByName[card.name] || 0) + 1
      }
    })
    
    const lines = Object.entries(cardsByName)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => `${count} ${name}`)
    
    // Add sideboard section
    const sideboardLines: string[] = []
    if (sideboardCards.length > 0) {
      const sideboardByName: Record<string, number> = {}
      sideboardCards.forEach(scryfallId => {
        const card = cubeCards.find(c => c.scryfallId === scryfallId)
        if (card) {
          sideboardByName[card.name] = (sideboardByName[card.name] || 0) + 1
        }
      })
      sideboardLines.push('', 'Sideboard:')
      sideboardLines.push(...Object.entries(sideboardByName)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, count]) => `${count} ${name}`))
    }
    
    const text = [
      `# Draft Pool - ${userName}`,
      `# Draft ID: ${draftId}`,
      `# Main Deck: ${mainCards.length}`,
      `# Sideboard: ${sideboardCards.length}`,
      `# Total Cards: ${pool.length}`,
      `# Date: ${new Date().toLocaleDateString()}`,
      '',
      '# To import later: Log in and upload this file',
      '',
      ...lines,
      ...sideboardLines
    ].join('\n')
    
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `draft-pool-${draftId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    try {
      await navigator.clipboard.writeText(text)
      alert('✅ Deck exported and copied to clipboard!\n\nLog in to save it to Sanctum.')
    } catch {
      alert('✅ Deck exported as file!')
    }
  }
  
  // Reconnecting overlay
  if (showReconnecting) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <h2 className="text-white text-2xl font-bold mb-2">Reconnecting...</h2>
          <p className="text-slate-400 mb-4">
            {error || 'Connection lost. Attempting to reconnect...'}
          </p>
          <button
            onClick={() => {
              utils.clearError()
              utils.reconnect()
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Retry Now
          </button>
        </div>
      </div>
    )
  }
  
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
        if (isMobile) setMobileTab('pack')
      } else {
        alert('Failed to make pick: ' + result.error)
      }
    }
  }
  
  const handleFinalizeDeck = async (deckConfig: {
    mainDeck: Array<{ scryfallId: string; quantity: number }>
    sideboard: Array<{ scryfallId: string; quantity: number }>
    basics: Record<'W' | 'U' | 'B' | 'R' | 'G', number>
  }) => {
    try {
      console.log('🎴 Finalizing deck with config:', {
        mainDeckCount: deckConfig.mainDeck.length,
        sideboardCount: deckConfig.sideboard.length,
        basicsCount: Object.values(deckConfig.basics).reduce((a, b) => a + b, 0)
      })
      
      const result = await exportDraftDeck(draftId, userId, deckConfig)
      
      console.log('📤 Export result:', result)
      
      if (!result.success) {
        // Check if it's the deck limit error
        if (result.error?.includes('10 draft decks') || result.error?.includes('draft deck')) {
          const shouldDelete = confirm(
            '⚠️ You have reached the 10 draft deck limit.\n\n' +
            'Would you like to delete your oldest draft deck to make room?\n\n' +
            '(You can also go to Sanctum and manually delete decks you don\'t need)'
          )
          
          if (shouldDelete) {
            try {
              // Import getUserDecks and deleteDeck
              const { getUserDecks, deleteDeck } = await import('@/app/serverActions/deckBuilder/deckActions')
              const decksResult = await getUserDecks(userId)
              
              if (decksResult.success && decksResult.decks.length > 0) {
                // Find oldest draft deck (filter by format and sort by createdAt)
                const draftDecks = decksResult.decks
                  .filter(d => d.format?.toLowerCase() === 'draft')
                  .sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime()
                    const dateB = new Date(b.createdAt || 0).getTime()
                    return dateA - dateB
                  })
                
                if (draftDecks.length > 0) {
                  const oldestDeck = draftDecks[0]
                  console.log('🗑️ Deleting oldest draft deck:', oldestDeck.name)
                  
                  const deleteResult = await deleteDeck(userId, oldestDeck.id)
                  
                  if (deleteResult.success) {
                    alert(`✅ Deleted oldest draft deck: "${oldestDeck.name}"\n\nNow saving your new deck...`)
                    
                    // Try exporting again
                    const retryResult = await exportDraftDeck(draftId, userId, deckConfig)
                    
                    if (!retryResult.success) {
                      throw new Error(retryResult.error || 'Failed to export deck after deletion')
                    }
                    
                    console.log('✅ Deck exported successfully after cleanup')
                    setShowDeckBuilder(false)
                    return
                  } else {
                    throw new Error(deleteResult.error || 'Failed to delete old deck')
                  }
                } else {
                  throw new Error('No draft decks found to delete')
                }
              } else {
                throw new Error('Failed to fetch decks')
              }
            } catch (cleanupError) {
              console.error('Failed to cleanup old decks:', cleanupError)
              alert(`Failed to delete old deck: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}\n\nPlease go to Sanctum and delete one manually.`)
              return
            }
          } else {
            // User declined - give them link to Sanctum
            const goToSanctum = confirm(
              'No problem! Would you like to go to Sanctum to manage your decks?\n\n' +
              '(Your draft progress is saved - you can come back and build this deck later)'
            )
            if (goToSanctum) {
              window.location.href = '/sanctum'
            }
            return
          }
        }
        
        throw new Error(result.error || 'Failed to export deck')
      }
      
      console.log('✅ Deck exported successfully')
      
      // Clean up draft-specific state
      try {
        localStorage.removeItem(`draft:${draftId}:sideboard`)
        console.log('🧹 Cleaned up draft state')
      } catch (error) {
        console.error('Failed to clean up draft state:', error)
      }
      
      setShowDeckBuilder(false)
      
    } catch (error) {
      console.error('❌ Failed to export deck:', error)
      alert(`Failed to export deck: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }
  
  // Draft complete screens
  if (isDraftComplete && !isAI) {
    if (!hasBuiltDeck) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
          <DraftAuthBanner 
            isLoggedIn={isLoggedIn}
            userName={userName}
            onExportDeck={handleExportDeck}
          />
          
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl p-8 max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-white text-3xl font-bold mb-2">Draft Complete!</h2>
                <p className="text-gray-400 text-lg">
                  You drafted {currentPlayer.draftPool.length} cards
                </p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-3">Your Cards:</h3>
                <DraftPool 
                  cards={mainDeckCards} 
                  draftId={draftId} 
                  compact 
                  sideboardCards={sideboardCards}
                  onMoveToSideboard={handleMoveToSideboard}
                  onMoveToMainDeck={handleMoveToMainDeck}
                  onClearSideboard={handleClearSideboard}
                  showDeckCounter={true}
                />
              </div>
              
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => setShowDeckBuilder(true)}
                    disabled={mainDeckCards.length < 40}
                    className={`w-full font-bold py-4 px-6 rounded-lg transition-all text-lg shadow-lg hover:shadow-xl ${
                      mainDeckCards.length >= 40
                        ? 'bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {mainDeckCards.length >= 40 
                      ? '🃏 Build Your Deck' 
                      : `⚠️ Need ${40 - mainDeckCards.length} more cards in main deck`}
                  </button>
                  <div className="mt-4 text-center space-y-1">
                    <p className="text-gray-400 text-sm">
                      • Minimum 40 cards in main deck required
                    </p>
                    <p className="text-gray-400 text-sm">
                      • Move cards to sideboard before building
                    </p>
                    <p className="text-gray-400 text-sm">
                      • Add unlimited basic lands in deck builder
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleExportDeck}
                    className="w-full bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-all text-lg shadow-lg hover:shadow-xl mb-3"
                  >
                    📥 Export Deck to Text
                  </button>
                  <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-center">
                    <p className="text-amber-100 text-sm mb-2">
                      💡 <strong>Want to save your deck?</strong>
                    </p>
                    <p className="text-amber-200/80 text-xs mb-3">
                      Log in to build your deck with our deck builder and save it to Sanctum
                    </p>
                    <div className="flex gap-2 justify-center">
                      <a
                        href={`/login?redirect=/draft/${draftId}`}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded transition-colors"
                      >
                        Log In
                      </a>
                      <a
                        href={`/signup?redirect=/draft/${draftId}`}
                        className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold rounded transition-colors"
                      >
                        Sign Up
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {showDeckBuilder && isLoggedIn && (
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
    
    // Deck finalized - success screen
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <DraftAuthBanner 
          isLoggedIn={isLoggedIn}
          userName={userName}
          onExportDeck={handleExportDeck}
        />
        
        <div className="flex-1 flex items-center justify-center p-4">
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
      </div>
    )
  }
  
  // Draft in progress
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <DraftAuthBanner 
        isLoggedIn={isLoggedIn}
        userName={userName}
        onExportDeck={handleExportDeck}
      />
      
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
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-slate-300 text-sm hidden sm:inline">
                {isConnected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile: Tabs */}
      {isMobile && (
        <MobileDraftTabs
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          poolCount={mainDeckCards.length}
        />
      )}
      
      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile: Single view based on tab */}
        {isMobile ? (
          <div className="flex-1 overflow-y-auto p-4">
            {mobileTab === 'pack' && currentPack ? (
              <div className="max-w-5xl mx-auto">
                <div className="mb-4 flex flex-col gap-3">
                  <h2 className="text-xl text-white font-semibold">
                    Pick {pickCount} card{pickCount > 1 ? 's' : ''}
                  </h2>
                  <button
                    type="button"
                    onClick={handleConfirmPick}
                    disabled={selectedCards?.length !== pickCount}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      selectedCards?.length === pickCount
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-700 text-slate-500'
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
              </div>
            ) : mobileTab === 'pack' ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl text-slate-400">Waiting for other players...</p>
              </div>
            ) : (
              // Pool view
              <div>
                <DraftPool 
                  cards={mainDeckCards} 
                  draftId={draftId} 
                  compact={false}
                  sideboardCards={sideboardCards}
                  onMoveToSideboard={handleMoveToSideboard}
                  onMoveToMainDeck={handleMoveToMainDeck}
                  onClearSideboard={handleClearSideboard}
                  showDeckCounter={true}
                />
              </div>
            )}
          </div>
        ) : (
          // Desktop: Split view with drag handle
          <>
            <div className="flex-1 p-6 overflow-y-auto" style={{ marginRight: isPoolCollapsed ? 40 : poolWidth }}>
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
            
            {/* Drag handle with collapse */}
            {!isPoolCollapsed && (
              <div 
                className="absolute right-0 top-0 bottom-0 z-40"
                style={{ width: `${poolWidth}px` }}
              >
                <div className="relative h-full flex">
                  <DragHandle
                    orientation="vertical"
                    onDragStart={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    isDragging={isDragging}
                    onCollapse={() => setIsPoolCollapsed(true)}
                    isCollapsed={false}
                  />
                  
                  <div className="flex-1 bg-slate-800 border-l border-slate-700 h-full overflow-hidden">
                    <DraftPool 
                      cards={mainDeckCards} 
                      draftId={draftId} 
                      compact 
                      sideboardCards={sideboardCards}
                      onMoveToSideboard={handleMoveToSideboard}
                      onMoveToMainDeck={handleMoveToMainDeck}
                      onClearSideboard={handleClearSideboard}
                      showDeckCounter={true}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Collapsed tab */}
            {isPoolCollapsed && (
              <button
                onClick={() => setIsPoolCollapsed(false)}
                className="absolute right-0 top-0 bottom-0 w-10 bg-slate-800 hover:bg-slate-700 border-l border-slate-700 flex flex-col items-center justify-center gap-2 transition-all group z-40"
                title="Expand pool panel"
              >
                <span className="text-slate-400 group-hover:text-blue-400 text-xs [writing-mode:vertical-lr] rotate-180 transition-colors">
                  Pool ({mainDeckCards.length})
                </span>
                {sideboardCards.length > 0 && (
                  <span className="text-purple-400 text-xs [writing-mode:vertical-lr] rotate-180">
                    SB ({sideboardCards.length})
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}