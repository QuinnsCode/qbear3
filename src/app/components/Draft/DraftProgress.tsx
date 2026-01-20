// app/components/Draft/DraftProgress.tsx
'use client'

import React from 'react'

interface Props {
  round: number
  pick: number
  totalRounds: number
  totalPicks: number
}

export default function DraftProgress({ round, pick, totalRounds, totalPicks }: Props) {
  const progress = ((round - 1) * totalPicks + pick) / (totalRounds * totalPicks) * 100
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span>Round {round}/{totalRounds}</span>
        <span>•</span>
        <span>Pick {pick}/{totalPicks}</span>
      </div>
      
      <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}