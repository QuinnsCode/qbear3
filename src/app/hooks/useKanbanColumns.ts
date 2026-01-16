// app/components/DeckBuilder/hooks/useKanbanColumns.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { KanbanColumn, DeckCard, FilterType } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'
import * as DeckFn from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'

const DEFAULT_COLUMNS: Omit<KanbanColumn, 'cards'>[] = [
  { id: 'creatures', title: '🐲 Creatures', filterType: 'type', filterValue: 'creature', collapsed: false, width: 20 },
  { id: 'artifacts', title: '⚙️ Artifacts', filterType: 'type', filterValue: 'artifact', collapsed: false, width: 20 },
  { id: 'enchantments', title: '✨ Enchantments', filterType: 'type', filterValue: 'enchantment', collapsed: false, width: 20 },
  { id: 'instants', title: '⚡ Instants', filterType: 'type', filterValue: 'instant', collapsed: false, width: 15 },
  { id: 'sorceries', title: '📜 Sorceries', filterType: 'type', filterValue: 'sorcery', collapsed: false, width: 15 },
  { id: 'lands', title: '🏔️ Lands', filterType: 'type', filterValue: 'land', collapsed: false, width: 20 },
  { id: 'other', title: '📦 Other', filterType: 'custom', filterValue: null, collapsed: false, width: 15 }
]

export function useKanbanColumns(
  mainDeckCards: DeckCard[],
  globalFilters: DeckFn.GlobalFilters
) {
  const [columns, setColumns] = useState<KanbanColumn[]>(
    DEFAULT_COLUMNS.map(col => ({ ...col, cards: [] }))
  )
  const [showColumnBuilder, setShowColumnBuilder] = useState(false)

  const distributeCards = useCallback(() => {
    const newColumns = DeckFn.distributeCardsToColumns(mainDeckCards, columns, globalFilters)
    setColumns(newColumns)
  }, [mainDeckCards, columns, globalFilters])

  useEffect(() => {
    distributeCards()
  }, [mainDeckCards, globalFilters])

  const handleAddColumn = useCallback((filterType: FilterType, filterValue: string | number, title: string) => {
    setColumns(prev => DeckFn.addColumn(prev, filterType, filterValue, title))
    setShowColumnBuilder(false)
  }, [])

  const handleRemoveColumn = useCallback((columnId: string) => {
    setColumns(prev => DeckFn.removeColumn(prev, columnId))
  }, [])

  const handleToggleColumnCollapse = useCallback((columnId: string) => {
    setColumns(prev => DeckFn.toggleColumnCollapse(prev, columnId))
  }, [])

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => DeckFn.reorderColumns(prev, fromIndex, toIndex))
  }, [])

  return {
    columns,
    setColumns,
    showColumnBuilder,
    setShowColumnBuilder,
    handleAddColumn,
    handleRemoveColumn,
    handleToggleColumnCollapse,
    reorderColumns
  }
}