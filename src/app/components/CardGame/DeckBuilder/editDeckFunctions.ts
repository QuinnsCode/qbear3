// app/components/CardGame/DeckBuilder/editDeckFunctions.ts
import type { Card as ScryfallCard } from '@/app/api/scryfall/scryfallTypes'

// Types
export type CardZone = 'main' | 'commander' | 'sideboard' | 'contemplating'
export type FilterType = 'type' | 'color' | 'cmc' | 'rarity' | 'custom'

export interface DeckCard {
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
}

export interface KanbanColumn {
  id: string
  title: string
  filterType: FilterType
  filterValue: string | number | null
  cards: DeckCard[]
  collapsed: boolean
  width: number
}

export interface MobileSection {
  id: string
  title: string
  emoji: string
  cardTypes: string[]
  cards: DeckCard[]
  column: 1 | 2 | 3
  order: number
  collapsed: boolean
}

export interface GlobalFilters {
  searchText: string
  colors: string[]
  types: string[]
  cmcMin: number | null
  cmcMax: number | null
}

// Parse mana value from mana cost string
export function parseManaValue(manaCost: string): number {
  if (!manaCost) return 0
  const matches = manaCost.match(/\d+/g)
  const generic = matches ? parseInt(matches[0]) : 0
  const symbols = (manaCost.match(/[WUBRGC]/g) || []).length
  return generic + symbols
}

// Check if card matches column filter
export function cardMatchesColumn(card: DeckCard, column: KanbanColumn): boolean {
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
}

// Apply global filters to a card
export function passesGlobalFilters(card: DeckCard, filters: GlobalFilters): boolean {
  if (filters.searchText && !card.name.toLowerCase().includes(filters.searchText.toLowerCase())) {
    return false
  }
  if (filters.colors.length > 0 && !filters.colors.some(c => card.colors.includes(c))) {
    return false
  }
  if (filters.types.length > 0 && !filters.types.some(t => card.type.toLowerCase().includes(t))) {
    return false
  }
  if (filters.cmcMin !== null && (card.cmc || 0) < filters.cmcMin) {
    return false
  }
  if (filters.cmcMax !== null && (card.cmc || 0) > filters.cmcMax) {
    return false
  }
  return true
}

// Sort cards by CMC then name
export function sortCardsByCMC(cards: DeckCard[]): DeckCard[] {
  return [...cards].sort((a, b) => {
    const cmcDiff = (a.cmc || 0) - (b.cmc || 0)
    if (cmcDiff !== 0) return cmcDiff
    return a.name.localeCompare(b.name)
  })
}

// Distribute cards into kanban columns
export function distributeCardsToColumns(
  mainDeckCards: DeckCard[],
  columns: KanbanColumn[],
  globalFilters: GlobalFilters
): KanbanColumn[] {
  const newColumns = columns.map(col => ({ ...col, cards: [] as DeckCard[] }))
  const unassignedCards: DeckCard[] = []

  mainDeckCards.forEach(card => {
    if (!passesGlobalFilters(card, globalFilters)) return

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

  // Put unassigned cards in "Other" column
  const otherColumn = newColumns.find(col => col.filterType === 'custom')
  if (otherColumn) {
    otherColumn.cards = unassignedCards
  }

  // Sort cards within each column
  newColumns.forEach(col => {
    col.cards = sortCardsByCMC(col.cards)
  })

  return newColumns
}

// Distribute cards into mobile sections
export function distributeCardsToSections(
  mainDeckCards: DeckCard[],
  sections: MobileSection[],
  globalFilters: GlobalFilters
): MobileSection[] {
  const newSections = sections.map(section => ({ ...section, cards: [] as DeckCard[] }))
  
  mainDeckCards.forEach(card => {
    if (!passesGlobalFilters(card, globalFilters)) return
    
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
  
  // Sort cards within each section
  newSections.forEach(section => {
    section.cards = sortCardsByCMC(section.cards)
  })
  
  return newSections
}

// Add card to deck
export function addCardToDeck(
  cards: DeckCard[],
  scryfallCard: ScryfallCard
): DeckCard[] {
  const existingCard = cards.find(c => c.scryfallId === scryfallCard.id)
  
  if (existingCard) {
    return cards.map(c => 
      c.scryfallId === scryfallCard.id 
        ? { ...c, quantity: c.quantity + 1 }
        : c
    )
  } else {
    return [...cards, {
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
      rarity: scryfallCard.rarity
    }]
  }
}

// Increment card quantity
export function incrementCardQuantity(cards: DeckCard[], cardId: string): DeckCard[] {
  return cards.map(c => 
    c.id === cardId ? { ...c, quantity: c.quantity + 1 } : c
  )
}

// Decrement card quantity
export function decrementCardQuantity(cards: DeckCard[], cardId: string): DeckCard[] {
  return cards.map(c => 
    c.id === cardId && c.quantity > 1 ? { ...c, quantity: c.quantity - 1 } : c
  )
}

// Remove card from deck
export function removeCardFromDeck(cards: DeckCard[], cardId: string): DeckCard[] {
  return cards.filter(c => c.id !== cardId)
}

// Move card to different zone
export function moveCardToZone(cards: DeckCard[], cardId: string, newZone: CardZone): DeckCard[] {
  return cards.map(c => 
    c.id === cardId ? { ...c, zone: newZone } : c
  )
}

// Change card image
export function changeCardImage(cards: DeckCard[], cardId: string, newImageUrl: string): DeckCard[] {
  return cards.map(c => 
    c.id === cardId ? { ...c, imageUrl: newImageUrl } : c
  )
}

// Change card printing
export function changeCardPrinting(cards: DeckCard[], cardId: string, newPrinting: ScryfallCard): DeckCard[] {
  return cards.map(c => 
    c.id === cardId ? {
      ...c,
      scryfallId: newPrinting.id,
      imageUrl: newPrinting.image_uris?.normal || newPrinting.image_uris?.small || c.imageUrl,
      manaCost: newPrinting.mana_cost || c.manaCost,
      type: newPrinting.type_line || c.type,
      cmc: parseManaValue(newPrinting.mana_cost || '')
    } : c
  )
}

// Calculate color counts
export function calculateColorCounts(cards: DeckCard[]): Record<string, number> {
  const counts: Record<string, number> = {}
  cards.forEach(card => {
    card.colors?.forEach(color => {
      counts[color] = (counts[color] || 0) + card.quantity
    })
  })
  return counts
}

// Reorder columns
export function reorderColumns(columns: KanbanColumn[], fromIndex: number, toIndex: number): KanbanColumn[] {
  const newColumns = [...columns]
  const [moved] = newColumns.splice(fromIndex, 1)
  newColumns.splice(toIndex, 0, moved)
  return newColumns
}

// Add column
export function addColumn(
  columns: KanbanColumn[],
  filterType: FilterType,
  filterValue: string | number,
  title: string
): KanbanColumn[] {
  const newColumn: KanbanColumn = {
    id: `col-${Date.now()}`,
    title,
    filterType,
    filterValue,
    cards: [],
    collapsed: false,
    width: 20
  }
  return [...columns, newColumn]
}

// Remove column
export function removeColumn(columns: KanbanColumn[], columnId: string): KanbanColumn[] {
  return columns.filter(col => col.id !== columnId)
}

// Toggle column collapse
export function toggleColumnCollapse(columns: KanbanColumn[], columnId: string): KanbanColumn[] {
  return columns.map(col =>
    col.id === columnId ? { ...col, collapsed: !col.collapsed } : col
  )
}

// Move section to column
export function moveSectionToColumn(
  sections: MobileSection[],
  sectionId: string,
  targetColumn: 1 | 2 | 3
): MobileSection[] {
  return sections.map(section => 
    section.id === sectionId ? { ...section, column: targetColumn } : section
  )
}

// Move section up
export function moveSectionUp(sections: MobileSection[], sectionId: string): MobileSection[] {
  const sectionIndex = sections.findIndex(s => s.id === sectionId)
  if (sectionIndex <= 0) return sections
  
  const section = sections[sectionIndex]
  const sameColumnSections = sections.filter(s => s.column === section.column).sort((a, b) => a.order - b.order)
  const sectionOrderIndex = sameColumnSections.findIndex(s => s.id === sectionId)
  
  if (sectionOrderIndex <= 0) return sections
  
  const swapWith = sameColumnSections[sectionOrderIndex - 1]
  
  return sections.map(s => {
    if (s.id === sectionId) return { ...s, order: swapWith.order }
    if (s.id === swapWith.id) return { ...s, order: section.order }
    return s
  })
}

// Move section down
export function moveSectionDown(sections: MobileSection[], sectionId: string): MobileSection[] {
  const section = sections.find(s => s.id === sectionId)
  if (!section) return sections
  
  const sameColumnSections = sections.filter(s => s.column === section.column).sort((a, b) => a.order - b.order)
  const sectionOrderIndex = sameColumnSections.findIndex(s => s.id === sectionId)
  
  if (sectionOrderIndex >= sameColumnSections.length - 1) return sections
  
  const swapWith = sameColumnSections[sectionOrderIndex + 1]
  
  return sections.map(s => {
    if (s.id === sectionId) return { ...s, order: swapWith.order }
    if (s.id === swapWith.id) return { ...s, order: section.order }
    return s
  })
}

// Toggle section collapse
export function toggleSectionCollapse(sections: MobileSection[], sectionId: string): MobileSection[] {
  return sections.map(section =>
    section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
  )
}

// Handle image upload
export function handleImageUpload(
  file: File,
  onComplete: (dataUrl: string) => void
): void {
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result
    if (typeof result === 'string') {
      onComplete(result)
    }
  }
  reader.readAsDataURL(file)
}

// Fetch card printings
export async function fetchCardPrintings(cardName: string): Promise<ScryfallCard[]> {
  try {
    const response = await fetch(`/api/scryfall/search?query=${encodeURIComponent(`!"${cardName}"`)}`)
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to fetch printings:', error)
    throw error
  }
}