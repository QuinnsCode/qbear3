// app/components/Draft/MobileDraftTabs.tsx
'use client'

import { Layers, Package } from 'lucide-react'

export type DraftTab = 'pack' | 'pool'

interface MobileDraftTabsProps {
  activeTab: DraftTab
  onTabChange: (tab: DraftTab) => void
  poolCount: number
  sideboardCount?: number
  packCount?: number
}

export default function MobileDraftTabs({
  activeTab,
  onTabChange,
  poolCount,
  sideboardCount = 0,
  packCount,
}: MobileDraftTabsProps) {
  const tabs: Array<{ id: DraftTab; label: string; icon: typeof Layers; count?: number }> = [
    { id: 'pack', label: 'Pack', icon: Layers, count: packCount },
    { id: 'pool', label: 'Pool', icon: Package, count: poolCount },
  ]

  return (
    <div className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 px-3 py-2 backdrop-blur">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900/80 p-1 ring-1 ring-white/5">
        {tabs.map(({ id, label, icon: Icon, count }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                active ? 'bg-slate-800 text-white shadow ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : ''}`} />
              {label}
              {typeof count === 'number' && (
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-amber-400/15 text-amber-200' : 'bg-white/5 text-slate-400'}`}>
                  {count}
                </span>
              )}
              {id === 'pool' && sideboardCount > 0 && (
                <span className="rounded-full bg-fuchsia-500/15 px-1.5 text-[11px] text-fuchsia-300">+{sideboardCount}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
