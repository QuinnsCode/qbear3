// app/components/DeckBuilder/hooks/useDragAndDrop.ts
'use client'

import { useState, useCallback } from 'react'
import type { DeckCard, KanbanColumn } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'

export function useDragAndDrop(
  columns: KanbanColumn[],
  reorderColumns: (fromIndex: number, toIndex: number) => void
) {
  const [draggedCard, setDraggedCard] = useState<DeckCard | null>(null)
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  const handleCardDragStart = useCallback((card: DeckCard) => {
    setDraggedCard(card)
  }, [])

  const handleCardDragEnd = useCallback(() => {
    setDraggedCard(null)
    setDragOverColumnId(null)
  }, [])

  const handleColumnDragStart = useCallback((columnId: string) => {
    setDraggedColumnId(columnId)
  }, [])

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumnId(null)
  }, [])

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedColumnId && draggedColumnId !== columnId) {
      const fromIndex = columns.findIndex(col => col.id === draggedColumnId)
      const toIndex = columns.findIndex(col => col.id === columnId)
      reorderColumns(fromIndex, toIndex)
    }
  }, [draggedColumnId, columns, reorderColumns])

  return {
    draggedCard,
    draggedColumnId,
    dragOverColumnId,
    setDragOverColumnId,
    handleCardDragStart,
    handleCardDragEnd,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver
  }
}