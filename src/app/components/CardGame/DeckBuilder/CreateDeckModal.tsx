// app/components/DeckBuilder/CreateDeckModal.tsx
'use client'

import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreate: (deckList: string, deckName: string) => Promise<void>
  isCreating: boolean
}

export default function CreateDeckModal({ isOpen, onClose, onCreate, isCreating }: Props) {
  const [deckName, setDeckName] = useState('')
  const [deckList, setDeckList] = useState('')
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
    if (!deckList.trim()) {
      newErrors.push('Deck list is required')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onCreate(deckList, deckName)
      // Reset form on success
      setDeckName('')
      setDeckList('')
      setErrors([])
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to create deck'])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Create New Deck</h2>
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
              placeholder="My Awesome Commander Deck"
              disabled={isCreating}
              className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          {/* Deck List */}
          <div>
            <label htmlFor="deckList" className="block text-white font-semibold mb-2">
              Deck List
            </label>
            <textarea
              id="deckList"
              value={deckList}
              onChange={(e) => setDeckList(e.target.value)}
              placeholder={`Enter your deck list (one card per line):

Commander: Atraxa, Praetors' Voice
1 Sol Ring
1 Command Tower
4x Forest
3 Island
...

Formats supported:
• "1 Card Name" or "1x Card Name"
• "Card Name" (assumes quantity 1)
• Commander: on first line or auto-detected`}
              rows={15}
              disabled={isCreating}
              className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm resize-none disabled:opacity-50"
            />
            <p className="text-gray-400 text-xs mt-2">
              Expected: 100 cards total (Commander format)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </>
              ) : (
                '✨ Create Deck'
              )}
            </button>
          </div>


          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
              <h3 className="text-red-400 font-semibold mb-2">⚠️ Errors:</h3>
              <ul className="text-red-300 text-sm space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}