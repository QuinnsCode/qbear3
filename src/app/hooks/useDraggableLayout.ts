// app/hooks/useDraggableLayout.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface LayoutState {
  topBarHeight: number
  bottomBarHeight: number
  rightPanelWidth: number
}

const DEFAULT_LAYOUT: LayoutState = {
  topBarHeight: 120, // Default opponent bar height
  bottomBarHeight: 280, // Default hand/zones height
  rightPanelWidth: 320, // Default card search width
}

const MIN_TOP_BAR = 60 // Just name dots
const MAX_TOP_BAR = 200 // Full expanded zones
const MIN_BOTTOM_BAR = 100 // Minimum usable
const MIN_RIGHT_PANEL = 0 // Can fully collapse
const MAX_RIGHT_PANEL = 500 // Max search panel width

export function useDraggableLayout() {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT)
  const [isDragging, setIsDragging] = useState<'top' | 'bottom' | 'right' | null>(null)
  const dragStartY = useRef(0)
  const dragStartX = useRef(0)
  const initialValue = useRef(0)

  // Load saved layout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mtg-layout')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLayout(parsed)
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }
  }, [])

  // Save layout to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mtg-layout', JSON.stringify(layout))
  }, [layout])

  // Start dragging
  const startDrag = useCallback((type: 'top' | 'bottom' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(type)
    dragStartY.current = e.clientY
    dragStartX.current = e.clientX
    
    if (type === 'top') {
      initialValue.current = layout.topBarHeight
    } else if (type === 'bottom') {
      initialValue.current = layout.bottomBarHeight
    } else if (type === 'right') {
      initialValue.current = layout.rightPanelWidth
    }
  }, [layout])

  // Handle drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging === 'top') {
        const delta = e.clientY - dragStartY.current
        const newHeight = Math.max(MIN_TOP_BAR, Math.min(MAX_TOP_BAR, initialValue.current + delta))
        setLayout(prev => ({ ...prev, topBarHeight: newHeight }))
      } else if (isDragging === 'bottom') {
        const delta = dragStartY.current - e.clientY // Inverted for bottom
        const newHeight = Math.max(MIN_BOTTOM_BAR, initialValue.current + delta)
        setLayout(prev => ({ ...prev, bottomBarHeight: newHeight }))
      } else if (isDragging === 'right') {
        const delta = dragStartX.current - e.clientX // Inverted for right panel
        const newWidth = Math.max(MIN_RIGHT_PANEL, Math.min(MAX_RIGHT_PANEL, initialValue.current + delta))
        setLayout(prev => ({ ...prev, rightPanelWidth: newWidth }))
      }
    }

    const handleMouseUp = () => {
      setIsDragging(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT)
  }, [])

  return {
    layout,
    setLayout,    // ⬅️ ADDED: Expose setState for manual updates
    isDragging,
    startDrag,
    resetLayout
  }
}