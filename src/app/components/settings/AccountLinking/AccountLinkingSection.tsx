// AccountLinkingSection.tsx - Main account linking component
'use client'

import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { LinkedAccountCard } from './LinkedAccountCard'
import { LinkAccountButton } from './LinkAccountButton'
import type { LinkedAccount, ProviderType } from './types'

function isProviderType(id: string): id is ProviderType {
  return id === 'credential' || id === 'google' || id === 'discord'
}

export function AccountLinkingSection() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setIsLoading(true)
      const session = await authClient.getSession()
      const user = session.data?.user

      if (!user) {
        setError('Not logged in')
        return
      }

      const linked = await authClient.listAccounts()
      if (linked.error || !linked.data) {
        setError(linked.error?.message ?? 'Failed to load accounts')
        return
      }

      setAccounts(linked.data.flatMap((account) =>
        isProviderType(account.providerId)
          ? [{
              id: account.id,
              providerId: account.providerId,
              accountId: account.accountId,
              email: user.email,
              createdAt: new Date(account.createdAt),
            }]
          : []
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccount = async (provider: ProviderType) => {
    try {
      setError(null)

      if (provider === 'credential') {
        // For email/password, redirect to password setup page
        window.location.href = '/settings/set-password'
        return
      }

      // For OAuth providers (Google, Discord)
      await authClient.linkSocial({
        provider: provider,
        callbackURL: '/'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account')
    }
  }

  const handleUnlinkAccount = async (providerId: ProviderType) => {
    try {
      setError(null)
      const account = accounts.find(a => a.providerId === providerId)
      if (!account) return
      const res = await authClient.unlinkAccount({ accountId: account.id })
      if (res.error) {
        setError(res.error.message ?? 'Failed to unlink account')
        return
      }

      // Reload accounts after unlinking
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink account')
    }
  }

  const isLinked = (provider: ProviderType) => {
    return accounts.some(account => account.providerId === provider)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-400">Loading accounts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Connected Accounts</h3>
        <p className="text-sm text-slate-400">
          Link multiple sign-in methods to your account for easier access
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {/* Linked Accounts */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-300 mb-2">Active Connections</div>
        {accounts.length === 0 ? (
          <div className="bg-slate-800/50 rounded-lg p-6 text-center text-slate-400">
            No accounts linked yet
          </div>
        ) : (
          accounts.map(account => (
            <LinkedAccountCard
              key={account.id}
              account={account}
              onUnlink={handleUnlinkAccount}
              canUnlink={accounts.length > 1}
            />
          ))
        )}
      </div>

      {/* Available to Link */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-300 mb-2">Add Connection</div>
        <LinkAccountButton
          provider="google"
          isLinked={isLinked('google')}
          onLink={handleLinkAccount}
        />
        <LinkAccountButton
          provider="discord"
          isLinked={isLinked('discord')}
          onLink={handleLinkAccount}
        />
        <LinkAccountButton
          provider="credential"
          isLinked={isLinked('credential')}
          onLink={handleLinkAccount}
        />
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <div className="text-sm text-blue-300">
          <div className="font-semibold mb-1">💡 Account Linking</div>
          <ul className="space-y-1 text-xs text-blue-400">
            <li>• Link multiple sign-in methods to the same account</li>
            <li>• Sign in with any linked provider</li>
            <li>• You must keep at least one method active</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
