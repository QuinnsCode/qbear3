// app/components/Draft/DraftPool.tsx
'use client'

import React, { useState, useEffect } from 'react'

interface Props {
  cards: string[]
  draftId: string
  compact?: boolean
}

export default function DraftPool({ cards, draftId, compact = false }: Props) {
  const [cardData, setCardData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (cards.length === 0) {
      setLoading(false)
      return
    }
    
    const fetchCards = async () => {
      const chunks = chunkArray(cards, 75)
      const allData: Record<string, any> = {}
      
      for (const chunk of chunks) {
        try {
          const response = await fetch('https://api.scryfall.com/cards/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifiers: chunk.map(id => ({ id }))
            })
          })
          
          const data = await response.json()
          data.data.forEach((card: any) => {
            allData[card.id] = card
          })
          
          await new Promise(r => setTimeout(r, 100))
        } catch (error) {
          console.error('Failed to fetch cards:', error)
        }
      }
      
      setCardData(allData)
      setLoading(false)
    }
    
    fetchCards()
  }, [cards])
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin text-4xl">⚙️</div>
        <p className="text-slate-400 mt-2">Loading cards...</p>
      </div>
    )
  }
  
  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No cards picked yet
      </div>
    )
  }
  
  const grouped = groupByColor(cards, cardData)
  
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([color, cardIds]) => (
        <div key={color}>
          <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            {getColorIcon(color)}
            {color} ({cardIds.length})
          </h4>
          <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {cardIds.map(cardId => {
              const card = cardData[cardId]
              const imageUrl = card?.image_uris?.small || card?.card_faces?.[0]?.image_uris?.small
              
              return (
                <div key={cardId} className="aspect-[5/7] rounded overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={card.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-700" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

function groupByColor(cardIds: string[], cardData: Record<string, any>): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    'White': [],
    'Blue': [],
    'Black': [],
    'Red': [],
    'Green': [],
    'Multicolor': [],
    'Colorless': []
  }
  
  for (const cardId of cardIds) {
    const card = cardData[cardId]
    if (!card) continue
    
    const colors = card.colors || []
    
    if (colors.length === 0) {
      groups['Colorless'].push(cardId)
    } else if (colors.length > 1) {
      groups['Multicolor'].push(cardId)
    } else {
      const color = colors[0]
      const colorName = {
        'W': 'White',
        'U': 'Blue',
        'B': 'Black',
        'R': 'Red',
        'G': 'Green'
      }[color] || 'Colorless'
      
      groups[colorName].push(cardId)
    }
  }
  
  return Object.fromEntries(
    Object.entries(groups).filter(([_, cards]) => cards.length > 0)
  )
}

function getColorIcon(color: string): string {
  const icons: Record<string, string> = {
    'White': '☀️',
    'Blue': '💧',
    'Black': '💀',
    'Red': '🔥',
    'Green': '🌳',
    'Multicolor': '🌈',
    'Colorless': '⚪'
  }
  return icons[color] || '⚪'
}