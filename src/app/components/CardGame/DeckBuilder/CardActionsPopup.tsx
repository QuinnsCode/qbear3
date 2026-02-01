// app/components/CardGame/DeckBuilder/CardActionsPopup.tsx
'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Plus, Minus, Crown, Archive, Trash2, RefreshCw, Palette } from 'lucide-react'
import ManaSymbols from '../ManaSymbols/ManaSymbols'
import type { DeckCard } from '@/app/types/Deck'
import { useCardRefresh } from '@/app/hooks/useCardRefresh'
import PrintingSelector from '../ui/PrintingSelector'
import type { CardData } from '@/app/services/cardData/types'

interface Props {
  card: DeckCard
  isBasicLand: boolean
  onClose: () => void
  onAction: (action: 'increment' | 'decrement' | 'remove' | 'toCommander' | 'toMain' | 'toSideboard' | 'toContemplating') => void
  onNavigate?: (direction: 'prev' | 'next') => void
  canNavigatePrev?: boolean
  canNavigateNext?: boolean
  onCardRefreshed?: (updatedCard: DeckCard) => void
}

export default function CardActionsPopup({ 
  card, 
  isBasicLand, 
  onClose, 
  onAction,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
  onCardRefreshed
}: Props) {
  const isCommander = card.zone === 'commander'
  const isSideboard = card.zone === 'sideboard'
  const isMainDeck = card.zone === 'main' || !card.zone
  const isContemplating = card.zone === 'contemplating'

  // Card refresh functionality
  const { refreshing, refreshCard, needsRefresh } = useCardRefresh()
  const cardNeedsRefresh = needsRefresh(card)

  // Art swapping
  const [showPrintingSelector, setShowPrintingSelector] = useState(false)

  const handleRefreshCard = async () => {
    try {
      const updatedCard = await refreshCard(card)
      if (updatedCard && onCardRefreshed) {
        onCardRefreshed(updatedCard)
      }
    } catch (error) {
      console.error('Failed to refresh card:', error)
      alert('Failed to refresh card data')
    }
  }

  const handlePrintingSelected = (printing: CardData) => {
    // Update card with new printing data
    const updatedCard: DeckCard = {
      ...card,
      scryfallId: printing.id,
      imageUrl: printing.imageUris?.normal || printing.imageUris?.large || printing.imageUris?.small || card.imageUrl
    }

    if (onCardRefreshed) {
      onCardRefreshed(updatedCard)
    }

    setShowPrintingSelector(false)
  }

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Navigation */}
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.('prev')}
              disabled={!canNavigatePrev}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                canNavigatePrev 
                  ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Prev</span>
            </button>
            <button
              onClick={() => onNavigate?.('next')}
              disabled={!canNavigateNext}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                canNavigateNext 
                  ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="text-sm">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-[400px_1fr] gap-6 p-6">
            {/* Left: Card Image */}
            <div className="flex flex-col gap-4">
              <div className="relative rounded-lg overflow-hidden shadow-2xl">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full aspect-[2.5/3.5] bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center p-6">
                    <p className="text-white text-center text-xl font-bold">{card.name}</p>
                  </div>
                )}
                
                {/* Quantity Badge */}
                <div className="absolute top-3 left-3 bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                  {card.quantity}
                </div>

                {/* CMC Badge */}
                <div className="absolute top-3 right-3 bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                  {card.cmc || 0}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => onAction('increment')}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                  <button
                    onClick={() => {
                      if (card.quantity > 1) {
                        onAction('decrement')
                      } else {
                        if (confirm(`Remove ${card.name} from deck?`)) {
                          onAction('remove')
                        }
                      }
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    {card.quantity > 1 ? (
                      <>
                        <Minus className="w-4 h-4" />
                        Remove
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>

                {/* Zone Movement */}
                {isMainDeck && !isBasicLand && (
                  <button
                    onClick={() => onAction('toCommander')}
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Crown className="w-4 h-4" />
                    Set as Commander
                  </button>
                )}
                {isCommander && (
                  <button
                    onClick={() => onAction('toMain')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Move to Main Deck
                  </button>
                )}
                {!isSideboard && !isContemplating && (
                  <button
                    onClick={() => onAction('toSideboard')}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Archive className="w-4 h-4" />
                    To Sideboard
                  </button>
                )}
                {isSideboard && (
                  <button
                    onClick={() => onAction('toMain')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    To Main Deck
                  </button>
                )}
                {!isContemplating && (
                  <button
                    onClick={() => onAction('toContemplating')}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    ☁️ To Contemplating
                  </button>
                )}
                {isContemplating && (
                  <button
                    onClick={() => onAction('toMain')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    To Main Deck
                  </button>
                )}

                {/* Data Refresh Section */}
                {cardNeedsRefresh && (
                  <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-2">
                    <p className="text-yellow-300 text-xs text-center">
                      ⚠️ Missing oracle text or rulings
                    </p>
                  </div>
                )}

                <button
                  onClick={handleRefreshCard}
                  disabled={refreshing}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  title="Fetch latest oracle text, rulings, and legalities from Scryfall"
                >
                  {refreshing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refresh Card Data
                    </>
                  )}
                </button>

                {/* Change Art Button */}
                <button
                  onClick={() => setShowPrintingSelector(true)}
                  className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  title="Choose alternate card art from different sets"
                >
                  <Palette className="w-4 h-4" />
                  Change Art
                </button>
              </div>
            </div>

            {/* Right: Card Details */}
            <div className="space-y-4">
              {/* Card Name & Type */}
              <div>
                <h2 className="text-white text-3xl font-bold mb-2">{card.name}</h2>
                <p className="text-gray-400 text-lg">{card.type}</p>
                {card.manaCost && (
                  <div className="flex justify-center mt-2">
                    <ManaSymbols manaCost={card.manaCost} size={24} />
                  </div>
                )}
              </div>

              {/* Card Stats */}
              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Mana Value:</span>
                  <span className="text-white font-semibold">{card.cmc || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Rarity:</span>
                  <span className={`font-semibold capitalize ${
                    card.rarity === 'mythic' ? 'text-orange-400' :
                    card.rarity === 'rare' ? 'text-yellow-400' :
                    card.rarity === 'uncommon' ? 'text-gray-300' :
                    'text-gray-500'
                  }`}>
                    {card.rarity || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Colors:</span>
                  <div className="flex gap-1">
                    {!card.colors || card.colors.length === 0 ? (
                      <span className="text-gray-500">Colorless</span>
                    ) : (
                      card.colors.map(color => {
                        const colorMap: Record<string, { emoji: string, name: string }> = {
                          W: { emoji: '⚪', name: 'White' },
                          U: { emoji: '🔵', name: 'Blue' },
                          B: { emoji: '⚫', name: 'Black' },
                          R: { emoji: '🔴', name: 'Red' },
                          G: { emoji: '🟢', name: 'Green' }
                        }
                        return (
                          <span key={color} title={colorMap[color]?.name || color}>
                            {colorMap[color]?.emoji || color}
                          </span>
                        )
                      })
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Zone:</span>
                  <span className={`font-semibold capitalize px-2 py-0.5 rounded ${
                    isCommander ? 'bg-yellow-900/30 text-yellow-400' :
                    isSideboard ? 'bg-purple-900/30 text-purple-400' :
                    isContemplating ? 'bg-cyan-900/30 text-cyan-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {card.zone || 'main'}
                  </span>
                </div>
              </div>

              {/* Rulings Section */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Rulings</h3>
                {card.rulings && card.rulings.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {card.rulings.map((ruling, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-gray-400 leading-relaxed">{ruling.comment}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {new Date(ruling.published_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })} • {ruling.source === 'wotc' ? 'Wizards of the Coast' : 'Scryfall'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    No rulings available for this card.
                  </p>
                )}
              </div>

              {/* Oracle Text */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Oracle Text</h3>
                {card.oracle_text ? (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    {card.oracle_text}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    No oracle text available for this card.
                  </p>
                )}
              </div>

              {/* Format Legalities */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Format Legalities</h3>
                {card.legalities ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(card.legalities)
                      .filter(([format]) => ['commander', 'modern', 'legacy', 'standard', 'vintage', 'pioneer'].includes(format))
                      .map(([format, legality]) => (
                        <div key={format} className="flex items-center gap-2">
                          <span className={
                            legality === 'legal' ? 'text-green-400' :
                            legality === 'banned' ? 'text-red-400' :
                            legality === 'restricted' ? 'text-yellow-400' :
                            'text-gray-500'
                          }>
                            {legality === 'legal' ? '✓' : 
                             legality === 'banned' ? '✗' :
                             legality === 'restricted' ? '!' : '—'}
                          </span>
                          <span className={
                            legality === 'legal' ? 'text-gray-300' : 'text-gray-500'
                          }>
                            {format.charAt(0).toUpperCase() + format.slice(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    Format legality data not available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printing Selector Modal */}
      {showPrintingSelector && (
        <PrintingSelector
          cardName={card.name}
          currentPrintId={card.scryfallId}
          onSelect={handlePrintingSelected}
          onClose={() => setShowPrintingSelector(false)}
        />
      )}
    </div>
  )
}