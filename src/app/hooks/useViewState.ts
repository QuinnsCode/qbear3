// app/components/DeckBuilder/hooks/useViewState.ts
'use client'

import { useState, useEffect } from 'react'

type ViewMode = 'kanban' | 'gallery' | 'list'
type CardDisplayMode = 'full' | 'stacked'

export function useViewState() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>('stacked')
  const [zoomLevel, setZoomLevel] = useState(100)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [previewCardId, setPreviewCardId] = useState<string | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [commanderCollapsed, setCommanderCollapsed] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return {
    viewMode,
    setViewMode,
    cardDisplayMode,
    setCardDisplayMode,
    zoomLevel,
    setZoomLevel,
    hoveredCardId,
    setHoveredCardId,
    previewCardId,
    setPreviewCardId,
    isMobileView,
    commanderCollapsed,
    setCommanderCollapsed
  }
}