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
  
  const [config, setConfig] = useState({
    packSize: DEFAULT_DRAFT_CONFIG.packSize,
    packsPerPlayer: DEFAULT_DRAFT_CONFIG.packsPerPlayer,
    pickCount: DEFAULT_DRAFT_CONFIG.pickCount,
    aiCount: DEFAULT_DRAFT_CONFIG.playerCount
  })

  const handleStart = async () => {
    setLoading(true)
    setError(null)

    console.log('🎴 [Form] Starting draft with:', { userId, userName, isGuest })

    try {
        const result = await createDraft({
            config,
            aiCount: config.aiCount,
            userId,
            userName
        })
        
        console.log('🎴 [Form] createDraft result:', result)
        
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
            console.log('🍪 [Form] Cookie set before redirect:', cookieString)
            
            // Small delay to ensure cookie is set
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        console.log('✅ [Form] Redirecting to:', `/draft/${result.draftId}`)
        window.location.href = `/draft/${result.draftId}`
        
        } catch (err: any) {
            console.error('❌ [Form] Error:', err)
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
          <h2 className="text-2xl font-bold text-white mb-4">Configuration</h2>
          <p className="text-slate-400">
            Drafting with: <span className="text-white font-semibold">MTGO Vintage Cube</span> (540 cards)
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
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
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Starting Draft...' : 'Start Draft'}
        </button>
      </div>
    </div>
  )
}