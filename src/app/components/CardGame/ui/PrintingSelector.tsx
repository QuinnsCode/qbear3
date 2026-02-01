// app/components/CardGame/ui/PrintingSelector.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { getAllPrintings } from '@/app/serverActions/cardData/getPrintings'
import type { CardData } from '@/app/services/cardData/types'

interface PrintingSelectorProps {
  cardName: string
  oracleId?: string
  currentPrintId?: string
  onSelect: (printing: CardData) => void
  onClose: () => void
}

export default function PrintingSelector({
  cardName,
  oracleId,
  currentPrintId,
  onSelect,
  onClose
}: PrintingSelectorProps) {
  const [printings, setPrintings] = useState<CardData[]>([])
  const [filteredPrintings, setFilteredPrintings] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setFilter, setSetFilter] = useState('')

  // Fetch all printings
  useEffect(() => {
    async function fetchPrintings() {
      setLoading(true)
      setError(null)

      const result = await getAllPrintings({
        oracleId,
        cardName
      })

      if (result.success && result.printings) {
        setPrintings(result.printings)
        setFilteredPrintings(result.printings)
      } else {
        setError(result.error || 'Failed to load printings')
      }

      setLoading(false)
    }

    fetchPrintings()
  }, [cardName, oracleId])

  // Filter printings by set
  useEffect(() => {
    if (!setFilter.trim()) {
      setFilteredPrintings(printings)
      return
    }

    const filtered = printings.filter(p =>
      p.setName.toLowerCase().includes(setFilter.toLowerCase()) ||
      p.setCode.toLowerCase().includes(setFilter.toLowerCase())
    )
    setFilteredPrintings(filtered)
  }, [setFilter, printings])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{cardName}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {printings.length} printing{printings.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Search by set */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by set name or code..."
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin text-4xl">⚙️</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <p className="text-red-400 text-lg">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredPrintings.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-slate-400 text-lg">No printings found for "{setFilter}"</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredPrintings.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPrintings.map((printing) => (
                <PrintingCard
                  key={printing.id}
                  printing={printing}
                  isSelected={printing.id === currentPrintId}
                  onSelect={() => onSelect(printing)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PrintingCardProps {
  printing: CardData
  isSelected: boolean
  onSelect: () => void
}

function PrintingCard({ printing, isSelected, onSelect }: PrintingCardProps) {
  const imageUrl = printing.imageUris?.normal || printing.imageUris?.large || printing.imageUris?.small

  return (
    <button
      onClick={onSelect}
      className={`
        group relative rounded-lg overflow-hidden transition-all
        ${isSelected
          ? 'ring-4 ring-blue-500 scale-105'
          : 'hover:ring-2 hover:ring-slate-500 hover:scale-105'
        }
      `}
    >
      {/* Card Image */}
      <div className="aspect-[5/7] bg-slate-800 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${printing.name} - ${printing.setName}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            No Image
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            SELECTED
          </div>
        )}

        {/* Hover overlay with details */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
          <p className="text-white font-bold text-sm truncate">{printing.setName}</p>
          <p className="text-slate-300 text-xs">{printing.setCode.toUpperCase()} • #{printing.collectorNumber}</p>
          <p className="text-slate-400 text-xs capitalize mt-1">{printing.rarity}</p>
          {printing.prices?.usd && (
            <p className="text-green-400 text-xs mt-1">${printing.prices.usd}</p>
          )}
        </div>
      </div>
    </button>
  )
}
