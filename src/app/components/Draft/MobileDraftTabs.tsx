// app/components/Draft/MobileDraftTabs.tsx
'use client'

import { useState } from 'react'

export type DraftTab = 'pack' | 'pool'

interface MobileDraftTabsProps {
  activeTab: DraftTab
  onTabChange: (tab: DraftTab) => void
  poolCount: number
}

export default function MobileDraftTabs({ 
  activeTab, 
  onTabChange, 
  poolCount 
}: MobileDraftTabsProps) {
  return (
    <div className="flex border-b border-slate-700 bg-slate-800">
      <button
        onClick={() => onTabChange('pack')}
        className={`flex-1 py-3 px-4 font-semibold transition-colors relative ${
          activeTab === 'pack'
            ? 'text-blue-400 bg-slate-900'
            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
        }`}
      >
        📦 Pack
        {activeTab === 'pack' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
        )}
      </button>
      
      <button
        onClick={() => onTabChange('pool')}
        className={`flex-1 py-3 px-4 font-semibold transition-colors relative ${
          activeTab === 'pool'
            ? 'text-blue-400 bg-slate-900'
            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
        }`}
      >
        🎴 Pool ({poolCount})
        {activeTab === 'pool' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
        )}
      </button>
    </div>
  )
}