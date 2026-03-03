// app/components/Draft/DraftSettingsModal.tsx
'use client'

import { useState } from 'react'
import { X, Copy, Check, AlertTriangle, Eye, EyeOff, Users, Lock } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  draftId: string
  isCreator: boolean
  currentPermissions: {
    isPublic: boolean
    allowSpectators: boolean
    spectatorList: string[]
  }
  onUpdate: (permissions: {
    isPublic?: boolean
    allowSpectators?: boolean
    spectatorList?: string[]
  }) => Promise<void>
}

export default function DraftSettingsModal({
  isOpen,
  onClose,
  draftId,
  isCreator,
  currentPermissions,
  onUpdate
}: Props) {
  const [isPublic, setIsPublic] = useState(currentPermissions.isPublic)
  const [allowSpectators, setAllowSpectators] = useState(currentPermissions.allowSpectators)
  const [spectatorList, setSpectatorList] = useState<string[]>(currentPermissions.spectatorList)
  const [newSpectatorId, setNewSpectatorId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const draftUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/draft/${draftId}`
    : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(draftUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleAddSpectator = () => {
    const trimmed = newSpectatorId.trim()
    if (trimmed && !spectatorList.includes(trimmed)) {
      setSpectatorList([...spectatorList, trimmed])
      setNewSpectatorId('')
    }
  }

  const handleRemoveSpectator = (userId: string) => {
    setSpectatorList(spectatorList.filter(id => id !== userId))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate({
        isPublic,
        allowSpectators,
        spectatorList
      })
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Draft Settings</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Creator-only notice */}
          {!isCreator && (
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-slate-300 font-semibold">View Only</p>
                <p className="text-slate-400 text-sm">Only the draft creator can change these settings.</p>
              </div>
            </div>
          )}

          {/* Public/Private Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Eye className="w-5 h-5 text-green-400" />
                ) : (
                  <Lock className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <h3 className="text-white font-semibold">
                    {isPublic ? 'Public Spectating' : 'Private Spectating'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {isPublic
                      ? 'Anyone with the link can spectate (YouTube "Public")'
                      : 'Only approved users can spectate (YouTube "Unlisted")'
                    }
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Note: Only you can draft/make picks regardless of this setting
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={!isCreator}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>

            {/* Warning for public spectating */}
            {isPublic && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-200 font-semibold">Stream Sniping Warning</p>
                  <p className="text-yellow-300/80 text-sm mt-1">
                    Anyone with the link can spectate your picks in real-time. If you're streaming, consider using private spectating to control who can watch.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Allow Spectators Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-white font-semibold">Allow Spectators</h3>
                  <p className="text-slate-400 text-sm">
                    Let others watch the draft without making picks
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSpectators}
                  onChange={(e) => setAllowSpectators(e.target.checked)}
                  disabled={!isCreator}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
          </div>

          {/* Invite Link */}
          {allowSpectators && (
            <div className="space-y-2">
              <label className="text-white font-semibold text-sm">Draft Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftUrl}
                  readOnly
                  className="flex-1 bg-slate-900 text-slate-300 px-4 py-2 rounded-lg border border-slate-600 font-mono text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-slate-400 text-xs">
                Share this link with others to let them spectate
                {!isPublic && ' (they must be on the approved list below)'}
              </p>
            </div>
          )}

          {/* Spectator List (only for protected drafts) */}
          {!isPublic && allowSpectators && (
            <div className="space-y-3">
              <label className="text-white font-semibold text-sm">Approved Spectators</label>
              <p className="text-slate-400 text-sm">
                Add user IDs who can spectate this protected draft
              </p>

              {/* Add spectator input */}
              {isCreator && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpectatorId}
                    onChange={(e) => setNewSpectatorId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSpectator()}
                    placeholder="user-123 or email@example.com"
                    className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                  <button
                    onClick={handleAddSpectator}
                    disabled={!newSpectatorId.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Spectator list */}
              {spectatorList.length > 0 ? (
                <div className="space-y-2">
                  {spectatorList.map((userId) => (
                    <div
                      key={userId}
                      className="flex items-center justify-between bg-slate-900 px-4 py-2 rounded-lg"
                    >
                      <span className="text-slate-300 font-mono text-sm">{userId}</span>
                      {isCreator && (
                        <button
                          onClick={() => handleRemoveSpectator(userId)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No approved spectators yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {isCreator && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
