// src/app/components/VTT/AssetBrowser.tsx

'use client'

import { useState, useRef } from 'react'
import { DEFAULT_ASSETS, type AssetCategory, type VTTAsset, getAssetsByCategory, searchAssets } from '@/app/lib/vtt/defaultAssets'

/**
 * AssetBrowser - Modal for browsing and selecting 3D models
 *
 * Features:
 * - Browse default assets by category
 * - Search assets by name
 * - Upload custom GLB models
 * - Click to select model for spawning
 */

interface AssetBrowserProps {
  isOpen: boolean
  onClose: () => void
  onSelectAsset: (asset: VTTAsset | null, customUrl?: string) => void
}

export function AssetBrowser({ isOpen, onClose, onSelectAsset }: AssetBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Filter assets
  const filteredAssets = searchQuery
    ? searchAssets(searchQuery)
    : selectedCategory === 'all'
    ? DEFAULT_ASSETS
    : getAssetsByCategory(selectedCategory)

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('model', file)

      const response = await fetch('/api/vtt/upload-model', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()

      // Use the uploaded model
      onSelectAsset(null, result.url)
      onClose()
    } catch (error) {
      console.error('[AssetBrowser] Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-slate-800 border-2 border-purple-500 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Asset Browser</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Search & Upload */}
          <div className="p-4 border-b border-slate-700 space-y-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'humanoid', 'monster', 'terrain', 'prop', 'template'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded font-semibold transition-colors capitalize ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded font-semibold transition-colors"
              >
                {isUploading ? 'Uploading...' : '📤 Upload Custom Model (.glb)'}
              </button>
              {uploadError && (
                <div className="mt-2 text-red-400 text-sm">{uploadError}</div>
              )}
            </div>
          </div>

          {/* Asset Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    onSelectAsset(asset)
                    onClose()
                  }}
                  className="bg-slate-700 hover:bg-slate-600 rounded-lg p-3 text-left transition-colors border-2 border-transparent hover:border-purple-500"
                >
                  {/* Thumbnail placeholder */}
                  <div className="w-full aspect-square bg-slate-600 rounded mb-2 flex items-center justify-center">
                    <span className="text-4xl">
                      {asset.category === 'humanoid' && '🧙'}
                      {asset.category === 'monster' && '👹'}
                      {asset.category === 'terrain' && '🌲'}
                      {asset.category === 'prop' && '📦'}
                      {asset.category === 'template' && '⭕'}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="text-white font-semibold text-sm mb-1">{asset.name}</div>

                  {/* Category badge */}
                  <div className="text-xs text-gray-400 capitalize">{asset.category}</div>

                  {/* Description */}
                  {asset.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{asset.description}</div>
                  )}
                </button>
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                No assets found. Try a different search or upload your own.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 text-sm text-gray-400">
            Tip: Default assets are free CC0 models. Upload your own GLB files (max 5MB).
          </div>
        </div>
      </div>
    </>
  )
}
