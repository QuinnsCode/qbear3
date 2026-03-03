// app/components/DeckBuilder/CreateDraftDeckModal.tsx
'use client'

import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreate: (deckList: string, deckName: string, draftId?: string) => Promise<void>
  isCreating: boolean
}

export default function CreateDraftDeckModal({ isOpen, onClose, onCreate, isCreating }: Props) {
  const [deckName, setDeckName] = useState('')
  const [deckList, setDeckList] = useState('')
  const [draftId, setDraftId] = useState('')
  const [importMode, setImportMode] = useState<'id' | 'text'>('id')
  const [errors, setErrors] = useState<string[]>([])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    // Validation
    const newErrors: string[] = []
    if (!deckName.trim()) {
      newErrors.push('Deck name is required')
    }

    if (importMode === 'id') {
      if (!draftId.trim()) {
        newErrors.push('Draft ID is required')
      }
    } else {
      if (!deckList.trim()) {
        newErrors.push('Deck list is required')
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onCreate(deckList, deckName, draftId || undefined)
      // Reset form on success
      setDeckName('')
      setDeckList('')
      setDraftId('')
      setErrors([])
      setImportMode('id')
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to create draft deck'])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Import Draft Deck</h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-white/80 hover:text-white text-3xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Deck Name */}
          <div>
            <label htmlFor="deckName" className="block text-white font-semibold mb-2">
              Deck Name
            </label>
            <input
              id="deckName"
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="My Draft Deck - Nov 2024"
              disabled={isCreating}
              className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
            />
          </div>

          {/* Import Mode Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setImportMode('id')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                importMode === 'id'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              📋 Draft ID (Quick)
            </button>
            <button
              type="button"
              onClick={() => setImportMode('text')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                importMode === 'text'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              📄 Text File (Fallback)
            </button>
          </div>

          {/* Draft ID Mode */}
          {importMode === 'id' && (
            <div>
              <label htmlFor="draftId" className="block text-white font-semibold mb-2">
                Draft ID
              </label>
              <input
                id="draftId"
                type="text"
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                placeholder="draft-1772503803522-1iij1nu"
                disabled={isCreating}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 font-mono"
              />
              <p className="text-gray-400 text-sm mt-2">
                💡 <strong>Find your Draft ID</strong> in the text file header:
              </p>
              <div className="bg-slate-900 rounded p-2 mt-1 text-xs text-gray-400 font-mono">
                # Draft Pool - Guest<br/>
                # Draft ID: <span className="text-green-400">draft-1772503803522-1iij1nu</span> ← Copy this
              </div>
            </div>
          )}

          {/* Text File Mode */}
          {importMode === 'text' && (
            <div>
              <label htmlFor="deckList" className="block text-white font-semibold mb-2">
                Draft Export (Full Text)
              </label>
              <textarea
                id="deckList"
                value={deckList}
                onChange={(e) => setDeckList(e.target.value)}
                placeholder={`Paste your full draft export file:

# Draft Pool - Guest
# Draft ID: draft-1772503803522-1iij1nu
# Main Deck: 42
# Sideboard: 0
# Total Cards: 42
# Date: 3/2/2026

2 Lightning Bolt
1 Counterspell
3 Island
4 Mountain
...`}
                disabled={isCreating}
                rows={15}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono text-sm disabled:opacity-50 resize-none"
              />
              <p className="text-gray-400 text-sm mt-2">
                Use this if Draft ID lookup fails or KV storage expired
              </p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <p className="text-red-300 font-semibold mb-2">⚠️ Errors:</p>
              <ul className="list-disc list-inside text-red-200 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Import Draft Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
