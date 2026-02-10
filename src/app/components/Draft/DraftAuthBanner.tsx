// app/components/Draft/DraftAuthBanner.tsx
'use client'

import { useState } from 'react'

interface DraftAuthBannerProps {
  isLoggedIn: boolean
  userName: string
  onExportDeck: () => void
}

export default function DraftAuthBanner({ 
  isLoggedIn, 
  userName,
  onExportDeck 
}: DraftAuthBannerProps) {
  const [isExporting, setIsExporting] = useState(false)

  if (isLoggedIn) {
    return (
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-slate-300">
            Playing as <span className="font-semibold text-white">{userName}</span>
          </span>
          <span className="text-sm text-slate-300"><a className='text-white' href='/sanctum'>Home</a></span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-100">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>You're playing as a guest. Your draft won't be saved.</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setIsExporting(true)
              try {
                await onExportDeck()
              } finally {
                setIsExporting(false)
              }
            }}
            disabled={isExporting}
            className="px-3 py-1.5 text-sm font-medium text-amber-100 border border-amber-600 hover:bg-amber-800/30 rounded transition-colors disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export Deck'}
          </button>
          
          <a
            href="/login?redirect=/draft"
            className="px-3 py-1.5 text-sm font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 rounded transition-colors"
          >
            Log In
          </a>
          
          <a
            href="/signup?redirect=/draft"
            className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded transition-colors"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}