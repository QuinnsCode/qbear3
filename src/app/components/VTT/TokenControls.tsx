// src/app/components/VTT/TokenControls.tsx

'use client'

import { useState, useEffect } from 'react'
import type { Token, VTTAction } from '@/app/services/vtt/VTTGameState'

/**
 * TokenControls - Context menu for token actions
 *
 * Right-click on token to open menu:
 * - Edit name
 * - Edit stats (HP, AC, etc.)
 * - Change color
 * - Change visibility (all, GM, specific players)
 * - Lock/unlock movement
 * - Delete token
 *
 * Permissions:
 * - Owner or GM can edit
 * - Only GM can lock/unlock or change visibility
 */

interface TokenControlsProps {
  token: Token | null
  position: { x: number; y: number } | null
  isGM: boolean
  playerId: string
  sendAction: (action: Omit<VTTAction, 'playerId'>) => void
  onClose: () => void
}

export function TokenControls({
  token,
  position,
  isGM,
  playerId,
  sendAction,
  onClose
}: TokenControlsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedColor, setEditedColor] = useState('')
  const [editedStats, setEditedStats] = useState<Record<string, any>>({})

  useEffect(() => {
    if (token) {
      setEditedName(token.name)
      setEditedColor(token.color || '#808080')
      setEditedStats(token.stats || {})
    }
  }, [token])

  if (!token || !position) return null

  const isOwner = token.ownerId === playerId
  const canEdit = isGM || isOwner
  const canDelete = isGM || isOwner
  const canLock = isGM
  const canChangeVisibility = isGM

  const handleUpdateToken = () => {
    sendAction({
      type: 'update_token',
      data: {
        tokenId: token.instanceId,
        name: editedName,
        color: editedColor,
        stats: editedStats
      }
    })
    setIsEditing(false)
    onClose()
  }

  const handleDeleteToken = () => {
    if (confirm(`Delete token "${token.name}"?`)) {
      sendAction({
        type: 'delete_token',
        data: {
          tokenId: token.instanceId
        }
      })
      onClose()
    }
  }

  const handleToggleLock = () => {
    sendAction({
      type: 'toggle_token_locked',
      data: {
        tokenId: token.instanceId
      }
    })
    onClose()
  }

  const handleToggleHidden = () => {
    sendAction({
      type: 'toggle_token_hidden',
      data: {
        tokenId: token.instanceId
      }
    })
    onClose()
  }

  const handleChangeVisibility = (visibility: 'all' | 'gm') => {
    sendAction({
      type: 'set_token_visibility',
      data: {
        tokenId: token.instanceId,
        visibleTo: visibility
      }
    })
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        className="fixed z-50 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-2xl min-w-[250px] max-w-[350px]"
        style={{ left: position.x, top: position.y }}
      >
        {!isEditing ? (
          // Menu options
          <div className="p-2">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-600 mb-2">
              <div className="font-bold text-white">{token.name}</div>
              <div className="text-xs text-gray-400 capitalize">{token.type}</div>
            </div>

            {/* Edit option */}
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-3 py-2 text-left rounded hover:bg-slate-700 text-white text-sm transition-colors"
              >
                ✏️ Edit Token
              </button>
            )}

            {/* Lock/Unlock */}
            {canLock && (
              <button
                onClick={handleToggleLock}
                className="w-full px-3 py-2 text-left rounded hover:bg-slate-700 text-white text-sm transition-colors"
              >
                {token.isLocked ? '🔓 Unlock' : '🔒 Lock'} Movement
              </button>
            )}

            {/* Hide/Show */}
            {canChangeVisibility && (
              <button
                onClick={handleToggleHidden}
                className="w-full px-3 py-2 text-left rounded hover:bg-slate-700 text-white text-sm transition-colors"
              >
                {token.isHidden ? '👁️ Show' : '🙈 Hide'} from Players
              </button>
            )}

            {/* Visibility options */}
            {canChangeVisibility && !token.isHidden && (
              <div className="mt-2 pt-2 border-t border-slate-600">
                <div className="text-xs text-gray-400 px-3 py-1">Visible To:</div>
                <button
                  onClick={() => handleChangeVisibility('all')}
                  className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                    token.visibleTo === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-700 text-white'
                  }`}
                >
                  👥 All Players
                </button>
                <button
                  onClick={() => handleChangeVisibility('gm')}
                  className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                    token.visibleTo === 'gm'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-700 text-white'
                  }`}
                >
                  👑 GM Only
                </button>
              </div>
            )}

            {/* Delete option */}
            {canDelete && (
              <button
                onClick={handleDeleteToken}
                className="w-full px-3 py-2 text-left rounded hover:bg-red-700 text-red-400 text-sm transition-colors mt-2 border-t border-slate-600 pt-2"
              >
                🗑️ Delete Token
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full px-3 py-2 text-center rounded hover:bg-slate-700 text-gray-400 text-sm transition-colors mt-2"
            >
              Close
            </button>
          </div>
        ) : (
          // Edit form
          <div className="p-4">
            <div className="font-bold text-white mb-4">Edit Token</div>

            {/* Name */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Color */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 block mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editedColor}
                  onChange={(e) => setEditedColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={editedColor}
                  onChange={(e) => setEditedColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
            </div>

            {/* Stats (simple key-value editor) */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-2">Stats (JSON)</label>
              <textarea
                value={JSON.stringify(editedStats, null, 2)}
                onChange={(e) => {
                  try {
                    setEditedStats(JSON.parse(e.target.value))
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-xs"
                rows={6}
              />
              <div className="text-xs text-gray-500 mt-1">
                Example: {`{"HP": 25, "AC": 15}`}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleUpdateToken}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
