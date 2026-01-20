// app/components/DeckBuilder/Deckbuilder.tsx
'use client'

import { useState, useMemo } from 'react'
import DeckCard from './DeckCard'
import CreateDeckModal from './CreateDeckModal'
import type { Deck } from '@/app/types/Deck'
import EditDeckModal from './EditDeckModal'
import { EDH_SANDBOX_STARTER_DECK_DATA } from '@/app/components/CardGame/Sandbox/starterDeckData'
import { createDeck, deleteDeck, updateDeckFromEditor } from '@/app/serverActions/deckBuilder/deckActions'

interface Props {
  decks: Deck[]
  userId: string
  isSandbox?: boolean
  cardGameId?: string
  onClose?: () => void
  maxDecks?: number
  currentTier?: string
  onCreateDeck?: (deckList: string, deckName: string) => Promise<void>
  onDeleteDeck?: (deckId: string) => Promise<void>
  onSelectDeck?: (deckId: string) => Promise<void>
  onEditDeck?: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
}

const SANDBOX_STARTER_DECKS: Deck[] = EDH_SANDBOX_STARTER_DECK_DATA.map((deck, index) => {
  const commanderCard = deck.cards.find(card => 
    card.name.toLowerCase() === deck.commander.toLowerCase()
  );
  
  return {
    version: 3, // ADD THIS
    id: `sandbox-${index}`,
    name: deck.name,
    commanders: [deck.commander], // CHANGE: single commander to array
    commanderImageUrls: commanderCard?.image_uris?.art_crop || commanderCard?.image_uris?.large || commanderCard?.image_uris?.normal 
      ? [commanderCard.image_uris.art_crop || commanderCard.image_uris.large || commanderCard.image_uris.normal]
      : undefined, // CHANGE: wrap in array
    colors: [deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '⚪' ? 'W' : 
             deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '⚫' ? 'B' :
             deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '🔴' ? 'R' :
             deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '🟢' ? 'G' : 'U'] as ('W' | 'U' | 'B' | 'R' | 'G')[],
    cards: [],
    totalCards: 100,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
});

export default function DeckBuilder({ 
  decks,
  userId,
  isSandbox = false,
  cardGameId,
  onClose,
  maxDecks = 2,
  currentTier = 'free',
  onCreateDeck,
  onDeleteDeck,
  onSelectDeck,
  onEditDeck
}: Props) {
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const displayDecks = isSandbox ? SANDBOX_STARTER_DECKS : decks;

  // Filter decks with search
  const filteredDecks = useMemo(() => {
    const validDecks = (displayDecks || []).filter(deck => deck != null)
    
    if (!searchQuery.trim()) return validDecks
    
    const query = searchQuery.toLowerCase()
    return validDecks.filter(deck => {
      // Search in commanders array instead of single commander
      const commanderMatch = deck.commanders?.some(cmd => 
        cmd.toLowerCase().includes(query)
      )
      
      return (
        deck.name?.toLowerCase().includes(query) ||
        commanderMatch ||
        deck.colors?.some(color => color.toLowerCase().includes(query))
      )
    })
  }, [displayDecks, searchQuery])

  const handleCreateDeck = async (deckList: string, deckName: string) => {
    if (onCreateDeck) {
      return onCreateDeck(deckList, deckName)
    }
    
    setIsCreating(true)
    try {
      const result = await createDeck(userId, deckName, deckList)
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to create deck')
      }
      window.location.reload()
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (onDeleteDeck) {
      return onDeleteDeck(deckId)
    }
    
    try {
      const result = await deleteDeck(userId, deckId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete deck')
      }
      window.location.reload()
    } catch (error) {
      console.error('Failed to delete deck:', error)
      alert('Failed to delete deck')
    }
  }

  const handleEditDeck = async (
    deckId: string,
    updatedCards: Array<{name: string, quantity: number}>,
    deckName: string
  ) => {
    if (onEditDeck) {
      return onEditDeck(deckId, updatedCards, deckName)
    }
    
    setIsSaving(true)
    try {
      const result = await updateDeckFromEditor(userId, deckId, deckName, updatedCards)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update deck')
      }
      setEditingDeck(null)
      window.location.reload()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectDeck = async (deckId: string) => {
    if (onSelectDeck) {
      return onSelectDeck(deckId)
    }
    
    if (cardGameId) {
      window.location.href = `/game/${cardGameId}?deckId=${deckId}`
    } else {
      window.location.href = `/deck/${deckId}`
    }
  }

  const validDecksCount = (displayDecks || []).filter(d => d != null).length
  const canCreateMore = !isSandbox && validDecksCount < maxDecks

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Sandbox Banner */}
        {isSandbox && (
          <div className="mb-6 bg-purple-600/20 border-2 border-purple-500 rounded-xl p-4">
            <div className="flex items-center gap-3">
              {/* <span className="text-3xl">🎮</span> */}
              <div>
                <h2 className="text-white font-bold text-lg">Sandbox Mode - Starter Decks</h2>
                <p className="text-purple-200 text-sm">Choose a pre-made deck to get started!</p>
              </div>
            </div>
          </div>
        )}

        {/* Deck Limit Warning */}
        {!isSandbox && validDecksCount >= maxDecks && (
          <div className="mb-6 bg-amber-600/20 border-2 border-amber-500 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🃏</span>
              <div className="flex-1">
                <h2 className="text-white font-bold text-lg">Deck Limit Reached</h2>
                <p className="text-amber-200 text-sm">
                  You have {validDecksCount}/{maxDecks} decks. All tiers currently support {maxDecks} decks maximum.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header with Search and Create */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-[2]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isSandbox ? "Search starter decks..." : "Search your decks by name, commander, or colors..."}
                className="w-full bg-slate-800/50 backdrop-blur-sm text-white px-6 py-4 pl-14 rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-500"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                🔍
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Create Button - Hidden in sandbox or at limit */}
          {!isSandbox && (
            <div className="flex-1">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={!canCreateMore}
                className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">+</span>
                <span>Create Deck</span>
                {!canCreateMore && <span className="text-xs">(Max {maxDecks})</span>}
              </button>
            </div>
          )}
        </div>

        {/* Deck Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            {filteredDecks.length} {filteredDecks.length === 1 ? 'deck' : 'decks'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {!isSandbox && (
            <p className="text-gray-500 text-xs">
              {validDecksCount} / {maxDecks} decks created
            </p>
          )}
        </div>

        {/* Decks Grid */}
        {filteredDecks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onSelect={() => handleSelectDeck(deck.id)}
                onEdit={isSandbox ? undefined : () => setEditingDeck(deck)}
                onDelete={isSandbox ? undefined : () => {
                  if (confirm(`Delete "${deck.name}"? This cannot be undone.`)) {
                    handleDeleteDeck(deck.id)
                  }
                }}
                isSandbox={isSandbox}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-8xl mb-6">🃏</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {searchQuery ? 'No decks found' : isSandbox ? 'No starter decks available' : 'No decks yet'}
            </h3>
            <p className="text-gray-400 mb-8 text-center max-w-md">
              {searchQuery
                ? `No decks match "${searchQuery}". Try a different search term.`
                : isSandbox 
                ? 'Starter decks are being loaded...'
                : 'Create your first Commander deck to get started!'}
            </p>
            {!searchQuery && !isSandbox && canCreateMore && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                ✨ Create Your First Deck
              </button>
            )}
          </div>
        )}

        {/* Create Deck Modal - Only in normal mode */}
        {!isSandbox && (
          <CreateDeckModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateDeck}
            isCreating={isCreating}
          />
        )}

        {/* Edit Deck Modal - Only in normal mode */}
        {!isSandbox && editingDeck && (
          <EditDeckModal
            deck={editingDeck}
            onClose={() => {
              setEditingDeck(null)
              window.location.href = '/sanctum'
            }}
            onSave={handleEditDeck}
            isSaving={isSaving}
          />
        )}
        
        {/* Loading overlay for sandbox deck import */}
        {isSaving && isSandbox && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4">
              <div className="animate-spin text-6xl">⚙️</div>
              <div className="text-white text-xl font-bold">Importing Deck...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}