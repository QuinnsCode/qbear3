// LinkAccountButton.tsx - Button to link a new provider
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ProviderType } from './types'

interface Props {
  provider: ProviderType
  isLinked: boolean
  onLink: (provider: ProviderType) => Promise<void>
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

export function LinkAccountButton({ provider, isLinked, onLink }: Props) {
  const [isLinking, setIsLinking] = useState(false)
  const info = providerInfo[provider]

  const handleLink = async () => {
    setIsLinking(true)
    try {
      await onLink(provider)
    } catch (error) {
      console.error('Failed to link account:', error)
    } finally {
      setIsLinking(false)
    }
  }

  if (isLinked) {
    return null
  }

  return (
    <button
      onClick={handleLink}
      disabled={isLinking}
      className="w-full p-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800 transition-all disabled:opacity-50 group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center text-xl opacity-60 group-hover:opacity-100 transition-opacity`}>
          {info.icon}
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
            {isLinking ? 'Linking...' : `Link ${info.name}`}
          </div>
          <div className="text-sm text-slate-400">
            Add {info.name} to your account
          </div>
        </div>
        {!isLinking && (
          <Plus className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        )}
      </div>
    </button>
  )
}
