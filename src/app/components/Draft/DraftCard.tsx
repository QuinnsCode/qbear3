// app/components/Draft/DraftCard.tsx
'use client'

import type { CubeCard } from '@/app/types/Draft'

interface Props {
  card: CubeCard
  isSelected: boolean
  onClick: () => void
}

export default function DraftCard({ card, isSelected, onClick }: Props) {
  if (!card.imageUrl) {
    return (
      <div className="aspect-[5/7] bg-slate-700 rounded-lg flex items-center justify-center">
        <span className="text-slate-500 text-xs">No image</span>
      </div>
    )
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-[5/7] rounded-lg overflow-hidden transition-all transform hover:scale-105 hover:z-10 ${
        isSelected 
          ? 'ring-4 ring-blue-500 scale-105 z-10' 
          : 'hover:ring-2 hover:ring-blue-400'
      }`}
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        className="w-full h-full object-cover"
      />
      
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">
            ✓
          </div>
        </div>
      )}
    </button>
  )
}