// app/components/CardGame/DeckBuilder/DeckListView.tsx
'use client'

import { useState, useMemo } from 'react'
import CardActionsPopup from './CardActionsPopup'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import ManaSymbols from '../ManaSymbols/ManaSymbols'
import type { DeckCard } from '@/app/types/Deck'

interface Props {
  cards: DeckCard[]
  onUpdateCard: (cardId: string, updates: Partial<DeckCard>) => void
  onRemoveCard: (cardId: string) => void
  onIncrementCard: (cardId: string) => void
  onDecrementCard: (cardId: string) => void
  searchText?: string
  colorFilters?: string[]
}

interface CardSection {
  id: string
  title: string
  emoji: string
  cards: DeckCard[]
  totalCount: number
  hybridLandCount?: number
}

export default function DeckListView({
  cards,
  onUpdateCard,
  onRemoveCard,
  onIncrementCard,
  onDecrementCard,
  searchText = '',
  colorFilters = []
}: Props) {
  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [hoveredCard, setHoveredCard] = useState<DeckCard | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent, card: DeckCard) => {
    setHoveredCard(card)
    setMousePosition({ x: e.clientX, y: e.clientY })
  }

  const isPureLand = (type: string) => {
    const lower = type.toLowerCase()
    return lower.includes('land') && !lower.match(/creature|artifact|enchantment/)
  }

  const isHybridLand = (type: string) => {
    const lower = type.toLowerCase()
    return lower.includes('land') && lower.match(/creature|artifact|enchantment/)
  }

  const isBasicLand = (type: string) => {
    return type.toLowerCase().includes('basic land')
  }

  const isMDFC = (name: string) => {
    return name.includes(' // ')
  }

  const sections = useMemo((): CardSection[] => {
    // Filter cards based on search and color filters
    const filteredCards = cards.filter(card => {
      // Search filter
      if (searchText && !card.name.toLowerCase().includes(searchText.toLowerCase())) {
        return false
      }
      
      // Color filter
      if (colorFilters.length > 0) {
        // Check if card has any of the selected colors
        const hasMatchingColor = colorFilters.some(filterColor => 
          card.colors?.includes(filterColor)
        )
        if (!hasMatchingColor) return false
      }
      
      return true
    })

    const commanderCards = filteredCards.filter(c => c.zone === 'commander')
    const mainDeckCards = filteredCards.filter(c => c.zone === 'main')
    const sideboardCards = filteredCards.filter(c => c.zone === 'sideboard')
    const contemplatingCards = filteredCards.filter(c => c.zone === 'contemplating')

    const categorizeCard = (card: DeckCard): string => {
      const type = card.type?.toLowerCase() || ''
      if (type.includes('planeswalker')) return 'planeswalkers'
      if (type.includes('creature')) return 'creatures'
      if (type.includes('artifact')) return 'artifacts'
      if (type.includes('enchantment')) return 'enchantments'
      if (type.includes('instant')) return 'instants'
      if (type.includes('sorcery')) return 'sorceries'
      if (type.includes('land')) return 'lands'
      return 'other'
    }

    const sectionMap: Record<string, DeckCard[]> = {
      creatures: [],
      artifacts: [],
      enchantments: [],
      planeswalkers: [],
      instants: [],
      sorceries: [],
      lands: [],
      other: []
    }

    mainDeckCards.forEach(card => {
      const category = categorizeCard(card)
      sectionMap[category].push(card)
    })

    Object.values(sectionMap).forEach(sectionCards => {
      sectionCards.sort((a, b) => {
        const cmcDiff = (a.cmc || 0) - (b.cmc || 0)
        if (cmcDiff !== 0) return cmcDiff
        return a.name.localeCompare(b.name)
      })
    })

    const hybridLands = sectionMap.lands.filter(c => c.type && isHybridLand(c.type))
    const hybridLandCount = hybridLands.reduce((sum, c) => sum + c.quantity, 0)

    const result: CardSection[] = []

    if (commanderCards.length > 0) {
      result.push({
        id: 'commander',
        title: 'Commander',
        emoji: '👑',
        cards: commanderCards,
        totalCount: commanderCards.reduce((sum, c) => sum + c.quantity, 0)
      })
    }

    const sectionOrder = [
      { id: 'creatures', title: 'Creatures', emoji: '🐲' },
      { id: 'planeswalkers', title: 'Planeswalkers', emoji: '🔮' },
      { id: 'instants', title: 'Instants', emoji: '⚡' },
      { id: 'sorceries', title: 'Sorceries', emoji: '📜' },
      { id: 'artifacts', title: 'Artifacts', emoji: '⚙️' },
      { id: 'enchantments', title: 'Enchantments', emoji: '✨' },
      { id: 'lands', title: 'Lands', emoji: '🏔️' },
      { id: 'other', title: 'Other', emoji: '📦' }
    ]

    sectionOrder.forEach(({ id, title, emoji }) => {
      const sectionCards = sectionMap[id]
      if (sectionCards.length > 0) {
        const section: CardSection = {
          id,
          title,
          emoji,
          cards: sectionCards,
          totalCount: sectionCards.reduce((sum, c) => sum + c.quantity, 0)
        }

        if (id === 'lands' && hybridLandCount > 0) {
          section.hybridLandCount = hybridLandCount
        }

        result.push(section)
      }
    })

    if (contemplatingCards.length > 0) {
      result.push({
        id: 'contemplating',
        title: 'Contemplating',
        emoji: '☁️',
        cards: contemplatingCards.sort((a, b) => a.name.localeCompare(b.name)),
        totalCount: contemplatingCards.reduce((sum, c) => sum + c.quantity, 0)
      })
    }

    if (sideboardCards.length > 0) {
      result.push({
        id: 'sideboard',
        title: 'Sideboard',
        emoji: '📦',
        cards: sideboardCards.sort((a, b) => a.name.localeCompare(b.name)),
        totalCount: sideboardCards.reduce((sum, c) => sum + c.quantity, 0)
      })
    }

    return result
  }, [cards, searchText, colorFilters])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleCardAction = (action: string) => {
    if (!selectedCard) return

    switch (action) {
      case 'increment':
        onIncrementCard(selectedCard.id)
        break
      case 'decrement':
        onDecrementCard(selectedCard.id)
        break
      case 'remove':
        onRemoveCard(selectedCard.id)
        setSelectedCard(null)
        break
      case 'toCommander':
        onUpdateCard(selectedCard.id, { zone: 'commander', quantity: 1 })
        setSelectedCard(null)
        break
      case 'toMain':
        onUpdateCard(selectedCard.id, { zone: 'main' })
        setSelectedCard(null)
        break
      case 'toSideboard':
        onUpdateCard(selectedCard.id, { zone: 'sideboard' })
        setSelectedCard(null)
        break
      case 'toContemplating':
        onUpdateCard(selectedCard.id, { zone: 'contemplating' })
        setSelectedCard(null)
        break
    }
  }

  // Separate commander/sideboard/contemplating from main deck sections
  const commanderSection = sections.find(s => s.id === 'commander')
  const sideboardSection = sections.find(s => s.id === 'sideboard')
  const contemplatingSection = sections.find(s => s.id === 'contemplating')
  const mainDeckSections = sections.filter(s => 
    s.id !== 'commander' && s.id !== 'sideboard' && s.id !== 'contemplating'
  )

  const renderSection = (section: CardSection) => {
    const isCollapsed = collapsedSections.has(section.id)
    const isCommanderSection = section.id === 'commander'
    const isSideboardSection = section.id === 'sideboard'
    const isContemplatingSection = section.id === 'contemplating'

    return (
      <div key={section.id} className="mb-1 relative">
        {/* Cloudy background effect for contemplating section */}
        {isContemplatingSection && (
          <div className="absolute inset-0 opacity-5 pointer-events-none rounded">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-cyan-300 rounded-full blur-3xl" />
          </div>
        )}

        {/* Section Header - Moxfield Style */}
        <button
          onClick={() => toggleSection(section.id)}
          className={`w-full px-2 py-1 flex items-center gap-2 text-xs font-semibold transition-colors relative z-10 ${
            isCommanderSection
              ? 'bg-yellow-900/20 text-yellow-300 hover:bg-yellow-900/30'
              : isSideboardSection
              ? 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/30'
              : isContemplatingSection
              ? 'bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/30'
              : 'bg-slate-800/30 text-gray-400 hover:bg-slate-800/50'
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>{section.emoji}</span>
          <span className="uppercase tracking-wide font-bold">{section.title}</span>
          <span className="text-xs font-normal opacity-70">
            ({section.totalCount})
          </span>
        </button>

        {/* Card List - Moxfield Style */}
        {!isCollapsed && (
          <div className="space-y-0 relative z-10">
            {section.cards.map(card => (
              <div
                key={card.id}
                className="group flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800/40 transition-colors text-xs"
                onMouseMove={(e) => handleMouseMove(e, card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Quantity */}
                <span className="w-5 text-right text-gray-400 font-mono text-[11px] flex-shrink-0">
                  {card.quantity}
                </span>

                {/* Card Name */}
                <button
                  onClick={() => setSelectedCard(card)}
                  className="flex-1 text-left text-gray-200 hover:text-white hover:underline min-w-0"
                >
                  <span className="truncate block">{card.name}</span>
                </button>

                {/* MDFC Indicator */}
                {isMDFC(card.name) && (
                  <span className="text-[10px] text-gray-500">🔄</span>
                )}

                {/* Mana Cost */}
                {card.manaCost && (
                  <ManaSymbols manaCost={card.manaCost} size={14} />
                )}

                {/* CMC Badge */}
                {/* <span className="w-4 h-4 bg-slate-700 text-gray-400 rounded-sm text-[10px] flex items-center justify-center font-mono flex-shrink-0">
                  {card.cmc || 0}
                </span> */}

                {/* Actions Button (visible on hover) */}
                <button
                  onClick={() => setSelectedCard(card)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-300 flex-shrink-0"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-900 overflow-y-auto relative">
      <div className="max-w-7xl mx-auto p-4">
        {/* Commander Section - Full Width */}
        {commanderSection && (
          <div className="mb-3">
            {renderSection(commanderSection)}
          </div>
        )}

        {/* Main Deck Sections - Multi-column Grid */}
        {mainDeckSections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
            {mainDeckSections.map(section => (
              <div key={section.id}>
                {renderSection(section)}
              </div>
            ))}
          </div>
        )}

        {/* Contemplating Section - Full Width */}
        {contemplatingSection && (
          <div className="mt-3">
            {renderSection(contemplatingSection)}
          </div>
        )}

        {/* Sideboard Section - Full Width */}
        {sideboardSection && (
          <div className="mt-3">
            {renderSection(sideboardSection)}
          </div>
        )}

        {sections.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-6xl mb-4">🃏</div>
            <p className="text-lg">No cards in deck</p>
            <p className="text-sm mt-2">Use the search tab to add cards</p>
          </div>
        )}
      </div>

      {/* Card Hover Preview - Moxfield Style */}
      {hoveredCard && hoveredCard.imageUrl && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x < window.innerWidth / 2 ? mousePosition.x + 20 : mousePosition.x - 270,
            top: Math.min(mousePosition.y - 175, window.innerHeight - 370),
          }}
        >
          <div className="bg-slate-900 border-2 border-slate-700 rounded-lg overflow-hidden shadow-2xl">
            <img
              src={hoveredCard.imageUrl}
              alt={hoveredCard.name}
              className="w-[250px] h-[349px] object-cover"
            />
          </div>
        </div>
      )}

      {selectedCard && (
        <CardActionsPopup
          card={selectedCard}
          isBasicLand={selectedCard.type ? isBasicLand(selectedCard.type) : false}
          onClose={() => setSelectedCard(null)}
          onAction={handleCardAction}
          onCardRefreshed={(updatedCard) => {
            // Update the card in the parent's card list
            onUpdateCard(updatedCard.id, updatedCard)
            // Update the selected card to show fresh data
            setSelectedCard(updatedCard)
          }}
        />
      )}
    </div>
  )
}