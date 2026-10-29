// app/components/Draft/NewDraftForm.tsx
'use client'

import React, { useState } from 'react'
import { DEFAULT_DRAFT_CONFIG } from '@/app/types/Draft'
import { createDraft } from '@/app/serverActions/draft/createDraft'

interface Props {
  userId?: string
  userName?: string
  isGuest?: boolean
}

export default function NewDraftForm({ userId, userName, isGuest }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const [config, setConfig] = useState({
    packSize: DEFAULT_DRAFT_CONFIG.packSize,
    packsPerPlayer: DEFAULT_DRAFT_CONFIG.packsPerPlayer,
    pickCount: DEFAULT_DRAFT_CONFIG.pickCount,
    aiCount: DEFAULT_DRAFT_CONFIG.playerCount
  })

  const handleStart = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await createDraft({
        config,
        aiCount: config.aiCount,
        userId,
        userName
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // ✅ CRITICAL: Set cookie BEFORE redirecting (for guests)
      if (isGuest && result.userId && result.draftId) {
        const cookieName = `draft_user_${result.draftId}`
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 7)
        const cookieString = `${cookieName}=${result.userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`

        document.cookie = cookieString

        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      window.location.href = `/draft/${result.draftId}`
    } catch (err: any) {
      setError(err.message || 'Failed to start draft')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {isGuest && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-amber-100 text-sm font-semibold mb-1">
                Drafting as Guest
              </p>
              <p className="text-amber-200/80 text-xs mb-2">
                Your draft won't be saved permanently. You can export your deck as text at the end.
              </p>
              <div className="flex gap-2">
                <a
                  href="/login?redirect=/draft/new"
                  className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors font-medium"
                >
                  Log In to Save
                </a>
                <a
                  href="/signup?redirect=/draft/new"
                  className="text-xs px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded transition-colors font-medium"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">MTGO Vintage Cube</h2>
          <p className="text-slate-400">540 cards · {config.aiCount + 1} players</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-xl transition-colors shadow-lg"
        >
          {loading ? 'Starting Draft...' : 'Start Draft'}
        </button>

        {/* Config toggle */}
        <button
          type="button"
          onClick={() => setShowConfig(v => !v)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {showConfig ? 'Hide configuration' : 'Configuration'}
        </button>

        {showConfig && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pack Size
              </label>
              <input
                type="number"
                min="8"
                max="20"
                value={config.packSize}
                onChange={e => setConfig({ ...config, packSize: parseInt(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Packs Per Player
              </label>
              <input
                type="number"
                min="2"
                max="5"
                value={config.packsPerPlayer}
                onChange={e => setConfig({ ...config, packsPerPlayer: parseInt(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pick Count
              </label>
              <select
                value={config.pickCount}
                onChange={e => setConfig({ ...config, pickCount: parseInt(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="1">1 card per pick</option>
                <option value="2">2 cards per pick</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                AI Opponents
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={config.aiCount}
                onChange={e => setConfig({ ...config, aiCount: parseInt(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Total players: {config.aiCount + 1}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}