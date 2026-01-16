// app/components/DeckBuilder/hooks/useMobileSections.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { MobileSection, DeckCard } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'
import * as DeckFn from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'

const DEFAULT_MOBILE_SECTIONS: MobileSection[] = [
  { id: 'creatures', title: 'Creatures', emoji: '🐲', cardTypes: ['creature'], cards: [], column: 1, order: 0, collapsed: false },
  { id: 'artifacts', title: 'Artifacts', emoji: '⚙️', cardTypes: ['artifact'], cards: [], column: 2, order: 0, collapsed: false },
  { id: 'enchantments', title: 'Enchantments', emoji: '✨', cardTypes: ['enchantment'], cards: [], column: 2, order: 1, collapsed: false },
  { id: 'sorceries', title: 'Sorceries', emoji: '📜', cardTypes: ['sorcery'], cards: [], column: 2, order: 2, collapsed: false },
  { id: 'instants', title: 'Instants', emoji: '⚡', cardTypes: ['instant'], cards: [], column: 2, order: 3, collapsed: false },
  { id: 'other', title: 'Other', emoji: '📦', cardTypes: [], cards: [], column: 2, order: 4, collapsed: false },
  { id: 'lands', title: 'Lands', emoji: '🏔️', cardTypes: ['land'], cards: [], column: 2, order: 5, collapsed: false },
]

export function useMobileSections(
  mainDeckCards: DeckCard[],
  globalFilters: DeckFn.GlobalFilters
) {
  const [mobileSections, setMobileSections] = useState<MobileSection[]>(DEFAULT_MOBILE_SECTIONS)
  const [mobileColumnMode, setMobileColumnMode] = useState<1 | 2 | 3>(2)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const distributeMobileCards = useCallback(() => {
    const newSections = DeckFn.distributeCardsToSections(mainDeckCards, mobileSections, globalFilters)
    setMobileSections(newSections)
  }, [mainDeckCards, mobileSections, globalFilters])

  useEffect(() => {
    distributeMobileCards()
  }, [mainDeckCards, globalFilters])

  const handleMoveSectionToColumn = useCallback((sectionId: string, targetColumn: 1 | 2 | 3) => {
    setMobileSections(prev => DeckFn.moveSectionToColumn(prev, sectionId, targetColumn))
  }, [])

  const handleMoveSectionUp = useCallback((sectionId: string) => {
    setMobileSections(prev => DeckFn.moveSectionUp(prev, sectionId))
  }, [])

  const handleMoveSectionDown = useCallback((sectionId: string) => {
    setMobileSections(prev => DeckFn.moveSectionDown(prev, sectionId))
  }, [])

  const handleToggleSectionCollapse = useCallback((sectionId: string) => {
    setMobileSections(prev => DeckFn.toggleSectionCollapse(prev, sectionId))
  }, [])

  return {
    mobileSections,
    mobileColumnMode,
    setMobileColumnMode,
    showMobileFilters,
    setShowMobileFilters,
    handleMoveSectionToColumn,
    handleMoveSectionUp,
    handleMoveSectionDown,
    handleToggleSectionCollapse
  }
}