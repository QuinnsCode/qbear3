// app/components/DeckBuilder/DeckBuilder.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import DeckCard from './DeckCard'
import CreateDeckModal from './CreateDeckModal'
import type { Deck } from '@/app/types/Deck'
import EditDeckModal from './EditDeckModal'


interface Props {
    decks: Deck[]
    userId: string
    onCreateDeck: (deckList: string, deckName: string) => Promise<void>
    onDeleteDeck: (deckId: string) => Promise<void>
    onSelectDeck: (deckId: string) => void
    onEditDeck: (deckId: string, cards: Array<{name: string, quantity: number}>, deckName: string) => Promise<void>
}

export default function DeckBuilder({ 
    decks,
    userId,
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

  // Filter out any undefined/null decks and apply search
  const filteredDecks = useMemo(() => {
    const validDecks = (decks || []).filter(deck => deck != null)
    
    if (!searchQuery.trim()) return validDecks
    
    const query = searchQuery.toLowerCase()
    return validDecks.filter(deck => 
      deck.name?.toLowerCase().includes(query) ||
      deck.commander?.toLowerCase().includes(query) ||
      deck.colors?.some(color => color.toLowerCase().includes(query))
    )
  }, [decks, searchQuery])

  const handleCreateDeck = async (deckList: string, deckName: string) => {
    setIsCreating(true)
    try {
      await onCreateDeck(deckList, deckName)
      setIsCreateModalOpen(false)
      setSearchQuery('') // Clear search to show new deck
    } catch (error) {
      console.error('Failed to create deck:', error)
      throw error // Re-throw so modal can handle it
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditDeck = async (
    deckId: string,
    updatedCards: Array<{name: string, quantity: number}>,
    deckName: string
  ) => {
    setIsSaving(true)
    try {
      await onEditDeck(deckId, updatedCards, deckName)
      setEditingDeck(null)
    } catch (error) {
      console.error('Failed to save deck:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const validDecksCount = (decks || []).filter(d => d != null).length
  const canCreateMore = validDecksCount < 5

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Search and Create */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          {/* Search - 2/3 width */}
          <div className="flex-[2]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your decks by name, commander, or colors..."
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

          {/* Create Button - 1/3 width */}
          <div className="flex-1">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!canCreateMore}
              className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">+</span>
              <span>Create Deck</span>
              {!canCreateMore && <span className="text-xs">(Max 5)</span>}
            </button>
          </div>
        </div>

        {/* Deck Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            {filteredDecks.length} {filteredDecks.length === 1 ? 'deck' : 'decks'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          <p className="text-gray-500 text-xs">
            {validDecksCount} / 5 decks created
          </p>
        </div>

        {/* Decks Grid */}
      {filteredDecks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onSelect={() => onSelectDeck(deck.id)}
              onEdit={() => setEditingDeck(deck)} // ADD THIS
              onDelete={() => {
                if (confirm(`Delete "${deck.name}"? This cannot be undone.`)) {
                  onDeleteDeck(deck.id)
                }
              }}
            />
          ))}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-8xl mb-6">🃏</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {searchQuery ? 'No decks found' : 'No decks yet'}
            </h3>
            <p className="text-gray-400 mb-8 text-center max-w-md">
              {searchQuery
                ? `No decks match "${searchQuery}". Try a different search term.`
                : 'Create your first Commander deck to get started!'}
            </p>
            {!searchQuery && canCreateMore && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                ✨ Create Your First Deck
              </button>
            )}
          </div>
        )}

        {/* Create Deck Modal */}
        <CreateDeckModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateDeck}
            isCreating={isCreating}
        />

        {/* ADD THIS - Edit Deck Modal */}
        {editingDeck && (
            <EditDeckModal
            deck={editingDeck}
            onClose={() => setEditingDeck(null)}
            onSave={handleEditDeck}
            isSaving={isSaving}
            />
        )}
      </div>
    </div>
  )
}