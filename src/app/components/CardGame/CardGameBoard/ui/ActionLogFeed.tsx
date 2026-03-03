'use client'

import { useEffect, useRef } from 'react'
import type { CardGameState, GameEvent } from '@/app/services/cardGame/CardGameState'

interface Props {
  gameState: CardGameState
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  return `${diffHr}h ago`
}

function EntryRow({ entry, color }: { entry: GameEvent; color: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-slate-700/40 transition-colors">
      {/* Player color dot */}
      <span
        className="mt-1 w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-white text-xs">{entry.playerName}</span>
        <span className="text-slate-300 text-xs"> {entry.message}</span>
      </div>
      {/* Timestamp */}
      <span className="text-slate-500 text-[10px] shrink-0 mt-0.5 tabular-nums">
        {formatTimeAgo(entry.timestamp)}
      </span>
    </div>
  )
}

export function ActionLogFeed({ gameState }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const log = gameState.actionLog ?? []

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length])

  return (
    <div className="flex flex-col h-full bg-slate-800">
      <div className="flex-1 overflow-y-auto py-1">
        {log.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <p className="text-slate-500 text-xs leading-relaxed">
              No actions yet — game events will appear here
            </p>
          </div>
        ) : (
          <>
            {log.map((entry) => {
              const color =
                gameState.players.find((p) => p.id === entry.playerId)?.cursorColor ?? '#94a3b8'
              return <EntryRow key={entry.id} entry={entry} color={color} />
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
