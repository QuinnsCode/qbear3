// pages/settings/SetPasswordPage.tsx
'use client'

import { useState } from 'react'
import { setUserPassword } from '@/app/serverActions/user/setPassword'
import { Key, ArrowLeft } from 'lucide-react'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await setUserPassword(password)

      if (!result.success) {
        setError(result.error || 'Failed to set password')
        return
      }

      setSuccess(true)

      // Redirect back to settings after 2 seconds
      setTimeout(() => {
        window.location.href = '/sanctum?section=settings'
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-700 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg border-2 border-green-600 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-2xl font-bold text-white mb-2">Password Set!</div>
          <div className="text-slate-400">You can now sign in with email and password</div>
          <div className="text-sm text-slate-500 mt-4">Redirecting to settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <a
          href="/sanctum?section=settings"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </a>

        {/* Card */}
        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Set Password</h1>
            <p className="text-slate-400">Add email & password sign-in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="text-xs text-slate-500 mt-1">
                Must be at least 8 characters
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
            <div className="text-xs text-blue-300">
              <div className="font-semibold mb-1">ℹ️ What happens next?</div>
              <ul className="space-y-1">
                <li>• You'll be able to sign in with your email and this password</li>
                <li>• Your existing sign-in methods will still work</li>
                <li>• You can change this password anytime in settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
