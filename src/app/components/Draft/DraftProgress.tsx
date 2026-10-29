// app/components/Draft/DraftProgress.tsx
'use client'

import React from 'react'

interface Props {
  round: number        // 1-based current pack
  pick: number         // 1-based current pick
  totalRounds: number
  totalPicks: number
  compact?: boolean
}

/**
 * Segmented pack tracker: one track per pack, filled pick by pick.
 */
export default function DraftProgress({ round, pick, totalRounds, totalPicks, compact = false }: Props) {
  const overall = Math.min(100, (((round - 1) * totalPicks + (pick - 1)) / (totalRounds * totalPicks)) * 100)

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'} aria-label={`Pack ${round} of ${totalRounds}, pick ${pick} of ${totalPicks}`}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
        <span className="text-slate-200">Pack {round}<span className="text-slate-500">/{totalRounds}</span></span>
        <span className="h-1 w-1 rounded-full bg-slate-600" />
        <span className="text-slate-200">Pick {pick}<span className="text-slate-500">/{totalPicks}</span></span>
        <span className="ml-auto tabular-nums text-slate-500">{Math.round(overall)}%</span>
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: totalRounds }).map((_, r) => {
          const packNo = r + 1
          const done = packNo < round
          const active = packNo === round
          const fill = done ? 100 : active ? ((pick - 1) / totalPicks) * 100 : 0
          return (
            <div
              key={r}
              className={`relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800 ring-1 ring-inset ring-white/5`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  done ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-300 to-orange-400'
                }`}
                style={{ width: `${fill}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
