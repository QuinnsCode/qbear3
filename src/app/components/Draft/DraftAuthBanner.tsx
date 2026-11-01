// app/components/Draft/DraftAuthBanner.tsx
'use client'

import { useState } from 'react'
import { Download, Home, Info, LogIn, UserPlus } from 'lucide-react'

interface DraftAuthBannerProps {
  isLoggedIn: boolean
  userName: string
  onExportDeck: () => void
}

export default function DraftAuthBanner({ isLoggedIn, userName, onExportDeck }: DraftAuthBannerProps) {
  const [isExporting, setIsExporting] = useState(false)

  if (isLoggedIn) {
    return (
      <div className="border-b border-white/5 bg-slate-950/60 px-4 py-1.5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
          <span className="text-slate-400">
            Drafting as <span className="font-semibold text-slate-100">{userName}</span>
          </span>
          <a className="inline-flex items-center gap-1.5 text-slate-400 transition-colors hover:text-white" href="/sanctum">
            <Home className="h-3.5 w-3.5" />
            Sanctum
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-950/60 via-slate-950/60 to-slate-950/60 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-amber-100/90">
          <Info className="h-4 w-4 text-amber-300" />
          <span>Guest draft. Export your picks or sign in with eqosys to save them.</span>
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/10 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
          <a
            href="/user/login?redirect=/draft/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300"
          >
            <LogIn className="h-3.5 w-3.5" />
            Log in
          </a>
          <a
            href="/user/signup?redirect=/draft/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Sign up
          </a>
        </div>
      </div>
    </div>
  )
}
