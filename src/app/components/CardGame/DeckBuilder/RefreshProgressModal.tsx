// app/components/CardGame/DeckBuilder/RefreshProgressModal.tsx
'use client'

import { X } from 'lucide-react'
import type { RefreshProgress } from '@/app/services/cardRefresh/CardRefreshService'

interface Props {
  isOpen: boolean
  progress: RefreshProgress | null
  onCancel?: () => void
}

export default function RefreshProgressModal({ isOpen, progress, onCancel }: Props) {
  if (!isOpen || !progress) return null

  const percentComplete = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  const successCount = progress.current - progress.failed.length
  const hasFailures = progress.failed.length > 0

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Refreshing Card Data</h3>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
              title="Cancel (cards already processed will be kept)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-600 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress:</span>
            <span className="text-white font-semibold">
              {progress.current} / {progress.total} cards
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Success:</span>
            <span className="text-green-400 font-semibold">
              {successCount} cards
            </span>
          </div>

          {hasFailures && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Failed:</span>
              <span className="text-red-400 font-semibold">
                {progress.failed.length} cards
              </span>
            </div>
          )}
        </div>

        {/* Current Card */}
        {progress.currentCard && (
          <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-400 mb-1">Currently processing:</p>
            <p className="text-white font-medium text-sm truncate">
              {progress.currentCard}
            </p>
          </div>
        )}

        {/* Failed Cards List (if any) */}
        {hasFailures && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
            <p className="text-red-400 text-xs font-semibold mb-2">
              ⚠️ Failed to refresh:
            </p>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {progress.failed.map((cardName, idx) => (
                <p key={idx} className="text-red-300 text-xs truncate">
                  • {cardName}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {progress.current === progress.total && (
          <div className={`mt-4 rounded-lg p-3 ${
            hasFailures 
              ? 'bg-yellow-900/20 border border-yellow-700/50' 
              : 'bg-green-900/20 border border-green-700/50'
          }`}>
            <p className={`text-sm font-semibold ${
              hasFailures ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {hasFailures 
                ? `⚠️ Completed with ${progress.failed.length} error(s)`
                : '✅ All cards refreshed successfully!'
              }
            </p>
          </div>
        )}

        {/* Estimated Time Remaining */}
        {progress.current < progress.total && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Estimated time: ~{Math.ceil((progress.total - progress.current) * 0.15)} seconds
            </p>
          </div>
        )}
      </div>
    </div>
  )
}