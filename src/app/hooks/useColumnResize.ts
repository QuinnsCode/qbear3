// app/components/DeckBuilder/hooks/useColumnResize.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { KanbanColumn } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'

export function useColumnResize(columns: KanbanColumn[], setColumns: (cols: KanbanColumn[]) => void) {
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)

  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault()
    setResizingColumnId(columnId)
    setResizeStartX(e.clientX)
    const column = columns.find(col => col.id === columnId)
    if (column) {
      setResizeStartWidth(column.width)
    }
  }, [columns])

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
  }, [resizingColumnId, resizeStartX, resizeStartWidth, columns, setColumns])

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

  return {
    resizingColumnId,
    handleResizeStart
  }
}