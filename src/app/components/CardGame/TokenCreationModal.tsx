// app/components/CardGame/TokenCreationModal.tsx
'use client'

import { useState } from 'react'
import { X, Search, Coins } from 'lucide-react'
import type { TokenData } from '@/app/services/cardGame/CardGameState'
import { searchScryfallCards } from '@/app/serverActions/scryfall/scryfallActions'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreateToken: (tokenData: TokenData) => void
}

const COMMON_TOKENS = [
  { name: 'Treasure', typeLine: 'Artifact — Treasure' },
  { name: 'Clue', typeLine: 'Artifact — Clue' },
  { name: 'Food', typeLine: 'Artifact — Food' },
  { name: 'Soldier', typeLine: 'Creature — Soldier', power: '1', toughness: '1' },
  { name: 'Goblin', typeLine: 'Creature — Goblin', power: '1', toughness: '1' },
  { name: 'Zombie', typeLine: 'Creature — Zombie', power: '2', toughness: '2' },
  { name: 'Saproling', typeLine: 'Creature — Saproling', power: '1', toughness: '1' },
]

export default function TokenCreationModal({ isOpen, onClose, onCreateToken }: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Custom token form
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState('')
  const [customPower, setCustomPower] = useState('')
  const [customToughness, setCustomToughness] = useState('')
  const [customText, setCustomText] = useState('')

  if (!isOpen) return null

  const handleSearchToken = async (tokenName: string) => {
    setIsSearching(true)
    setSearchQuery(tokenName)
    
    try {
      // Use your Scryfall server action with token filter
      const result = await searchScryfallCards(`${tokenName} t:token`, 1, 'normal', false)
      
      if (result.success && result.cards.length > 0) {
        setSearchResults(result.cards.slice(0, 10)) // Limit to 10 results
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Token search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSearchResult = (card: any) => {
    const tokenData: TokenData = {
      name: card.name,
      typeLine: card.type_line,
      power: card.power,
      toughness: card.toughness,
      oracleText: card.oracle_text,
      colors: card.colors || [],
      imageUrl: card.validatedImageUrl || card.image_uris?.normal || card.image_uris?.large
    }
    
    onCreateToken(tokenData)
    handleClose()
  }

  const handleCreateCustomToken = () => {
    if (!customName || !customType) {
      alert('Name and Type are required')
      return
    }

    const tokenData: TokenData = {
      name: customName,
      typeLine: customType,
      power: customPower || undefined,
      toughness: customToughness || undefined,
      oracleText: customText || undefined,
      colors: [],
      imageUrl: undefined
    }
    
    onCreateToken(tokenData)
    handleClose()
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setCustomName('')
    setCustomType('')
    setCustomPower('')
    setCustomToughness('')
    setCustomText('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border-2 border-slate-600 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Create Token</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-600">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
              activeTab === 'search'
                ? 'bg-slate-700 text-white border-b-2 border-yellow-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            🔍 Search Tokens
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
              activeTab === 'custom'
                ? 'bg-slate-700 text-white border-b-2 border-yellow-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            ✏️ Custom Token
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'search' ? (
            <div className="space-y-4">
              {/* Common Tokens */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Quick Access</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMON_TOKENS.map((token) => (
                    <button
                      key={token.name}
                      onClick={() => handleSearchToken(token.name)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                    >
                      {token.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Search Scryfall</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchToken(searchQuery)}
                    placeholder="Enter token name..."
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    onClick={() => handleSearchToken(searchQuery)}
                    disabled={isSearching || !searchQuery}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>
              </div>

              {/* Results */}
              {isSearching && (
                <div className="text-center py-8 text-slate-400">
                  Searching Scryfall...
                </div>
              )}
              
              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-300">Results</h3>
                  {searchResults.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleSelectSearchResult(card)}
                      className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {card.validatedImageUrl && (
                          <img
                            src={card.validatedImageUrl}
                            alt={card.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-bold text-white">{card.name}</div>
                          <div className="text-sm text-slate-300">{card.type_line}</div>
                          {card.power && card.toughness && (
                            <div className="text-sm text-yellow-400">{card.power}/{card.toughness}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No tokens found. Try the Custom tab to create your own!
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Treasure"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Type Line <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g., Artifact — Treasure"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Power</label>
                  <input
                    type="text"
                    value={customPower}
                    onChange={(e) => setCustomPower(e.target.value)}
                    placeholder="e.g., 1"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Toughness</label>
                  <input
                    type="text"
                    value={customToughness}
                    onChange={(e) => setCustomToughness(e.target.value)}
                    placeholder="e.g., 1"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Oracle Text (Optional)</label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g., {T}, Sacrifice this artifact: Add one mana of any color."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>

              <button
                onClick={handleCreateCustomToken}
                className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors"
              >
                Create Custom Token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}