// app/components/DeckBuilder/EditDeckModal.tsx
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Deck } from '@/app/types/Deck'
import CardSearch from '../CardGameBoard/MiddleRow/CardSearch'
import DeckListView from './DeckListView'
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'
import { GripVertical, Plus, X, Filter, SlidersHorizontal, Eye, Columns3, LayoutGrid, List, ChevronDown, RefreshCw, Save } from 'lucide-react'
import ManaSymbols from '../ManaSymbols/ManaSymbols'
import type { CardZone } from './editDeckFunctions'
import { useCardRefresh } from '@/app/hooks/useCardRefresh'
import RefreshProgressModal from './RefreshProgressModal'

interface Props {
  deck: Deck
  onClose: () => void
  onSave: (deckId: string, updatedCards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
  isSaving: boolean
}


type FilterType = 'type' | 'color' | 'cmc' | 'rarity' | 'custom'
type ViewMode = 'kanban' | 'gallery' | 'list'
type CardDisplayMode = 'full' | 'stacked' | 'list'

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
  rarity?: string
  oracle_text?: string
  rulings?: Array<{
    source: 'wotc' | 'scryfall'
    published_at: string
    comment: string
  }>
  legalities?: Record<string, 'legal' | 'not_legal' | 'restricted' | 'banned'>
}

interface MobileSection {
  id: string
  title: string
  emoji: string
  cardTypes: string[]
  cards: DeckCard[]
  column: 1 | 2 | 3
  order: number
  collapsed: boolean
}

interface KanbanColumn {
  id: string
  title: string
  filterType: FilterType
  filterValue: string | number | null
  cards: DeckCard[]
  collapsed: boolean
  width: number
}

const DEFAULT_COLUMNS: Omit<KanbanColumn, 'cards'>[] = [
  { id: 'creatures', title: '🐲 Creatures', filterType: 'type', filterValue: 'creature', collapsed: false, width: 20 },
  { id: 'artifacts', title: '⚙️ Artifacts', filterType: 'type', filterValue: 'artifact', collapsed: false, width: 20 },
  { id: 'enchantments', title: '✨ Enchantments', filterType: 'type', filterValue: 'enchantment', collapsed: false, width: 20 },
  { id: 'instants', title: '⚡ Instants', filterType: 'type', filterValue: 'instant', collapsed: false, width: 15 },
  { id: 'sorceries', title: '📜 Sorceries', filterType: 'type', filterValue: 'sorcery', collapsed: false, width: 15 },
  { id: 'lands', title: '🏔️ Lands', filterType: 'type', filterValue: 'land', collapsed: false, width: 20 },
  { id: 'contemplating', title: 'Contemplating', emoji: '☁️', cardTypes: [], cards: [], column: 2, order: 6, collapsed: false },
  { id: 'other', title: '📦 Other', filterType: 'custom', filterValue: null, collapsed: false, width: 15 }
]

const COLOR_FILTERS = [
  { value: 'W', label: '⚪ White', emoji: '⚪' },
  { value: 'U', label: '🔵 Blue', emoji: '🔵' },
  { value: 'B', label: '⚫ Black', emoji: '⚫' },
  { value: 'R', label: '🔴 Red', emoji: '🔴' },
  { value: 'G', label: '🟢 Green', emoji: '🟢' },
  { value: 'C', label: '⬜ Colorless', emoji: '⬜' }
]

export default function EditDeckModal({ deck, onClose, onSave, isSaving: isSavingProp }: Props) {
  // Handle missing props when rendered from server component
  const [internalSaving, setInternalSaving] = useState(false)
  const isSaving = isSavingProp || internalSaving
  
  const handleClose = () => {
    console.log('Close button clicked')
    if (onClose) {
      onClose()
    } else {
      console.log('No onClose prop, navigating to /sanctum')
      window.location.href = '/sanctum'
    }
  }
  
  const [activeTab, setActiveTab] = useState<'search' | 'deck'>('deck')
  const [deckName, setDeckName] = useState(deck.name)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
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
      zone: (card.zone || (card.isCommander ? 'commander' : 'main')) as CardZone,
      cmc: parseManaValue(card.manaCost || ''),
      rarity: (card as any).rarity || 'common'
    }))
  )

  const [columns, setColumns] = useState<KanbanColumn[]>(
    DEFAULT_COLUMNS.map(col => ({ ...col, cards: [] }))
  )
  const [showColumnBuilder, setShowColumnBuilder] = useState(false)
  const [draggedCard, setDraggedCard] = useState<DeckCard | null>(null)
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)

  const [zoomLevel, setZoomLevel] = useState(100)
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>('stacked')
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  
  const [isMobileView, setIsMobileView] = useState(false)
  const [mobileColumnMode, setMobileColumnMode] = useState<1 | 2 | 3>(2)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [commanderCollapsed, setCommanderCollapsed] = useState(false)
  
  const [mobileSections, setMobileSections] = useState<MobileSection[]>([
    { id: 'creatures', title: 'Creatures', emoji: '🐲', cardTypes: ['creature'], cards: [], column: 1, order: 0, collapsed: false },
    { id: 'artifacts', title: 'Artifacts', emoji: '⚙️', cardTypes: ['artifact'], cards: [], column: 2, order: 0, collapsed: false },
    { id: 'enchantments', title: 'Enchantments', emoji: '✨', cardTypes: ['enchantment'], cards: [], column: 2, order: 1, collapsed: false },
    { id: 'sorceries', title: 'Sorceries', emoji: '📜', cardTypes: ['sorcery'], cards: [], column: 2, order: 2, collapsed: false },
    { id: 'instants', title: 'Instants', emoji: '⚡', cardTypes: ['instant'], cards: [], column: 2, order: 3, collapsed: false },
    { id: 'other', title: 'Other', emoji: '📦', cardTypes: [], cards: [], column: 2, order: 4, collapsed: false },
    { id: 'lands', title: 'Lands', emoji: '🏔️', cardTypes: ['land'], cards: [], column: 2, order: 5, collapsed: false },
  ])

  const [previewCardId, setPreviewCardId] = useState<string | null>(null)

  const [globalFilters, setGlobalFilters] = useState({
    searchText: '',
    colors: [] as string[],
    types: [] as string[],
    cmcMin: null as number | null,
    cmcMax: null as number | null
  })

  const { 
    refreshing, 
    progress, 
    refreshAllCards,
    getCardsNeedingRefresh 
  } = useCardRefresh()

  const commanderCards = cards.filter(c => c.zone === 'commander')
  const mainDeckCards = cards.filter(c => c.zone === 'main')
  const sideboardCards = cards.filter(c => c.zone === 'sideboard')
  const contemplatingCards = cards.filter(c => c.zone === 'contemplating')


  const totalCards = mainDeckCards.reduce((sum, card) => sum + card.quantity, 0) + 
                   commanderCards.reduce((sum, card) => sum + card.quantity, 0)

  const contemplatingTotal = contemplatingCards.reduce((sum, card) => sum + card.quantity, 0)

  const sideboardTotal = sideboardCards.reduce((sum, card) => sum + card.quantity, 0)

  const baseColumnWidth = 256
  const columnWidth = (baseColumnWidth * zoomLevel) / 100
  const collapsedWidth = 64

  function parseManaValue(manaCost: string): number {
    if (!manaCost) return 0
    const matches = manaCost.match(/\d+/g)
    const generic = matches ? parseInt(matches[0]) : 0
    const symbols = (manaCost.match(/[WUBRGC]/g) || []).length
    return generic + symbols
  }

  const cardMatchesColumn = useCallback((card: DeckCard, column: KanbanColumn): boolean => {
    switch (column.filterType) {
      case 'type':
        return card.type.toLowerCase().includes((column.filterValue as string).toLowerCase())
      case 'color':
        if (column.filterValue === 'C') {
          return !card.colors || card.colors.length === 0
        }
        return card.colors.includes(column.filterValue as string)
      case 'cmc':
        const cmc = card.cmc || 0
        if (column.id.includes('-')) {
          const [min, max] = column.title.match(/\d+/g)?.map(Number) || [0, 0]
          return cmc >= min && cmc <= max
        } else if (column.id.includes('+')) {
          const min = parseInt(column.filterValue as any) || 0
          return cmc >= min
        }
        return cmc === column.filterValue
      case 'rarity':
        return card.rarity?.toLowerCase() === (column.filterValue as string).toLowerCase()
      case 'custom':
        return true
      default:
        return false
    }
  }, [])

  const distributeCards = useCallback(() => {
    const newColumns = columns.map(col => ({ ...col, cards: [] as DeckCard[] }))
    const unassignedCards: DeckCard[] = []

    mainDeckCards.forEach(card => {
      if (globalFilters.searchText && !card.name.toLowerCase().includes(globalFilters.searchText.toLowerCase())) {
        return
      }
      if (globalFilters.colors.length > 0 && !globalFilters.colors.some(c => card.colors.includes(c))) {
        return
      }
      if (globalFilters.types.length > 0 && !globalFilters.types.some(t => card.type.toLowerCase().includes(t))) {
        return
      }
      if (globalFilters.cmcMin !== null && (card.cmc || 0) < globalFilters.cmcMin) {
        return
      }
      if (globalFilters.cmcMax !== null && (card.cmc || 0) > globalFilters.cmcMax) {
        return
      }

      let assigned = false
      for (const col of newColumns) {
        if (col.filterType !== 'custom' && cardMatchesColumn(card, col)) {
          col.cards.push(card)
          assigned = true
          break
        }
      }

      if (!assigned) {
        unassignedCards.push(card)
      }
    })

    const otherColumn = newColumns.find(col => col.filterType === 'custom')
    if (otherColumn) {
      otherColumn.cards = unassignedCards
    }

    newColumns.forEach(col => {
      col.cards.sort((a, b) => {
        const cmcDiff = (a.cmc || 0) - (b.cmc || 0)
        if (cmcDiff !== 0) return cmcDiff
        return a.name.localeCompare(b.name)
      })
    })

    setColumns(newColumns)
  }, [mainDeckCards, columns, cardMatchesColumn, globalFilters])

  const distributeMobileCards = useCallback(() => {
    const newSections = mobileSections.map(section => ({ ...section, cards: [] as DeckCard[] }))
    
    mainDeckCards.forEach(card => {
      if (globalFilters.searchText && !card.name.toLowerCase().includes(globalFilters.searchText.toLowerCase())) {
        return
      }
      if (globalFilters.colors.length > 0 && !globalFilters.colors.some(c => card.colors.includes(c))) {
        return
      }
      
      let assigned = false
      for (const section of newSections) {
        if (section.cardTypes.length === 0) continue
        if (section.cardTypes.some(type => card.type.toLowerCase().includes(type))) {
          section.cards.push(card)
          assigned = true
          break
        }
      }
      
      if (!assigned) {
        const otherSection = newSections.find(s => s.id === 'other')
        if (otherSection) otherSection.cards.push(card)
      }
    })
    
    newSections.forEach(section => {
      section.cards.sort((a, b) => {
        const cmcDiff = (a.cmc || 0) - (b.cmc || 0)
        if (cmcDiff !== 0) return cmcDiff
        return a.name.localeCompare(b.name)
      })
    })
    
    setMobileSections(newSections)
  }, [mobileSections, mainDeckCards, globalFilters])

  const moveSectionToColumn = (sectionId: string, targetColumn: 1 | 2 | 3) => {
    setMobileSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, column: targetColumn } : section
    ))
  }

  const moveSectionUp = (sectionId: string) => {
    setMobileSections(prev => {
      const section = prev.find(s => s.id === sectionId)
      if (!section) return prev
      
      const sameColumnSections = prev.filter(s => s.column === section.column).sort((a, b) => a.order - b.order)
      const sectionOrderIndex = sameColumnSections.findIndex(s => s.id === sectionId)
      
      if (sectionOrderIndex <= 0) return prev
      
      const swapWith = sameColumnSections[sectionOrderIndex - 1]
      
      return prev.map(s => {
        if (s.id === sectionId) return { ...s, order: swapWith.order }
        if (s.id === swapWith.id) return { ...s, order: section.order }
        return s
      })
    })
  }

  const moveSectionDown = (sectionId: string) => {
    setMobileSections(prev => {
      const section = prev.find(s => s.id === sectionId)
      if (!section) return prev
      
      const sameColumnSections = prev.filter(s => s.column === section.column).sort((a, b) => a.order - b.order)
      const sectionOrderIndex = sameColumnSections.findIndex(s => s.id === sectionId)
      
      if (sectionOrderIndex >= sameColumnSections.length - 1) return prev
      
      const swapWith = sameColumnSections[sectionOrderIndex + 1]
      
      return prev.map(s => {
        if (s.id === sectionId) return { ...s, order: swapWith.order }
        if (s.id === swapWith.id) return { ...s, order: section.order }
        return s
      })
    })
  }

  const toggleSectionCollapse = (sectionId: string) => {
    setMobileSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
    ))
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (viewMode === 'kanban') {
      if (isMobileView) {
        distributeMobileCards()
      } else {
        distributeCards()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, viewMode, globalFilters, isMobileView])

  const handleAddCard = async (scryfallCard: ScryfallCard) => {
    const existingCard = cards.find(c => c.scryfallId === scryfallCard.id)
    
    if (existingCard) {
      setCards(cards.map(c => 
        c.scryfallId === scryfallCard.id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ))
      alert(`Added another ${scryfallCard.name}!`)
      return
    }
  
    // Fetch rulings from Scryfall
    let rulings: Array<{ source: 'wotc' | 'scryfall', published_at: string, comment: string }> = []
    try {
      const rulingsResponse = await fetch(scryfallCard.rulings_uri)
      if (rulingsResponse.ok) {
        const rulingsData = await rulingsResponse.json()
        rulings = rulingsData.data || []
      }
    } catch (error) {
      console.error('Failed to fetch rulings:', error)
    }
  
    // Add the card with full data
    const newCard: DeckCard = {
      id: scryfallCard.id,
      scryfallId: scryfallCard.id,
      name: scryfallCard.name,
      quantity: 1,
      imageUrl: scryfallCard.image_uris?.normal || scryfallCard.image_uris?.small || '',
      type: scryfallCard.type_line,
      manaCost: scryfallCard.mana_cost || '',
      colors: scryfallCard.colors || [],
      cmc: parseManaValue(scryfallCard.mana_cost || ''),
      zone: 'main',
      rarity: scryfallCard.rarity,
      oracle_text: scryfallCard.oracle_text,
      rulings: rulings.length > 0 ? rulings : undefined,
      legalities: scryfallCard.legalities
    }
  
    setCards([...cards, newCard])
    alert(`Added ${scryfallCard.name}!`)
  }

  const handleRefreshAllCards = async () => {
    const cardsNeedingRefresh = getCardsNeedingRefresh(cards)
    
    if (cardsNeedingRefresh.length === 0) {
      alert('✅ All cards already have complete data!')
      return
    }
    
    const confirmed = confirm(
      `🔄 Refresh data for ${cardsNeedingRefresh.length} of ${cards.length} card(s)?\n\n` +
      `This will fetch the latest:\n` +
      `• Oracle text\n` +
      `• Rulings\n` +
      `• Legalities\n\n` +
      `Time: ~${Math.ceil(cardsNeedingRefresh.length * 0.15)} seconds`
    )
    
    if (!confirmed) return
    
    try {
      const updatedCards = await refreshAllCards(cards)
      setCards(updatedCards)
      
      const successCount = updatedCards.filter(c => c.oracle_text || c.rulings).length
      alert(`✅ Refreshed ${successCount} card(s)!`)
    } catch (error) {
      console.error('Refresh failed:', error)
      alert('Failed to refresh cards')
    }
  }

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
  }

  const addColumn = (filterType: FilterType, filterValue: string | number, title: string) => {
    const newColumn: KanbanColumn = {
      id: `col-${Date.now()}`,
      title,
      filterType,
      filterValue,
      cards: [],
      collapsed: false,
      width: 20
    }
    setColumns([...columns, newColumn])
    setShowColumnBuilder(false)
  }

  const removeColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId))
  }

  const toggleColumnCollapse = (columnId: string) => {
    console.log('Toggling collapse for column:', columnId)
    setColumns(columns.map(col => {
      if (col.id === columnId) {
        console.log(`Column ${columnId} collapsed state changing from ${col.collapsed} to ${!col.collapsed}`)
        return { ...col, collapsed: !col.collapsed }
      }
      return col
    }))
  }

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns]
    const [moved] = newColumns.splice(fromIndex, 1)
    newColumns.splice(toIndex, 0, moved)
    setColumns(newColumns)
  }

  const handleCardDragStart = (card: DeckCard) => {
    setDraggedCard(card)
  }

  const handleCardDragEnd = () => {
    setDraggedCard(null)
    setDragOverColumnId(null)
  }

  const handleColumnDragStart = (columnId: string) => {
    setDraggedColumnId(columnId)
  }

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null)
  }

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedColumnId && draggedColumnId !== columnId) {
      const fromIndex = columns.findIndex(col => col.id === draggedColumnId)
      const toIndex = columns.findIndex(col => col.id === columnId)
      reorderColumns(fromIndex, toIndex)
    }
  }

  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault()
    setResizingColumnId(columnId)
    setResizeStartX(e.clientX)
    const column = columns.find(col => col.id === columnId)
    if (column) {
      setResizeStartWidth(column.width)
    }
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumnId) return
    
    const deltaX = e.clientX - resizeStartX
    const containerWidth = window.innerWidth - 64
    const deltaPercent = (deltaX / containerWidth) * 100
    
    setColumns(columns.map(col => {
      if (col.id === resizingColumnId) {
        return { ...col, width: Math.max(15, Math.min(50, resizeStartWidth + deltaPercent)) }
      }
      return col
    }))
  }, [resizingColumnId, resizeStartX, resizeStartWidth, columns])

  const handleResizeEnd = useCallback(() => {
    setResizingColumnId(null)
  }, [])

  useEffect(() => {
    if (resizingColumnId) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizingColumnId, handleResizeMove, handleResizeEnd])

  const handleSave = async () => {
    console.log('Save button clicked')
    setInternalSaving(true)
    try {
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
        zone: card.zone,
        oracle_text: card.oracle_text,
        rulings: card.rulings,
        legalities: card.legalities,
        rarity: card.rarity,
        cmc: card.cmc
      }))
      
      if (onSave) {
        await onSave(deck.id, cardsToSave, deckName)
      } else {
        console.log('No onSave prop, calling API directly')
        const response = await fetch(`/api/decks/${deck.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: cardsToSave, deckName })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update deck')
        }
        
        console.log('Save successful, navigating to /sanctum')
        window.location.href = '/sanctum'
      }
    } catch (error) {
      console.error('Failed to save deck:', error)
      alert('Failed to save deck: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setInternalSaving(false)
    }
  }

  const renderKanbanCard = (card: DeckCard, columnId: string, index: number, allColumnCards: DeckCard[]) => {
    const cardScale = zoomLevel / 100
    const badgeSize = Math.max(16, 20 * cardScale)
    const fontSize = Math.max(10, 12 * cardScale)
    const buttonSize = Math.max(20, 24 * cardScale)
    
    const isHovered = hoveredCardId === card.id
    
    if (cardDisplayMode === 'full') {
      return (
        <div
          key={card.id}
          draggable
          onDragStart={() => handleCardDragStart(card)}
          onDragEnd={handleCardDragEnd}
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
          className={`relative bg-slate-800 rounded-lg overflow-hidden border-2 transition-all cursor-move mb-2 ${
            draggedCard?.id === card.id ? 'opacity-50 border-blue-500' : 'border-slate-700 hover:border-blue-500'
          }`}
        >
          <div 
            className="aspect-[2.5/3.5] cursor-pointer"
            onClick={() => setPreviewCardId(card.id)}
          >
            {card.imageUrl ? (
              <img 
                src={card.imageUrl} 
                alt={card.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-amber-900 to-amber-950 flex items-center justify-center p-2">
                <p className="text-white text-center wrap-break-words" style={{ fontSize: `${fontSize}px` }}>{card.name}</p>
              </div>
            )}
          </div>

          <div 
            className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg"
            style={{ 
              width: `${badgeSize}px`, 
              height: `${badgeSize}px`,
              fontSize: `${fontSize}px`
            }}
          >
            {card.quantity}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent p-2">
            <p className="text-white font-bold truncate" style={{ fontSize: `${fontSize}px` }}>{card.name}</p>
          </div>

          <div className="absolute flex flex-col gap-1" style={{ top: `${badgeSize + 4}px`, right: '4px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                incrementCard(card.id)
              }}
              className="bg-green-600/90 hover:bg-green-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg"
              style={{ 
                width: `${buttonSize}px`, 
                height: `${buttonSize}px`,
                fontSize: `${fontSize}px`
              }}
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (card.quantity > 1) decrementCard(card.id)
                else removeCard(card.id)
              }}
              className="bg-red-600/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg"
              style={{ 
                width: `${buttonSize}px`, 
                height: `${buttonSize}px`,
                fontSize: `${fontSize}px`
              }}
            >
              {card.quantity > 1 ? '-' : '×'}
            </button>
          </div>
        </div>
      )
    }
    
    // Stacked mode
    const stackedNameHeight = Math.max(28, 36 * cardScale)
    const fullCardHeight = columnWidth * 1.4
    
    const isAnyPreviousCardHovered = allColumnCards.slice(0, index).some(c => hoveredCardId === c.id)
    const marginTop = index === 0 ? '0px' : 
      (isHovered || isAnyPreviousCardHovered) 
        ? '0px'
        : `-${fullCardHeight - stackedNameHeight}px`
    
    return (
      <div
        key={card.id}
        draggable
        onDragStart={() => handleCardDragStart(card)}
        onDragEnd={handleCardDragEnd}
        onMouseEnter={() => setHoveredCardId(card.id)}
        onMouseLeave={() => setHoveredCardId(null)}
        onTouchStart={() => setHoveredCardId(card.id)}
        className={`relative bg-slate-800 rounded-lg overflow-hidden border-2 cursor-move transition-all duration-200 ease-out ${
          draggedCard?.id === card.id ? 'opacity-50 border-blue-500' : 'border-slate-700'
        } ${isHovered ? 'border-blue-500 shadow-xl shadow-blue-500/30' : ''}`}
        style={{
          marginTop: marginTop,
          height: `${fullCardHeight}px`,
          zIndex: isHovered ? 100 : 10 + index,
        }}
      >
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={() => setPreviewCardId(card.id)}
        >
          {card.imageUrl ? (
            <img 
              src={card.imageUrl} 
              alt={card.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-amber-900 to-amber-950 flex items-center justify-center p-2">
              <p className="text-white text-center wrap-break-words" style={{ fontSize: `${fontSize}px` }}>{card.name}</p>
            </div>
          )}
        </div>

        <div 
          className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t-2 border-slate-700/50 px-2 py-1 flex items-center gap-2"
          style={{ height: `${stackedNameHeight}px` }}
        >
          <div 
            className="shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg"
            style={{ 
              width: `${Math.max(18, badgeSize * 0.9)}px`, 
              height: `${Math.max(18, badgeSize * 0.9)}px`,
              fontSize: `${Math.max(8, fontSize * 0.85)}px`
            }}
          >
            {card.quantity}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate leading-tight" style={{ fontSize: `${Math.max(9, fontSize * 0.9)}px` }}>
              {card.name}
            </p>
          </div>

          <div 
            className="shrink-0 bg-purple-600/90 text-white rounded px-1.5 py-0.5 font-bold leading-none"
            style={{ 
              fontSize: `${Math.max(8, fontSize * 0.85)}px`
            }}
          >
            {card.cmc}
          </div>

          {isHovered && (
            <div className="shrink-0 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  incrementCard(card.id)
                }}
                className="bg-green-600 hover:bg-green-500 text-white rounded flex items-center justify-center font-bold shadow-lg transition-colors"
                style={{ 
                  width: `${Math.max(18, buttonSize * 0.8)}px`, 
                  height: `${Math.max(18, buttonSize * 0.8)}px`,
                  fontSize: `${Math.max(10, fontSize * 0.9)}px`
                }}
              >
                +
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (card.quantity > 1) decrementCard(card.id)
                  else removeCard(card.id)
                }}
                className="bg-red-600 hover:bg-red-500 text-white rounded flex items-center justify-center font-bold shadow-lg transition-colors"
                style={{ 
                  width: `${Math.max(18, buttonSize * 0.8)}px`, 
                  height: `${Math.max(18, buttonSize * 0.8)}px`,
                  fontSize: `${Math.max(10, fontSize * 0.9)}px`
                }}
              >
                {card.quantity > 1 ? '-' : '×'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

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
    W: '⚪', U: '🔵', B: '⚫', R: '🔴', G: '🟢'
  }

  const renderMobileSection = (section: MobileSection, columnSections: MobileSection[]) => {
    const sectionIndex = columnSections.findIndex(s => s.id === section.id)
    const canMoveUp = sectionIndex > 0
    const canMoveDown = sectionIndex < columnSections.length - 1
    const canMoveLeft = mobileColumnMode > 1 && section.column > 1
    const canMoveRight = mobileColumnMode > 1 && section.column < mobileColumnMode

    return (
      <div key={section.id} className="bg-slate-800/50 rounded-lg border-2 border-slate-700 mb-3">
        <div className="bg-slate-700 p-2 flex items-center justify-between">
          <button
            onClick={() => toggleSectionCollapse(section.id)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            <span className="text-lg">{section.collapsed ? '▶' : '▼'}</span>
            <span className="text-sm font-bold text-white">
              {section.emoji} {section.title}
            </span>
            <span className="text-xs text-gray-400 bg-slate-600 px-2 py-0.5 rounded">
              {section.cards.reduce((sum, c) => sum + c.quantity, 0)}
            </span>
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => moveSectionUp(section.id)}
              disabled={!canMoveUp}
              className={`p-1 rounded ${canMoveUp ? 'text-white hover:bg-slate-600' : 'text-slate-600 opacity-30'}`}
            >
              ▲
            </button>
            <button
              onClick={() => moveSectionDown(section.id)}
              disabled={!canMoveDown}
              className={`p-1 rounded ${canMoveDown ? 'text-white hover:bg-slate-600' : 'text-slate-600 opacity-30'}`}
            >
              ▼
            </button>
            <button
              onClick={() => moveSectionToColumn(section.id, (section.column - 1) as 1 | 2 | 3)}
              disabled={!canMoveLeft}
              className={`p-1 rounded ${canMoveLeft ? 'text-white hover:bg-slate-600' : 'text-slate-600 opacity-30'}`}
            >
              ◀
            </button>
            <button
              onClick={() => moveSectionToColumn(section.id, (section.column + 1) as 1 | 2 | 3)}
              disabled={!canMoveRight}
              className={`p-1 rounded ${canMoveRight ? 'text-white hover:bg-slate-600' : 'text-slate-600 opacity-30'}`}
            >
              ▶
            </button>
          </div>
        </div>

        {!section.collapsed && (
          <div className="p-2">
            {section.cards.length === 0 ? (
              <p className="text-center text-gray-500 text-xs py-4">No cards</p>
            ) : (
              section.cards.map((card, idx) => renderKanbanCard(card, section.id, idx, section.cards))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="bg-white/10 text-white text-lg font-bold px-3 py-1 rounded border-2 border-white/20 focus:border-white/40 focus:outline-none"
            placeholder="Deck name"
          />
          
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'kanban' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
              title="Kanban View"
            >
              <Columns3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'gallery' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
              title="Gallery View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          disabled={isSaving}
          className="text-white/80 hover:text-white text-3xl leading-none disabled:opacity-50"
        >
          ×
        </button>
      </div>

      <div className="bg-slate-800 border-b border-slate-700 flex">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'search'
              ? 'bg-slate-700 text-white border-b-2 border-slate-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔍 Search Cards
        </button>
        <button
          onClick={() => setActiveTab('deck')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'deck'
              ? 'bg-slate-700 text-white border-b-2 border-slate-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📜 My Deck ({totalCards})
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'search' ? (
          <CardSearch onCardSelect={handleAddCard} />
        ) : (
          <div className="h-full flex flex-col">
            {/* Shared Toolbar - Shows for both Kanban and List views */}
            <div className="bg-slate-800 border-b border-slate-700 p-3 space-y-2">
              {isMobileView && viewMode === 'kanban' && (
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium flex items-center gap-1"
                  >
                    <Filter className="w-3 h-3" />
                    {showMobileFilters ? 'Hide' : 'Show'} Filters
                  </button>
                  
                  <div className="ml-auto flex gap-1 bg-slate-700/50 rounded p-0.5">
                    <button
                      onClick={() => setMobileColumnMode(1)}
                      className={`px-2 py-1 rounded text-xs ${mobileColumnMode === 1 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                    >
                      1 Col
                    </button>
                    <button
                      onClick={() => setMobileColumnMode(2)}
                      className={`px-2 py-1 rounded text-xs ${mobileColumnMode === 2 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                    >
                      2 Col
                    </button>
                    <button
                      onClick={() => setMobileColumnMode(3)}
                      className={`px-2 py-1 rounded text-xs ${mobileColumnMode === 3 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                    >
                      3 Col
                    </button>
                  </div>
                </div>
              )}

              {(!isMobileView || showMobileFilters || viewMode === 'list') && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={globalFilters.searchText}
                    onChange={(e) => setGlobalFilters({ ...globalFilters, searchText: e.target.value })}
                    className="bg-slate-700 text-white text-sm rounded px-3 py-1 border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                  
                  <div className="flex gap-1">
                    {COLOR_FILTERS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => {
                          const colors = globalFilters.colors.includes(color.value)
                            ? globalFilters.colors.filter(c => c !== color.value)
                            : [...globalFilters.colors, color.value]
                          setGlobalFilters({ ...globalFilters, colors })
                        }}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          globalFilters.colors.includes(color.value)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                        }`}
                      >
                        {color.emoji}
                      </button>
                    ))}
                  </div>

                  {/* Kanban-only controls */}
                  {!isMobileView && viewMode === 'kanban' && (
                    <>
                      <div className="flex gap-1 bg-slate-700/50 rounded p-1">
                        <button
                          onClick={() => setCardDisplayMode('full')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            cardDisplayMode === 'full'
                              ? 'bg-slate-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-slate-700'
                          }`}
                          title="Full card view"
                        >
                          🃏 Full
                        </button>
                        <button
                          onClick={() => setCardDisplayMode('stacked')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            cardDisplayMode === 'stacked'
                              ? 'bg-slate-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-slate-600'
                          }`}
                          title="Stacked cards (hover to expand)"
                        >
                          📚 Stacked
                        </button>
                        <button
                          onClick={() => setCardDisplayMode('list')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            cardDisplayMode === 'list'
                              ? 'bg-slate-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-slate-600'
                          }`}
                          title="Simple List view. Click/Tap for Popup"
                        >
                          = List
                        </button>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                        <input
                          type="range"
                          min="50"
                          max="150"
                          step="10"
                          value={zoomLevel}
                          onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                          className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs text-gray-400 font-mono w-10">{zoomLevel}%</span>
                      </div>
                      <button
                        onClick={handleRefreshAllCards}
                        disabled={refreshing}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-1"
                        title="Refresh oracle text, rulings, and legalities for all cards"
                      >
                        {refreshing ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Refresh All
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowColumnBuilder(true)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Column
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* View-specific content */}
            <div className="flex-1 overflow-hidden">
              {viewMode === 'kanban' ? (
                isMobileView ? (
              <div className="flex-1 overflow-y-auto p-3">
                {commanderCards.length > 0 && (
                  <div className="bg-linear-to-r from-yellow-600 to-amber-600 rounded-lg mb-3 overflow-hidden">
                    <button
                      onClick={() => setCommanderCollapsed(!commanderCollapsed)}
                      className="w-full p-3 flex items-center justify-between text-white font-bold"
                    >
                      <span className="flex items-center gap-2">
                        👑 Commander ({commanderCards.reduce((sum, c) => sum + c.quantity, 0)})
                      </span>
                      <span className="text-xl">{commanderCollapsed ? '▼' : '▲'}</span>
                    </button>
                    
                    {!commanderCollapsed && (
                      <div className="bg-slate-800/30 p-2 flex gap-2 overflow-x-auto">
                        {commanderCards.map((card, idx) => (
                          <div key={card.id} className="shrink-0" style={{ width: `${columnWidth}px` }}>
                            {renderKanbanCard(card, 'commander', idx, commanderCards)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className={`grid gap-3 ${
                  mobileColumnMode === 1 ? 'grid-cols-1' :
                  mobileColumnMode === 2 ? 'grid-cols-2' :
                  'grid-cols-3'
                }`}>
                  {[1, 2, 3].slice(0, mobileColumnMode).map(colNum => {
                    const columnSections = mobileSections
                      .filter(s => s.column === colNum)
                      .sort((a, b) => a.order - b.order)
                    
                    return (
                      <div key={colNum} className="space-y-3">
                        {columnSections.map(section => renderMobileSection(section, columnSections))}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full flex gap-2 p-4 min-w-max">
                  {commanderCards.length > 0 && (
                    <div 
                      className="shrink-0 bg-slate-800/50 rounded-lg border-2 border-yellow-600/30"
                      style={{ width: `${columnWidth}px` }}
                    >
                      <div className="p-3 bg-linear-to-r from-yellow-600 to-amber-600 rounded-t-lg">
                        <h3 className="text-white font-bold flex items-center gap-2" style={{ fontSize: `${zoomLevel * 0.14}px` }}>
                          👑 Commander
                          <span className="ml-auto bg-white/20 px-2 py-0.5 rounded" style={{ fontSize: `${zoomLevel * 0.12}px` }}>
                            {commanderCards.reduce((sum, c) => sum + c.quantity, 0)}
                          </span>
                        </h3>
                      </div>
                      <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto relative">
                        {commanderCards.map((card, idx) => renderKanbanCard(card, 'commander', idx, commanderCards))}
                      </div>
                    </div>
                  )}

                  {columns.map((column) => (
                    <div
                      key={column.id}
                      draggable
                      onDragStart={() => handleColumnDragStart(column.id)}
                      onDragEnd={handleColumnDragEnd}
                      onDragOver={(e) => handleColumnDragOver(e, column.id)}
                      className={`shrink-0 bg-slate-800/50 rounded-lg border-2 transition-all ${
                        draggedColumnId === column.id ? 'opacity-50 border-blue-500' : 'border-slate-700'
                      } ${dragOverColumnId === column.id ? 'border-blue-400' : ''}`}
                      style={{ 
                        width: column.collapsed ? `${collapsedWidth}px` : `${columnWidth}px`,
                        minWidth: column.collapsed ? `${collapsedWidth}px` : `${columnWidth * 0.75}px`
                      }}
                    >
                      <div className="p-3 bg-slate-700 rounded-t-lg flex items-center justify-between gap-2 cursor-move">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <GripVertical className="shrink-0" style={{ width: `${zoomLevel * 0.16}px`, height: `${zoomLevel * 0.16}px` }} />
                          {!column.collapsed && (
                            <>
                              <h3 className="text-white font-bold truncate flex-1" style={{ fontSize: `${zoomLevel * 0.14}px` }}>
                                {column.title}
                              </h3>
                              <span className="bg-slate-600 px-2 py-0.5 rounded text-white shrink-0" style={{ fontSize: `${zoomLevel * 0.12}px` }}>
                                {column.cards.reduce((sum, c) => sum + c.quantity, 0)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('Eye button clicked for column:', column.id)
                              toggleColumnCollapse(column.id)
                            }}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                          >
                            <Eye style={{ width: `${zoomLevel * 0.12}px`, height: `${zoomLevel * 0.12}px` }} />
                          </button>
                          {column.filterType !== 'custom' && (
                            <button
                              onClick={() => removeColumn(column.id)}
                              className="p-1 hover:bg-slate-600 rounded transition-colors"
                            >
                              <X style={{ width: `${zoomLevel * 0.12}px`, height: `${zoomLevel * 0.12}px` }} />
                            </button>
                          )}
                        </div>
                      </div>

                      {!column.collapsed && (
                        <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto relative">
                          {column.cards.length === 0 ? (
                            <div className="text-center py-8 text-gray-500" style={{ fontSize: `${zoomLevel * 0.12}px` }}>
                              No cards
                            </div>
                          ) : (
                            column.cards.map((card, idx) => renderKanbanCard(card, column.id, idx, column.cards))
                          )}
                        </div>
                      )}

                      {!column.collapsed && (
                        <div
                          onMouseDown={(e) => handleResizeStart(e, column.id)}
                          className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/50 transition-colors"
                        />
                      )}
                    </div>
                  ))}

                  {sideboardCards.length > 0 && (
                    <div 
                      className="shrink-0 bg-slate-800/50 rounded-lg border-2 border-purple-600/30"
                      style={{ width: `${columnWidth}px` }}
                    >
                      <div className="p-3 bg-linear-to-r from-purple-600 to-pink-600 rounded-t-lg">
                        <h3 className="text-white font-bold flex items-center gap-2" style={{ fontSize: `${zoomLevel * 0.14}px` }}>
                          📦 Sideboard
                          <span className="ml-auto bg-white/20 px-2 py-0.5 rounded" style={{ fontSize: `${zoomLevel * 0.12}px` }}>
                            {sideboardTotal}
                          </span>
                        </h3>
                      </div>
                      <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto relative">
                        {sideboardCards.map((card, idx) => renderKanbanCard(card, 'sideboard', idx, sideboardCards))}
                      </div>
                    </div>
                  )}

                  {contemplatingCards.length > 0 && (
                    <div 
                      className="shrink-0 bg-slate-800/50 rounded-lg border-2 border-cyan-600/30 relative overflow-hidden"
                      style={{ width: `${columnWidth}px` }}
                    >
                      {/* Cloudy background effect */}
                      <div className="absolute inset-0 opacity-5 pointer-events-none">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-cyan-300 rounded-full blur-3xl" />
                      </div>
                      
                      <div className="p-3 bg-linear-to-r from-cyan-600 to-blue-600 rounded-t-lg relative z-10">
                        <h3 className="text-white font-bold flex items-center gap-2" style={{ fontSize: `${zoomLevel * 0.14}px` }}>
                          ☁️ Contemplating
                          <span className="ml-auto bg-white/20 px-2 py-0.5 rounded" style={{ fontSize: `${zoomLevel * 0.12}px` }}>
                            {contemplatingTotal}
                          </span>
                        </h3>
                      </div>
                      <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto relative z-10">
                        {contemplatingCards.map((card, idx) => renderKanbanCard(card, 'contemplating', idx, contemplatingCards))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : viewMode === 'list' ? (
            <DeckListView
              cards={cards}
              onUpdateCard={(cardId, updates) => {
                setCards(cards.map(c => c.id === cardId ? { ...c, ...updates } : c))
              }}
              onRemoveCard={removeCard}
              onIncrementCard={incrementCard}
              onDecrementCard={decrementCard}
              searchText={globalFilters.searchText}
              colorFilters={globalFilters.colors}
            />
          ) : (
            <div className="h-full p-4 overflow-y-auto">
              <p className="text-gray-500 text-center py-8">Gallery view coming soon!</p>
            </div>
          )}
          </div>
        </div>
        )}
      </div>

      <div className="bg-slate-800 border-t border-slate-700 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <div className="text-gray-400">
              <span className="font-bold text-blue-400">{totalCards}</span> cards
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
            {contemplatingTotal > 0 && (
              <div className="text-gray-400">
                <span className="font-bold text-cyan-400">{contemplatingTotal}</span> ☁️
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
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <><Save/> Save Changes</>
            )}
          </button>
        </div>
      </div>

      {showColumnBuilder && (
        <ColumnBuilderModal
          onClose={() => setShowColumnBuilder(false)}
          onAddColumn={addColumn}
        />
      )}

      {previewCardId && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewCardId(null)}
        >
          <div className="relative max-w-2xl w-full">
            <button
              onClick={() => setPreviewCardId(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-4xl leading-none transition-colors"
            >
              ×
            </button>
            
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
                  <div className="w-full aspect-[2.5/3.5] bg-linear-to-br from-amber-900 to-amber-950 flex items-center justify-center p-8">
                    <p className="text-white text-2xl text-center">{card.name}</p>
                  </div>
                )
              })()}
            </div>

            <div className="mt-4 text-center">
              {(() => {
                const card = cards.find(c => c.id === previewCardId)
                if (!card) return null
                return (
                  <div className="bg-slate-800/80 rounded-lg p-3 backdrop-blur">
                    <h3 className="text-white font-bold text-xl mb-1">{card.name}</h3>
                    <p className="text-gray-400 text-sm">{card.type}</p>
                    {card.manaCost && (
                      <div className="flex justify-center mt-1">
                        <ManaSymbols manaCost={card.manaCost} size={20} />
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      <RefreshProgressModal
        isOpen={refreshing}
        progress={progress}
      />
    </div>
  )
}

function ColumnBuilderModal({ 
  onClose, 
  onAddColumn 
}: { 
  onClose: () => void
  onAddColumn: (filterType: FilterType, filterValue: string | number, title: string) => void
}) {
  const [filterType, setFilterType] = useState<FilterType>('type')
  const [filterValue, setFilterValue] = useState('')
  const [title, setTitle] = useState('')

  const handleSubmit = () => {
    if (!title || !filterValue) {
      alert('Please fill in all fields')
      return
    }
    onAddColumn(filterType, filterValue, title)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Custom Column
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Column Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Removal Spells"
              className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Filter Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="type">Card Type</option>
              <option value="color">Color</option>
              <option value="cmc">Mana Value</option>
              <option value="rarity">Rarity</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Filter Value</label>
            {filterType === 'type' && (
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="e.g. instant, creature, artifact"
                className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            )}
            {filterType === 'color' && (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select color...</option>
                <option value="W">⚪ White</option>
                <option value="U">🔵 Blue</option>
                <option value="B">⚫ Black</option>
                <option value="R">🔴 Red</option>
                <option value="G">🟢 Green</option>
                <option value="C">⬜ Colorless</option>
              </select>
            )}
            {filterType === 'cmc' && (
              <input
                type="number"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="e.g. 3 (shows cards with CMC 3+)"
                className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
                min="0"
              />
            )}
            {filterType === 'rarity' && (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select rarity...</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="mythic">Mythic</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  )
}