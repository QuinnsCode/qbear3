// LinkedAccountCard.tsx - Display a single linked account
'use client'

import { useState } from 'react'
import { Mail, Trash2 } from 'lucide-react'
import type { LinkedAccount, ProviderType } from './types'

interface Props {
  account: LinkedAccount
  onUnlink: (providerId: ProviderType) => Promise<void>
  canUnlink: boolean
}

const providerInfo: Record<ProviderType, { name: string; icon: string; color: string }> = {
  credential: {
    name: 'Email & Password',
    icon: '🔐',
    color: 'from-slate-600 to-slate-700'
  },
  google: {
    name: 'Google',
    icon: '🔵',
    color: 'from-blue-600 to-blue-700'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: 'from-indigo-600 to-purple-600'
  }
}

export function LinkedAccountCard({ account, onUnlink, canUnlink }: Props) {
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const info = providerInfo[account.providerId]

  const handleUnlink = async () => {
    if (!canUnlink) return

    setIsUnlinking(true)
    try {
      await onUnlink(account.providerId)
    } catch (error) {
      console.error('Failed to unlink account:', error)
    } finally {
      setIsUnlinking(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-4 hover:border-slate-500 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center text-2xl`}>
            {info.icon}
          </div>
          <div>
            <div className="font-semibold text-white">{info.name}</div>
            {account.email && (
              <div className="text-sm text-slate-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {account.email}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1">
              Connected {new Date(account.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {canUnlink && (
          <div>
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-3 py-2 text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg border border-red-700/50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Unlink
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUnlinking ? 'Unlinking...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-2 text-sm bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {!canUnlink && (
          <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-2 rounded-lg">
            Last account
          </div>
        )}
      </div>
    </div>
  )
}
