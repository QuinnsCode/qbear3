// app/components/Draft/NewDraftForm.tsx
'use client'

import React, { useState } from 'react'
import { DEFAULT_DRAFT_CONFIG } from '@/app/types/Draft'
import { createDraft } from '@/app/serverActions/draft/createDraft'

interface Props {
  userId?: string
  userName?: string
}

export default function NewDraftForm({ userId, userName }: Props) {
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
      
      window.location.href = `/draft/${result.draftId}`
      
    } catch (err: any) {
      console.error('Error starting draft:', err)
      setError(err.message || 'Failed to start draft')
      setLoading(false)
    }
  }
  
  return (
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
  )
}