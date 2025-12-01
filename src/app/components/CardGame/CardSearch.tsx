// app/components/CardGame/CardSearch.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { searchScryfallCards, autocompleteScryfallCards } from '@/app/serverActions/scryfall/scryfallActions'
import type { Card } from '@/app/api/scryfall/scryfallTypes'

interface Props {
  hoveredCard?: string | null
  onCardSelect?: (card: Card) => void
}

export default function CardSearch({ hoveredCard, onCardSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<(Card & { validatedImageUrl?: string | null })[]>([])
  const [selectedCard, setSelectedCard] = useState<(Card & { validatedImageUrl?: string | null }) | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounced autocomplete
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Clear previous timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current)
    }

    // Set new timeout
    autocompleteTimeoutRef.current = setTimeout(async () => {
      const result = await autocompleteScryfallCards(searchQuery)
      if (result.success) {
        setSuggestions(result.suggestions.slice(0, 8))
        setShowSuggestions(true)
      }
    }, 300)

    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Debounced search
  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      // Request 'small' for thumbnails, fallback enabled
      const result = await searchScryfallCards(query, 1, 'small', false)
      if (result.success) {
        setSearchResults(result.cards)
        if (result.cards.length > 0) {
          setSelectedCard(result.cards[0])
          onCardSelect?.(result.cards[0])
        }
      } else {
        setError(result.error || 'Search failed')
        setSearchResults([])
      }
    } catch (err) {
      setError('An error occurred while searching')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    handleSearch(searchQuery)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    handleSearch(suggestion)
  }

  const handleCardClick = (card: Card & { validatedImageUrl?: string | null }) => {
    setSelectedCard(card)
    onCardSelect?.(card)
  }

  return (
    <div className="h-full flex flex-col bg-slate-800">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-700">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="w-full bg-slate-900 text-white px-4 py-2 pr-10 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || searchQuery.length < 2}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center min-w-[44px]"
            >
              🔍
            </button>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </form>

        {error && (
          <div className="mt-2 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length > 0 ? (
          <div className="flex flex-col h-full">
            {/* Results List */}
            <div className="border-b border-slate-700 p-2">
              <div className="text-gray-400 text-xs px-2 mb-2">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      selectedCard?.id === card.id
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex gap-2">
                      {card.validatedImageUrl && (
                        <img
                          src={card.validatedImageUrl}
                          alt={card.name}
                          className="w-12 h-auto rounded"
                          onError={(e) => {
                            // Fallback to a placeholder if image fails to load
                            e.currentTarget.src = '/placeholder-card.png'
                            e.currentTarget.onerror = null // Prevent infinite loop
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm truncate">
                          {card.name}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          {card.type_line}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Selected Card Detail */}
            {selectedCard && (
              <div className="flex-1 overflow-y-auto">
                <CardDetail card={selectedCard} />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 p-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm">Search for cards</p>
              <p className="text-xs mt-1 text-gray-600">
                Try "Lightning Bolt" or "type:creature"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardDetail({ card }: { card: Card & { validatedImageUrl?: string | null } }) {
  // Use validatedImageUrl for the main display, fallback to normal size
  const imageUrl = card.validatedImageUrl || card.image_uris?.normal

  return (
    <div className="p-4 space-y-4">
      {/* Card Image */}
      {imageUrl && (
        <div className="rounded-lg overflow-hidden border-2 border-slate-600">
          <img
            src={imageUrl}
            alt={card.name}
            className="w-full"
            onError={(e) => {
              // Fallback to placeholder if image fails
              e.currentTarget.src = '/placeholder-card.png'
              e.currentTarget.onerror = null
            }}
          />
        </div>
      )}

      {/* Card Info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-white font-bold text-lg">{card.name}</h3>
          {card.mana_cost && (
            <div className="text-gray-400 text-sm mt-1">{card.mana_cost}</div>
          )}
        </div>

        <div>
          <div className="text-gray-400 text-sm">{card.type_line}</div>
        </div>

        {card.oracle_text && (
          <div className="bg-slate-900 rounded p-3">
            <div className="text-white text-sm whitespace-pre-wrap">
              {card.oracle_text}
            </div>
          </div>
        )}

        {(card.power || card.toughness) && (
          <div className="text-gray-400 text-sm">
            Power/Toughness: {card.power}/{card.toughness}
          </div>
        )}

        {card.loyalty && (
          <div className="text-gray-400 text-sm">
            Loyalty: {card.loyalty}
          </div>
        )}

        {/* Set Info */}
        <div className="pt-3 border-t border-slate-700 space-y-2">
          <div className="text-gray-400 text-xs">
            <span className="text-gray-500">Set:</span> {card.set_name} ({card.set})
          </div>
          <div className="text-gray-400 text-xs">
            <span className="text-gray-500">Rarity:</span> {card.rarity}
          </div>
          <div className="text-gray-400 text-xs">
            <span className="text-gray-500">Artist:</span> {card.artist}
          </div>
        </div>

        {/* Prices */}
        {(card.prices.usd || card.prices.usd_foil) && (
          <div className="pt-3 border-t border-slate-700 space-y-1">
            <div className="text-gray-500 text-xs font-semibold mb-2">Prices</div>
            {card.prices.usd && (
              <div className="text-gray-400 text-xs flex justify-between">
                <span>Normal:</span>
                <span className="text-green-400 font-semibold">${card.prices.usd}</span>
              </div>
            )}
            {card.prices.usd_foil && (
              <div className="text-gray-400 text-xs flex justify-between">
                <span>Foil:</span>
                <span className="text-green-400 font-semibold">${card.prices.usd_foil}</span>
              </div>
            )}
          </div>
        )}

        {/* Legalities */}
        <div className="pt-3 border-t border-slate-700">
          <div className="text-gray-500 text-xs font-semibold mb-2">Format Legality</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(card.legalities)
              .filter(([_, status]) => status === 'legal' || status === 'restricted' || status === 'banned')
              .slice(0, 8)
              .map(([format, status]) => (
                <div
                  key={format}
                  className={`px-2 py-1 rounded ${
                    status === 'legal'
                      ? 'bg-green-900/30 text-green-400'
                      : status === 'restricted'
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {format}: {status}
                </div>
              ))}
          </div>
        </div>

        {/* Scryfall Link */}
        <a
          href={card.scryfall_uri}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
        >
          View on Scryfall →
        </a>
      </div>
    </div>
  )
}