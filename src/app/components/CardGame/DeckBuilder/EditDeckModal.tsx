// app/components/DeckBuilder/EditDeckModal.tsx
'use client'

import { useState, useMemo } from 'react'
import type { Deck } from '@/app/types/Deck'
import CardSearch from '../CardGameBoard/MiddleRow/CardSearch'
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'

interface Props {
  deck: Deck
  onClose: () => void
  onSave: (deckId: string, updatedCards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  isSaving: boolean
}

type SortOption = 'name' | 'cmc' | 'type' | 'color' | 'quantity'
type ViewMode = 'gallery' | 'list' | 'columns'
type CardZone = 'main' | 'commander' | 'sideboard'

interface DeckCard {
  id: string
  scryfallId: string
  name: string
  quantity: number
  imageUrl: string
  type: string
  manaCost: string
  colors: string[]
  cmc?: number
  zone: CardZone
}

export default function EditDeckModal({ deck, onClose, onSave, isSaving }: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'deck'>('deck')
  const [deckName, setDeckName] = useState(deck.name)
  
  // Convert deck cards to include zone property
  const [cards, setCards] = useState<DeckCard[]>(
    (deck.cards || []).map(card => ({
      id: card.id || '',
      scryfallId: card.scryfallId || card.id || '',
      name: card.name || 'Unknown Card',
      quantity: card.quantity || 1,
      imageUrl: card.imageUrl || '',
      type: card.type || '',
      manaCost: card.manaCost || '',
      colors: card.colors || [],
      zone: (card.isCommander ? 'commander' : 'main') as CardZone,
      cmc: parseManaValue(card.manaCost || '')
    }))
  )
  
  const [cardMenu, setCardMenu] = useState<string | null>(null)
  const [printingsModal, setPrintingsModal] = useState<string | null>(null)
  const [availablePrintings, setAvailablePrintings] = useState<ScryfallCard[]>([])
  const [loadingPrintings, setLoadingPrintings] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('columns')
  const [sortBy, setSortBy] = useState<SortOption>('cmc')
  const [sortBy2, setSortBy2] = useState<SortOption>('name')
  const [imageUploadCardId, setImageUploadCardId] = useState<string | null>(null)
  const [previewCardId, setPreviewCardId] = useState<string | null>(null)

  // Separate cards by zone
  const commanderCards = cards.filter(c => c.zone === 'commander')
  const mainDeckCards = cards.filter(c => c.zone === 'main')
  const sideboardCards = cards.filter(c => c.zone === 'sideboard')

  // Commander counts toward the 100-card deck total
  const totalCards = mainDeckCards.reduce((sum, card) => sum + card.quantity, 0) + 
                     commanderCards.reduce((sum, card) => sum + card.quantity, 0)
  const sideboardTotal = sideboardCards.reduce((sum, card) => sum + card.quantity, 0)

  // Parse mana value from mana cost string
  function parseManaValue(manaCost: string): number {
    if (!manaCost) return 0
    const matches = manaCost.match(/\d+/g)
    const generic = matches ? parseInt(matches[0]) : 0
    const symbols = (manaCost.match(/[WUBRGC]/g) || []).length
    return generic + symbols
  }

  // Categorize cards by type for column view
  const categorizeByType = (cardList: DeckCard[]) => {
    const creatures: DeckCard[] = []
    const artifacts: DeckCard[] = []
    const enchantments: DeckCard[] = []
    const otherPermanents: DeckCard[] = []
    const lands: DeckCard[] = []

    cardList.forEach(card => {
      const typeLower = card.type.toLowerCase()
      if (typeLower.includes('land')) {
        lands.push(card)
      } else if (typeLower.includes('creature')) {
        creatures.push(card)
      } else if (typeLower.includes('artifact')) {
        artifacts.push(card)
      } else if (typeLower.includes('enchantment')) {
        enchantments.push(card)
      } else if (typeLower.includes('planeswalker') || typeLower.includes('battle')) {
        otherPermanents.push(card)
      } else {
        otherPermanents.push(card)
      }
    })

    return { creatures, artifacts, enchantments, otherPermanents, lands }
  }

  // Sort function
  const sortCards = (cardsToSort: DeckCard[]): DeckCard[] => {
    return [...cardsToSort].sort((a, b) => {
      // Primary sort
      let comparison = compareCards(a, b, sortBy)
      if (comparison !== 0) return comparison
      
      // Secondary sort
      return compareCards(a, b, sortBy2)
    })
  }

  const compareCards = (a: DeckCard, b: DeckCard, sortOption: SortOption): number => {
    switch (sortOption) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'cmc':
        return (a.cmc || 0) - (b.cmc || 0)
      case 'type':
        return (a.type || '').localeCompare(b.type || '')
      case 'color':
        const aColor = (a.colors && a.colors[0]) || 'Colorless'
        const bColor = (b.colors && b.colors[0]) || 'Colorless'
        return aColor.localeCompare(bColor)
      case 'quantity':
        return (b.quantity || 0) - (a.quantity || 0)
      default:
        return 0
    }
  }

  const sortedMainDeck = useMemo(() => sortCards(mainDeckCards), [mainDeckCards, sortBy, sortBy2])
  const sortedSideboard = useMemo(() => sortCards(sideboardCards), [sideboardCards, sortBy, sortBy2])
  const categorizedMainDeck = useMemo(() => {
    const categories = categorizeByType(mainDeckCards)
    // Apply sorting to each category
    return {
      creatures: sortCards(categories.creatures),
      artifacts: sortCards(categories.artifacts),
      enchantments: sortCards(categories.enchantments),
      otherPermanents: sortCards(categories.otherPermanents),
      lands: sortCards(categories.lands)
    }
  }, [mainDeckCards, sortBy, sortBy2])

  // Add card from search
  const handleAddCard = (scryfallCard: ScryfallCard) => {
    const existingCard = cards.find(c => c.scryfallId === scryfallCard.id)
    
    if (existingCard) {
      // Increment quantity
      setCards(cards.map(c => 
        c.scryfallId === scryfallCard.id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ))
    } else {
      // Add new card to main deck
      setCards([...cards, {
        id: scryfallCard.id,
        scryfallId: scryfallCard.id,
        name: scryfallCard.name,
        quantity: 1,
        imageUrl: scryfallCard.image_uris?.normal || scryfallCard.image_uris?.small || '',
        type: scryfallCard.type_line,
        manaCost: scryfallCard.mana_cost || '',
        colors: scryfallCard.colors || [],
        cmc: parseManaValue(scryfallCard.mana_cost || ''),
        zone: 'main'
      }])
    }
    
    alert(`Added ${scryfallCard.name}!`)
  }

  // Card actions
  const incrementCard = (cardId: string) => {
    setCards(cards.map(c => 
      c.id === cardId ? { ...c, quantity: c.quantity + 1 } : c
    ))
  }

  const decrementCard = (cardId: string) => {
    setCards(cards.map(c => 
      c.id === cardId && c.quantity > 1 ? { ...c, quantity: c.quantity - 1 } : c
    ))
  }

  const removeCard = (cardId: string) => {
    setCards(cards.filter(c => c.id !== cardId))
    setCardMenu(null)
  }

  const moveCardToZone = (cardId: string, newZone: CardZone) => {
    setCards(cards.map(c => 
      c.id === cardId ? { ...c, zone: newZone } : c
    ))
    setCardMenu(null)
  }

  const changeCardImage = (cardId: string, newImageUrl: string) => {
    setCards(cards.map(c => 
      c.id === cardId ? { ...c, imageUrl: newImageUrl } : c
    ))
  }

  const handleImageUpload = (cardId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        changeCardImage(cardId, result)
        setImageUploadCardId(null)
        setCardMenu(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const openPrintingsModal = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    setCardMenu(null)
    setPrintingsModal(cardId)
    setLoadingPrintings(true)

    try {
      // Search for all printings of this card by name
      const response = await fetch(`/api/scryfall/search?query=${encodeURIComponent(`!"${card.name}"`)}`)
      const data = await response.json()
      
      if (data.data) {
        setAvailablePrintings(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch printings:', error)
      alert('Failed to load printings')
    } finally {
      setLoadingPrintings(false)
    }
  }

  const changePrinting = (cardId: string, newPrinting: ScryfallCard) => {
    setCards(cards.map(c => 
      c.id === cardId ? {
        ...c,
        scryfallId: newPrinting.id,
        imageUrl: newPrinting.image_uris?.normal || newPrinting.image_uris?.small || c.imageUrl,
        manaCost: newPrinting.mana_cost || c.manaCost,
        type: newPrinting.type_line || c.type,
        cmc: parseManaValue(newPrinting.mana_cost || '')
      } : c
    ))
    setPrintingsModal(null)
    setAvailablePrintings([])
  }

  const handleSave = async () => {
    try {
      // Convert DeckCard format with zones to the save format
      const cardsToSave = cards.map(card => ({
        name: card.name,
        quantity: card.quantity,
        id: card.id,
        scryfallId: card.scryfallId,
        imageUrl: card.imageUrl,
        type: card.type,
        manaCost: card.manaCost,
        colors: card.colors,
        isCommander: card.zone === 'commander',
        zone: card.zone
      }))
      
      await onSave(deck.id, cardsToSave, deckName)
    } catch (error) {
      console.error('Failed to save deck:', error)
      alert('Failed to save deck: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Color symbols - include both main deck and commander
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const allDeckCards = [...mainDeckCards, ...commanderCards]
    allDeckCards.forEach(card => {
      card.colors?.forEach(color => {
        counts[color] = (counts[color] || 0) + card.quantity
      })
    })
    return counts
  }, [mainDeckCards, commanderCards])

  const colorEmojis: Record<string, string> = {
    W: '⚪',
    U: '🔵',
    B: '⚫',
    R: '🔴',
    G: '🟢'
  }

  // Render card in gallery mode
  const renderGalleryCard = (card: DeckCard) => (
    <div key={card.id} className="relative">
      {/* Card Image */}
      <div 
        className="aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
        onClick={() => setPreviewCardId(card.id)}
      >
        {card.imageUrl ? (
          <img 
            src={card.imageUrl} 
            alt={card.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Try fallback URLs
              const img = e.target as HTMLImageElement
              if (img.src.includes('normal')) {
                img.src = img.src.replace('normal', 'large')
              } else if (img.src.includes('large')) {
                img.src = img.src.replace('large', 'small')
              } else if (img.src.includes('small')) {
                img.src = img.src.replace('small', 'png')
              } else {
                // All failed, show placeholder
                img.style.display = 'none'
                const parent = img.parentElement
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center p-2"><p class="text-white text-xs text-center break-words">${card.name}</p></div>`
                }
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center p-2">
            <p className="text-white text-xs text-center break-words">{card.name}</p>
          </div>
        )}
      </div>

      {/* Quantity Badge */}
      <div className="absolute top-1 left-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
        {card.quantity}
      </div>

      {/* Menu Button */}
      <button
        onClick={() => setCardMenu(cardMenu === card.id ? null : card.id)}
        className="absolute top-1 right-1 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg"
      >
        ⋯
      </button>

      {/* Card Menu */}
      {cardMenu === card.id && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCardMenu(null)} />
          <div className="absolute top-8 right-0 z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-2 min-w-[180px]">
            <button
              onClick={() => incrementCard(card.id)}
              className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
            >
              ➕ Add one
            </button>
            <button
              onClick={() => decrementCard(card.id)}
              disabled={card.quantity <= 1}
              className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➖ Remove one
            </button>
            <div className="border-t border-slate-600 my-1" />
            <button
              onClick={() => openPrintingsModal(card.id)}
              className="w-full text-left px-3 py-2 text-cyan-400 hover:bg-slate-700 rounded transition-colors text-sm"
            >
              🖼️ Change Printing
            </button>
            <button
              onClick={() => {
                setImageUploadCardId(card.id)
                setCardMenu(null)
              }}
              className="w-full text-left px-3 py-2 text-orange-400 hover:bg-slate-700 rounded transition-colors text-sm"
            >
              📤 Upload Image
            </button>
            <div className="border-t border-slate-600 my-1" />
            {card.zone !== 'commander' && (
              <button
                onClick={() => moveCardToZone(card.id, 'commander')}
                className="w-full text-left px-3 py-2 text-yellow-400 hover:bg-slate-700 rounded transition-colors text-sm"
              >
                👑 Make Commander
              </button>
            )}
            {card.zone !== 'main' && (
              <button
                onClick={() => moveCardToZone(card.id, 'main')}
                className="w-full text-left px-3 py-2 text-blue-400 hover:bg-slate-700 rounded transition-colors text-sm"
              >
                📋 Move to Main
              </button>
            )}
            {card.zone !== 'sideboard' && (
              <button
                onClick={() => moveCardToZone(card.id, 'sideboard')}
                className="w-full text-left px-3 py-2 text-purple-400 hover:bg-slate-700 rounded transition-colors text-sm"
              >
                📦 Move to Sideboard
              </button>
            )}
            <div className="border-t border-slate-600 my-1" />
            <button
              onClick={() => removeCard(card.id)}
              className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-700 rounded transition-colors text-sm"
            >
              🗑️ Remove all
            </button>
          </div>
        </>
      )}
    </div>
  )

  // Render card in list mode
  const renderListCard = (card: DeckCard) => (
    <div key={card.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-700 transition-colors">
      {/* Thumbnail */}
      <div 
        className="w-12 h-16 rounded overflow-hidden flex-shrink-0 border border-slate-600 cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => setPreviewCardId(card.id)}
      >
        {card.imageUrl ? (
          <img 
            src={card.imageUrl} 
            alt={card.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement
              if (img.src.includes('normal')) {
                img.src = img.src.replace('normal', 'large')
              } else if (img.src.includes('large')) {
                img.src = img.src.replace('large', 'small')
              } else {
                img.style.display = 'none'
                const parent = img.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950" />'
                }
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950" />
        )}
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-white truncate">{card.name}</h4>
          <span className="text-xs text-gray-400">{card.manaCost}</span>
        </div>
        <p className="text-xs text-gray-400 truncate">{card.type}</p>
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white bg-slate-700 px-3 py-1 rounded">
          ×{card.quantity}
        </span>
      </div>

      {/* Menu Button */}
      <button
        onClick={() => setCardMenu(cardMenu === card.id ? null : card.id)}
        className="relative bg-slate-700 hover:bg-slate-600 text-white rounded w-8 h-8 flex items-center justify-center font-bold flex-shrink-0"
      >
        ⋯
        {cardMenu === card.id && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCardMenu(null)} />
            <div className="absolute top-full right-0 mt-1 z-50 bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-2 min-w-[180px]">
              <button
                onClick={() => incrementCard(card.id)}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
              >
                ➕ Add one
              </button>
              <button
                onClick={() => decrementCard(card.id)}
                disabled={card.quantity <= 1}
                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ➖ Remove one
              </button>
              <div className="border-t border-slate-600 my-1" />
              <button
                onClick={() => openPrintingsModal(card.id)}
                className="w-full text-left px-3 py-2 text-cyan-400 hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🖼️ Change Printing
              </button>
              <button
                onClick={() => {
                  setImageUploadCardId(card.id)
                  setCardMenu(null)
                }}
                className="w-full text-left px-3 py-2 text-orange-400 hover:bg-slate-700 rounded transition-colors text-sm"
              >
                📤 Upload Image
              </button>
              <div className="border-t border-slate-600 my-1" />
              {card.zone !== 'commander' && (
                <button
                  onClick={() => moveCardToZone(card.id, 'commander')}
                  className="w-full text-left px-3 py-2 text-yellow-400 hover:bg-slate-700 rounded transition-colors text-sm"
                >
                  👑 Make Commander
                </button>
              )}
              {card.zone !== 'main' && (
                <button
                  onClick={() => moveCardToZone(card.id, 'main')}
                  className="w-full text-left px-3 py-2 text-blue-400 hover:bg-slate-700 rounded transition-colors text-sm"
                >
                  📋 Move to Main
                </button>
              )}
              {card.zone !== 'sideboard' && (
                <button
                  onClick={() => moveCardToZone(card.id, 'sideboard')}
                  className="w-full text-left px-3 py-2 text-purple-400 hover:bg-slate-700 rounded transition-colors text-sm"
                >
                  📦 Move to Sideboard
                </button>
              )}
              <div className="border-t border-slate-600 my-1" />
              <button
                onClick={() => removeCard(card.id)}
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-700 rounded transition-colors text-sm"
              >
                🗑️ Remove all
              </button>
            </div>
          </>
        )}
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="bg-white/10 text-white text-lg font-bold px-3 py-1 rounded border-2 border-white/20 focus:border-white/40 focus:outline-none"
          placeholder="Deck name"
        />
        <button
          onClick={onClose}
          disabled={isSaving}
          className="text-white/80 hover:text-white text-3xl leading-none disabled:opacity-50"
        >
          ×
        </button>
      </div>

      {/* Tab Toggle */}
      <div className="bg-slate-800 border-b border-slate-700 flex">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'search'
              ? 'bg-slate-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔍 Search Cards
        </button>
        <button
          onClick={() => setActiveTab('deck')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'deck'
              ? 'bg-slate-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📜 My Deck ({totalCards})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'search' ? (
          <CardSearch onCardSelect={handleAddCard} />
        ) : (
          <div className="h-full flex flex-col">
            {/* Controls Bar */}
            <div className="bg-slate-800 border-b border-slate-700 p-3 space-y-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold">View:</span>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'gallery'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  🖼️ Gallery
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('columns')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'columns'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  📊 Columns
                </button>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="cmc">Mana Value</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="type">Type</option>
                  <option value="color">Color</option>
                  <option value="quantity">Quantity</option>
                </select>
                {viewMode !== 'columns' && (
                  <>
                    <span className="text-gray-500">then</span>
                    <select
                      value={sortBy2}
                      onChange={(e) => setSortBy2(e.target.value as SortOption)}
                      className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="cmc">Mana Value</option>
                      <option value="type">Type</option>
                      <option value="color">Color</option>
                      <option value="quantity">Quantity</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Deck Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {cards.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🃏</div>
                    <p>No cards in deck</p>
                    <p className="text-sm mt-2">Switch to Search to add cards</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Commander Section */}
                  {commanderCards.length > 0 && (
                    <div>
                      <h3 className="text-yellow-400 font-bold text-lg mb-3 flex items-center gap-2">
                        👑 Commander ({commanderCards.reduce((sum, c) => sum + c.quantity, 0)})
                      </h3>
                      {viewMode === 'gallery' || viewMode === 'columns' ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {commanderCards.map(renderGalleryCard)}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {commanderCards.map(renderListCard)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Deck Section */}
                  {viewMode === 'columns' ? (
                    <div>
                      <h3 className="text-blue-400 font-bold text-lg mb-3 flex items-center gap-2">
                        📋 Main Deck ({totalCards})
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Column 1: Creatures & Artifacts */}
                        <div className="space-y-4">
                          {categorizedMainDeck.creatures.length > 0 && (
                            <div>
                              <h4 className="text-green-400 font-semibold text-sm mb-2 border-b border-slate-700 pb-1">
                                🐲 Creatures ({categorizedMainDeck.creatures.reduce((sum, c) => sum + c.quantity, 0)})
                              </h4>
                              <div className="space-y-2">
                                {categorizedMainDeck.creatures.map(renderListCard)}
                              </div>
                            </div>
                          )}
                          {categorizedMainDeck.artifacts.length > 0 && (
                            <div>
                              <h4 className="text-gray-400 font-semibold text-sm mb-2 border-b border-slate-700 pb-1">
                                ⚙️ Artifacts ({categorizedMainDeck.artifacts.reduce((sum, c) => sum + c.quantity, 0)})
                              </h4>
                              <div className="space-y-2">
                                {categorizedMainDeck.artifacts.map(renderListCard)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Enchantments & Other Permanents */}
                        <div className="space-y-4">
                          {categorizedMainDeck.enchantments.length > 0 && (
                            <div>
                              <h4 className="text-purple-400 font-semibold text-sm mb-2 border-b border-slate-700 pb-1">
                                ✨ Enchantments ({categorizedMainDeck.enchantments.reduce((sum, c) => sum + c.quantity, 0)})
                              </h4>
                              <div className="space-y-2">
                                {categorizedMainDeck.enchantments.map(renderListCard)}
                              </div>
                            </div>
                          )}
                          {categorizedMainDeck.otherPermanents.length > 0 && (
                            <div>
                              <h4 className="text-cyan-400 font-semibold text-sm mb-2 border-b border-slate-700 pb-1">
                                📦 Other ({categorizedMainDeck.otherPermanents.reduce((sum, c) => sum + c.quantity, 0)})
                              </h4>
                              <div className="space-y-2">
                                {categorizedMainDeck.otherPermanents.map(renderListCard)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column 3: Lands */}
                        <div className="space-y-4">
                          {categorizedMainDeck.lands.length > 0 && (
                            <div>
                              <h4 className="text-amber-400 font-semibold text-sm mb-2 border-b border-slate-700 pb-1">
                                🏔️ Lands ({categorizedMainDeck.lands.reduce((sum, c) => sum + c.quantity, 0)})
                              </h4>
                              <div className="space-y-2">
                                {categorizedMainDeck.lands.map(renderListCard)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-blue-400 font-bold text-lg mb-3 flex items-center gap-2">
                        📋 Main Deck ({totalCards})
                      </h3>
                      {sortedMainDeck.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No cards in main deck</p>
                      ) : viewMode === 'gallery' ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {sortedMainDeck.map(renderGalleryCard)}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sortedMainDeck.map(renderListCard)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sideboard Section */}
                  <div>
                    <h3 className="text-purple-400 font-bold text-lg mb-3 flex items-center gap-2">
                      📦 Sideboard ({sideboardTotal})
                    </h3>
                    {sortedSideboard.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No cards in sideboard</p>
                    ) : viewMode === 'gallery' || viewMode === 'columns' ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {sortedSideboard.map(renderGalleryCard)}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedSideboard.map(renderListCard)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats & Actions */}
      <div className="bg-slate-800 border-t border-slate-700 p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <div className="text-gray-400">
              <span className="font-bold text-blue-400">{totalCards}</span> main
            </div>
            {commanderCards.length > 0 && (
              <div className="text-gray-400">
                <span className="font-bold text-yellow-400">{commanderCards.length}</span> cmdr
              </div>
            )}
            {sideboardTotal > 0 && (
              <div className="text-gray-400">
                <span className="font-bold text-purple-400">{sideboardTotal}</span> side
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {Object.entries(colorCounts).map(([color, count]) => (
              <span key={color} className="text-lg" title={`${color}: ${count}`}>
                {colorEmojis[color]}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || cards.length === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>💾 Save Changes</>
            )}
          </button>
        </div>
      </div>

      {/* Printings Modal */}
      {printingsModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 flex items-center justify-between rounded-t-lg">
              <h3 className="text-white font-bold text-lg">
                🖼️ Choose Printing: {cards.find(c => c.id === printingsModal)?.name}
              </h3>
              <button
                onClick={() => {
                  setPrintingsModal(null)
                  setAvailablePrintings([])
                }}
                className="text-white/80 hover:text-white text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingPrintings ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400">Loading printings...</p>
                  </div>
                </div>
              ) : availablePrintings.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No printings found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {availablePrintings.map((printing) => {
                    const currentCard = cards.find(c => c.id === printingsModal)
                    const isCurrentPrinting = currentCard?.scryfallId === printing.id

                    return (
                      <button
                        key={printing.id}
                        onClick={() => changePrinting(printingsModal, printing)}
                        className={`group relative rounded-lg overflow-hidden transition-all ${
                          isCurrentPrinting
                            ? 'ring-4 ring-cyan-500 shadow-lg shadow-cyan-500/50'
                            : 'hover:ring-2 hover:ring-cyan-400 hover:scale-105'
                        }`}
                      >
                        {/* Card Image */}
                        <div className="aspect-[2.5/3.5] bg-slate-900">
                          {printing.image_uris?.normal || printing.image_uris?.small ? (
                            <img
                              src={printing.image_uris?.normal || printing.image_uris?.small}
                              alt={`${printing.name} - ${printing.set_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement
                                if (img.src.includes('normal')) {
                                  img.src = img.src.replace('normal', 'large')
                                } else if (img.src.includes('large')) {
                                  img.src = img.src.replace('large', 'small')
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center p-2">
                              <p className="text-white text-xs text-center">{printing.name}</p>
                            </div>
                          )}
                        </div>

                        {/* Set Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                          <p className="text-white text-xs font-bold truncate">
                            {printing.set_name}
                          </p>
                          <p className="text-gray-300 text-xs">
                            {printing.set?.toUpperCase()} • {printing.collector_number}
                          </p>
                          {printing.prices?.usd && (
                            <p className="text-green-400 text-xs font-semibold">
                              ${printing.prices.usd}
                            </p>
                          )}
                        </div>

                        {/* Current Selection Badge */}
                        {isCurrentPrinting && (
                          <div className="absolute top-2 right-2 bg-cyan-500 text-white rounded-full px-2 py-1 text-xs font-bold shadow-lg">
                            ✓ Current
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-700 px-4 py-3 rounded-b-lg border-t border-slate-600">
              <p className="text-sm text-gray-400 text-center">
                {availablePrintings.length} printing{availablePrintings.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {imageUploadCardId && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-white font-bold text-lg mb-4">
              📤 Upload Custom Image
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Choose an image file for {cards.find(c => c.id === imageUploadCardId)?.name}
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleImageUpload(imageUploadCardId, file)
                }
              }}
              className="w-full text-white bg-slate-700 rounded p-2 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setImageUploadCardId(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Preview Modal */}
      {previewCardId && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewCardId(null)}
        >
          <div className="relative max-w-2xl w-full">
            {/* Close button */}
            <button
              onClick={() => setPreviewCardId(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-4xl leading-none transition-colors"
            >
              ×
            </button>
            
            {/* Card Image */}
            <div className="bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
              {(() => {
                const card = cards.find(c => c.id === previewCardId)
                if (!card) return null
                
                return card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="w-full aspect-[2.5/3.5] bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center p-8">
                    <p className="text-white text-2xl text-center">{card.name}</p>
                  </div>
                )
              })()}
            </div>

            {/* Card info */}
            <div className="mt-4 text-center">
              {(() => {
                const card = cards.find(c => c.id === previewCardId)
                if (!card) return null
                return (
                  <div className="bg-slate-800/80 rounded-lg p-3 backdrop-blur">
                    <h3 className="text-white font-bold text-xl mb-1">{card.name}</h3>
                    <p className="text-gray-400 text-sm">{card.type}</p>
                    <p className="text-gray-500 text-xs mt-1">{card.manaCost}</p>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}