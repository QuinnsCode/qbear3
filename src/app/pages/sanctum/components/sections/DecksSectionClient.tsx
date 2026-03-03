// app/pages/sanctum/components/sections/DecksSectionClient.tsx
'use client'

import { useState } from 'react'
import { Package, Trash2, X } from 'lucide-react'
import type { Deck } from '@/app/types/Deck'
import { deleteDeck } from '@/app/serverActions/deckBuilder/deckActions'

interface Props {
  decks: Deck[]
  userId: string
  currentTier: string
  maxDecks: number
  atLimit: boolean
}

export function DecksSectionClient({ decks, userId, currentTier, maxDecks, atLimit }: Props) {
  const [localDecks, setLocalDecks] = useState(decks)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const draftDecks = localDecks.filter(deck => deck.format?.toLowerCase() === 'draft')
  const constructedDecks = localDecks.filter(deck => deck.format?.toLowerCase() !== 'draft')

  const handleDelete = async (deckId: string) => {
    setDeletingDeckId(deckId)

    try {
      const result = await deleteDeck(userId, deckId)

      if (result.success) {
        setLocalDecks(prev => prev.filter(d => d.id !== deckId))
        setConfirmDelete(null)
      } else {
        alert(result.error || 'Failed to delete deck')
      }
    } catch (error) {
      console.error('Error deleting deck:', error)
      alert('Failed to delete deck')
    } finally {
      setDeletingDeckId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 md:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Package className="w-8 h-8 md:w-12 md:h-12 text-white flex-shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">My Decks</h1>
              <p className="text-sm md:text-base text-blue-100 mt-1">
                {constructedDecks.length} constructed · {draftDecks.length} draft
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs md:text-sm text-blue-100">Deck Limit</div>
            <div className="text-xl md:text-2xl font-bold text-white">
              {localDecks.length} / {maxDecks}
            </div>
          </div>
        </div>
      </div>

      {/* Constructed Decks */}
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Constructed Decks</h2>
          <span className="text-sm bg-slate-700 text-gray-300 px-3 py-1 rounded-full border border-slate-600">
            {constructedDecks.length}
          </span>
        </div>

        {constructedDecks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🃏</div>
            <div className="text-xl font-semibold text-gray-200 mb-2">No Constructed Decks Yet</div>
            <div className="text-gray-400 mb-4">Create your first Commander deck</div>
            <a
              href="/deckBuilder"
              className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg"
            >
              Create Deck
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
              {constructedDecks.map(deck => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onDelete={() => setConfirmDelete(deck.id)}
                  isDeleting={deletingDeckId === deck.id}
                />
              ))}
            </div>

            {!atLimit && (
              <a
                href="/deckBuilder"
                className="flex items-center justify-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold border-2 border-dashed border-slate-500 hover:border-blue-500 transition-all"
              >
                <span className="text-2xl">➕</span>
                <span>Create New Deck</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Draft Decks */}
      {draftDecks.length > 0 && (
        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Draft Decks</h2>
            <span className="text-sm bg-slate-700 text-gray-300 px-3 py-1 rounded-full border border-slate-600">
              {draftDecks.length}
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
            {draftDecks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onDelete={() => setConfirmDelete(deck.id)}
                isDeleting={deletingDeckId === deck.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Limit Warning */}
      {atLimit && currentTier !== 'pro' && (
        <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-xl font-bold text-red-400 mb-2">Deck Limit Reached</div>
            <div className="text-red-300 mb-4">
              You have {maxDecks} {maxDecks === 1 ? 'deck' : 'decks'} (maximum).
              Delete a deck to create a new one, or upgrade your plan.
            </div>
            {currentTier === 'free' && (
              <a
                href="/pricing"
                className="inline-block px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
              >
                Upgrade to Starter (5 decks)
              </a>
            )}
            {currentTier === 'starter' && (
              <a
                href="/pricing"
                className="inline-block px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
              >
                Upgrade to Pro (12 decks)
              </a>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <DeleteConfirmModal
          deckName={localDecks.find(d => d.id === confirmDelete)?.name || 'this deck'}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          isDeleting={deletingDeckId === confirmDelete}
        />
      )}
    </div>
  )
}

function DeckCard({ deck, onDelete, isDeleting }: {
  deck: Deck
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <div className="bg-slate-700/70 rounded-lg border border-slate-600 p-4 hover:border-blue-500 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-lg font-bold text-white block truncate">{deck.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-300 rounded-full text-xs font-semibold">
            {deck?.format || 'Commander'}
          </span>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete deck"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {deck?.commanders && deck.commanders.length > 0 && (
        <div className="text-sm text-gray-300 mb-3 font-medium">
          ⚔️ {deck.commanders.join(' + ')}
        </div>
      )}

      <div className="text-sm text-gray-400 mb-3">
        Created {new Date(deck.createdAt).toLocaleDateString()}
      </div>

      <div className="flex justify-between items-center gap-2">
        <span className="text-gray-300 text-sm font-medium flex items-center gap-2">
          <span>{deck.totalCards} cards</span>
          {deck.colors && deck.colors.length > 0 && (
            <span>
              {deck.colors.map(color => {
                const colorEmojis: Record<string, string> = {
                  W: '⚪', U: '🔵', B: '⚫', R: '🔴', G: '🟢'
                }
                return colorEmojis[color] || ''
              }).join('')}
            </span>
          )}
        </span>
        <a
          href={deck.format === 'draft' ? `/draft/deck/${deck.id}` : `/deckBuilder/${deck.id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          Edit →
        </a>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ deckName, onConfirm, onCancel, isDeleting }: {
  deckName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onCancel}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-800 rounded-lg border-2 border-red-500 shadow-2xl z-50 p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">Delete Deck?</h2>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          Are you sure you want to delete <strong className="text-white">"{deckName}"</strong>?
          This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}
