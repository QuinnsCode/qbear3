import { useState, useEffect } from 'react'

interface SelectionBox {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface CardBounds {
  x: number
  y: number
  width: number
  height: number
}

interface UseMultiSelectProps {
  onTapSelected?: () => void
  onUntapSelected?: () => void
}

export function useMultiSelect(props?: UseMultiSelectProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  // Track shift key and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
      }
      
      // Keyboard shortcuts for selected cards — skip when typing in an input
      if (selectedCards.size > 0) {
        const el = document.activeElement
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return

        if (e.key === 't' || e.key === 'T') {
          e.preventDefault()
          props?.onTapSelected?.()
        }
        if (e.key === 'u' || e.key === 'U') {
          e.preventDefault()
          props?.onUntapSelected?.()
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedCards, props])

  const startSelection = (x: number, y: number) => {
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y })
    // Don't clear selection here — selectCardsInBox handles it once the box grows large enough.
    // This prevents a click (tiny box) from clearing an existing multi-selection.
  }

  const updateSelection = (x: number, y: number) => {
    if (!selectionBox) return
    
    setSelectionBox({
      ...selectionBox,
      currentX: x,
      currentY: y
    })
  }

  const endSelection = () => {
    setSelectionBox(null)
  }

  const selectCardsInBox = (cards: Array<{ id: string, bounds: CardBounds }>) => {
    if (!selectionBox) return

    const box = getBoxBounds()
    if (!box) return

    // Ignore tiny boxes (clicks, not drags) — preserves existing selection
    const MIN_BOX = 5
    if (box.width < MIN_BOX && box.height < MIN_BOX) return

    const newSelected = new Set(isShiftPressed ? selectedCards : [])

    cards.forEach(card => {
      // Check if card intersects with selection box
      if (
        card.bounds.x < box.right &&
        card.bounds.x + card.bounds.width > box.left &&
        card.bounds.y < box.bottom &&
        card.bounds.y + card.bounds.height > box.top
      ) {
        newSelected.add(card.id)
      }
    })

    setSelectedCards(newSelected)
  }

  const toggleCard = (cardId: string) => {
    const newSelected = new Set(selectedCards)
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId)
    } else {
      newSelected.add(cardId)
    }
    setSelectedCards(newSelected)
  }

  const selectCard = (cardId: string) => {
    setSelectedCards(new Set([cardId]))
  }

  const clearSelection = () => {
    setSelectedCards(new Set())
  }

  const getBoxBounds = () => {
    if (!selectionBox) return null

    return {
      left: Math.min(selectionBox.startX, selectionBox.currentX),
      top: Math.min(selectionBox.startY, selectionBox.currentY),
      right: Math.max(selectionBox.startX, selectionBox.currentX),
      bottom: Math.max(selectionBox.startY, selectionBox.currentY),
      width: Math.abs(selectionBox.currentX - selectionBox.startX),
      height: Math.abs(selectionBox.currentY - selectionBox.startY)
    }
  }

  return {
    selectedCards,
    selectionBox,
    isShiftPressed,
    startSelection,
    updateSelection,
    endSelection,
    selectCardsInBox,
    toggleCard,
    selectCard,
    clearSelection,
    getBoxBounds
  }
}