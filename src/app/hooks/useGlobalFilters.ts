// app/components/DeckBuilder/hooks/useGlobalFilters.ts
'use client'

import { useState } from 'react'
import type { GlobalFilters } from '@/app/components/CardGame/DeckBuilder/editDeckFunctions'

export function useGlobalFilters() {
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    searchText: '',
    colors: [],
    types: [],
    cmcMin: null,
    cmcMax: null
  })

  return {
    globalFilters,
    setGlobalFilters
  }
}