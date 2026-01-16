// @/app/components/CardGame/CardGameBoard/legacy/YourZones.tsx
'use client'

import type { MTGPlayer, CardGameState, TokenData } from '@/app/services/cardGame/CardGameState'
import { useState, useRef } from 'react'
import { Swords, BookOpen, Skull, Flame, Crown, Coins } from 'lucide-react'
import DeckBuilder from '@/app/components/CardGame/DeckBuilder/DeckBuilder'
import type { Deck } from '@/app/types/Deck'

// Extracted hooks
import { useLibraryActions } from '@/app/hooks/useLibraryActions'
import { useDeckManagement } from '@/app/hooks/useDeckManagement'

// Extracted components
import LibraryMenu from '../Zones/LibraryMenu'
import HandCarousel from '../Zones/HandCarousel'
import ZoneButtons from '../Zones/ZoneButtons'
import DrawCardsModal from '../ui/Modals/DrawCardsModal'
import TokenCreationModal from '../../TokenCreationModal'

interface Props {
  player: MTGPlayer
  gameState: CardGameState
  cardGameId: string
  onViewZone: (zone: string) => void
  onSelectBattlefield: () => void
  isViewingHand?: boolean
  decks?: Deck[]
  userId: string
  onCreateDeck?: (deckList: string, deckName: string) => Promise<void>
  onDeleteDeck?: (deckId: string) => Promise<void>
  onSelectDeck?: (deckId: string) => Promise<void>
  onEditDeck?: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  onPrefetchDecks?: () => Promise<void>
  spectatorMode?: boolean
  isSandbox?: boolean
}

export default function YourZones({ 
  player, 
  gameState, 
  cardGameId, 
  onViewZone, 
  onSelectBattlefield, 
  isViewingHand = false,
  decks = [],
  userId,
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck,
  onPrefetchDecks,
  spectatorMode,
  isSandbox
}: Props) {
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false)
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const libraryButtonRef = useRef<HTMLButtonElement>(null)

  const hasNoDeck = player.zones.library.length === 0 && isSandbox

  // Use extracted hooks
  const libraryActions = useLibraryActions({ cardGameId, player, onViewZone })
  const deckManagement = useDeckManagement({ hasNoDeck, onPrefetchDecks })

  const handleMoveCard = async (cardId: string, fromZone: string, toZone: string) => {
    try {
      const { applyCardGameAction } = await import('@/app/serverActions/cardGame/cardGameActions')
      applyCardGameAction(cardGameId, {
        type: 'move_card',
        playerId: player.id,
        data: { cardId, fromZone, toZone }
      }).catch(error => {
        console.error('Failed to move card:', error)
      })
    } catch (error) {
      console.error('Failed to move card:', error)
    }
  }

  const handleCreateToken = async (tokenData: TokenData) => {
    try {
      const { applyCardGameAction } = await import('@/app/serverActions/cardGame/cardGameActions')
      
      // Get battlefield container (the scrollable area)
      const battlefield = document.querySelector('[data-battlefield]') as HTMLElement
      
      if (!battlefield) {
        console.warn('Battlefield not found, using fallback position')
        await applyCardGameAction(cardGameId, {
          type: 'create_token',
          playerId: player.id,
          data: { 
            tokenData, 
            position: { x: 100, y: 100 } // Fallback
          }
        })
        return
      }
      
      const rect = battlefield.getBoundingClientRect()
      
      // Place token in top-left of visible viewport + some padding
      // This accounts for current scroll position
      const PADDING = 50 // pixels from edge
      const position = {
        x: battlefield.scrollLeft + PADDING,
        y: battlefield.scrollTop + PADDING
      }
      
      console.log('Creating token at position:', position)
      
      await applyCardGameAction(cardGameId, {
        type: 'create_token',
        playerId: player.id,
        data: { tokenData, position }
      })
      
      console.log('✅ Token created:', tokenData.name)
    } catch (error) {
      console.error('Failed to create token:', error)
    }
  }

  const handleOnSelectBattlefield = () => {
    setLibraryMenuOpen(false)
    deckManagement.handleCloseDeckBuilder()
    onSelectBattlefield()
  }

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden h-full p-2 flex gap-2">
        {/* Left: Hand */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <button
            onClick={() => onViewZone('hand')}
            className="flex-1 bg-slate-900 hover:bg-slate-800 rounded border-2 border-slate-700 p-2 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🃏</span>
              <span className="text-white text-sm font-semibold">Hand</span>
            </div>
            <span className="text-white font-bold">{player.zones.hand.length}</span>
          </button>
        </div>
        
        {/* Center: Battlefield */}
        <button
          onClick={handleOnSelectBattlefield}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const cardId = e.dataTransfer.getData('cardId')
            const fromZone = e.dataTransfer.getData('fromZone')
            handleMoveCard(cardId, fromZone, 'battlefield')
          }}
          className="w-24 bg-slate-900 hover:bg-slate-800 rounded border-2 border-slate-700 p-2 flex flex-col items-center justify-center transition-colors group"
        >
          <Swords className="w-8 h-8 mb-1 text-white group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] transition-all" />
          <span className="text-white text-xs font-bold">Board</span>
          <span className="text-white text-lg font-bold">{player.zones.battlefield.length}</span>
        </button>
        
        {/* Right: Library with menu + Other zones */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Library with menu */}
          <div>
            <button
              ref={libraryButtonRef}
              onClick={() => onViewZone('library')}
              className="w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 rounded p-2 flex items-center justify-between relative transition-colors group"
            >
              <div className="flex items-center gap-2 text-white">
                <BookOpen className="w-6 h-6 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all" />
                <span className="font-bold">{player.zones.library.length}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setLibraryMenuOpen(!libraryMenuOpen)
                }}
                disabled={spectatorMode || isSandbox}
                className="text-white hover:bg-slate-700 rounded px-2 py-1 text-sm z-10 transition-colors"
              >
                ⋯
              </button>
            </button>
          </div>
          
          {/* Other zones in grid */}
          <div className="grid grid-cols-3 gap-1">
            <ZoneCardMobile 
              icon={<Skull className="w-6 h-6" />}
              glowColor="rgba(168,85,247,0.8)"
              count={player.zones.graveyard.length} 
              onClick={() => onViewZone('graveyard')} 
            />
            <ZoneCardMobile 
              icon={<Flame className="w-6 h-6" />}
              glowColor="rgba(239,68,68,0.8)"
              count={player.zones.exile.length} 
              onClick={() => onViewZone('exile')} 
            />
            <ZoneCardMobile 
              icon={<Crown className="w-6 h-6" />}
              glowColor="rgba(251,191,36,0.8)"
              count={player.zones.command.length} 
              onClick={() => onViewZone('command')} 
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Library Menu */}
      <LibraryMenu
        player={player}
        isOpen={libraryMenuOpen}
        onClose={() => setLibraryMenuOpen(false)}
        onImportDeck={deckManagement.handleImportDeck}
        onOpenDeckBuilder={deckManagement.handleOpenDeckBuilder}
        onMulligan={libraryActions.handleMulligan}
        onDrawCards={libraryActions.handleDrawCards}
        onDrawX={libraryActions.openDrawModal}
        onLibraryToHand={libraryActions.handleLibraryToHand}
        onShuffle={libraryActions.handleShuffleLibrary}
        onMill={libraryActions.handleMillCards}
        onReveal={libraryActions.handleRevealTopCard}
        onHandToBattlefieldTapped={libraryActions.handleHandToBattlefieldTapped}
        onCreateToken={() => setTokenModalOpen(true)}
        onPrefetchDecks={onPrefetchDecks}
        spectatorMode={spectatorMode}
        buttonRef={libraryButtonRef}
        isMobile={true}
      />
      
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex h-full p-3 gap-3">
        {/* Hand Carousel */}
        <HandCarousel
          player={player}
          gameState={gameState}
          cardGameId={cardGameId}
          isViewingHand={isViewingHand}
          onViewZone={onViewZone}
        />
        
        {/* Zone Buttons (Library, Graveyard, Exile, Command, Battlefield) */}
        <ZoneButtons
          player={player}
          cardGameId={cardGameId}
          onViewZone={onViewZone}
          onSelectBattlefield={handleOnSelectBattlefield}
          onOpenLibraryMenu={() => setLibraryMenuOpen(!libraryMenuOpen)}
          hasNoDeck={hasNoDeck}
          onOpenDeckBuilder={deckManagement.handleOpenDeckBuilder}
          onCreateToken={() => setTokenModalOpen(true)}
          spectatorMode={spectatorMode}
          isViewingHand={isViewingHand}
          libraryButtonRef={libraryButtonRef}
        />
      </div>

      {/* Desktop Library Menu */}
      <LibraryMenu
        player={player}
        isOpen={libraryMenuOpen}
        onClose={() => setLibraryMenuOpen(false)}
        onImportDeck={deckManagement.handleImportDeck}
        onOpenDeckBuilder={deckManagement.handleOpenDeckBuilder}
        onMulligan={libraryActions.handleMulligan}
        onDrawCards={libraryActions.handleDrawCards}
        onDrawX={libraryActions.openDrawModal}
        onLibraryToHand={libraryActions.handleLibraryToHand}
        onShuffle={libraryActions.handleShuffleLibrary}
        onMill={libraryActions.handleMillCards}
        onReveal={libraryActions.handleRevealTopCard}
        onHandToBattlefieldTapped={libraryActions.handleHandToBattlefieldTapped}
        onCreateToken={() => setTokenModalOpen(true)}
        onPrefetchDecks={onPrefetchDecks}
        spectatorMode={spectatorMode}
        buttonRef={libraryButtonRef}
        isMobile={false}
      />
      
      {/* Draw X Cards Modal */}
      <DrawCardsModal
        isOpen={libraryActions.showDrawModal}
        drawCount={libraryActions.drawCount}
        setDrawCount={libraryActions.setDrawCount}
        onDraw={libraryActions.handleDrawCards}
        onClose={() => libraryActions.setShowDrawModal(false)}
        player={player}
      />

      {/* Token Creation Modal */}
      <TokenCreationModal
        isOpen={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onCreateToken={handleCreateToken}
        playerId={player.id}
      />
      
      {/* Deck Builder Modal */}
      {deckManagement.isDeckBuilderOpen && onCreateDeck && onDeleteDeck && onSelectDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4">
            <button
              onClick={deckManagement.handleCloseDeckBuilder}
              className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg transition-colors"
            >
              ✕
            </button>
            
            <div className="w-full h-full overflow-auto rounded-xl shadow-2xl">
              <DeckBuilder
                decks={decks}
                userId={userId || ''}
                onCreateDeck={onCreateDeck}
                onDeleteDeck={onDeleteDeck}
                onSelectDeck={async (deckId) => {
                  if (onSelectDeck) {
                    await onSelectDeck(deckId)
                  }
                  deckManagement.handleCloseDeckBuilder()
                }}
                onEditDeck={onEditDeck || (async () => {})}
                isSandbox={isSandbox}
                cardGameId={cardGameId}
                onClose={deckManagement.handleCloseDeckBuilder}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Mobile zone card component
function ZoneCardMobile({ icon, glowColor, count, onClick }: {
  icon: React.ReactNode
  glowColor: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 hover:bg-slate-800 rounded p-1 flex flex-col items-center justify-center border border-slate-700 transition-colors group"
      style={{
        ['--glow-color' as string]: glowColor
      }}
    >
      <div className="text-white group-hover:[filter:drop-shadow(0_0_6px_var(--glow-color))] transition-all">
        {icon}
      </div>
      <span className="text-white text-xs font-bold">{count}</span>
    </button>
  )
}