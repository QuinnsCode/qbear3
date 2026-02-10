// src/app/components/VTT/GMToolbar.tsx

'use client'

import { useState } from 'react'
import type { VTTAction } from '@/app/services/vtt/VTTGameState'
import { AssetBrowser } from './AssetBrowser'
import type { VTTAsset } from '@/app/lib/vtt/defaultAssets'

/**
 * GMToolbar - Game Master control panel
 *
 * Tools:
 * - Token Spawner: Create tokens at camera center (with AssetBrowser)
 * - Light Controls: Add/remove dynamic lights
 * - Fog Controls: Reveal/hide fog chunks
 * - Scene Switcher: Change active scene
 */

interface GMToolbarProps {
  sendAction: (action: Omit<VTTAction, 'playerId'>) => void
  activeSceneId: string
  cameraPosition: { x: number; y: number; z: number }
}

type TokenType = 'pc' | 'npc' | 'monster' | 'prop'

const TOKEN_PRESETS: Record<TokenType, { name: string; color: string }> = {
  pc: { name: 'Player Character', color: '#4ecdc4' },
  npc: { name: 'NPC', color: '#ffe66d' },
  monster: { name: 'Monster', color: '#ff6b6b' },
  prop: { name: 'Prop', color: '#95e1d3' }
}

export function GMToolbar({ sendAction, activeSceneId, cameraPosition }: GMToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedTool, setSelectedTool] = useState<'token' | 'light' | 'fog' | null>(null)
  const [isAssetBrowserOpen, setIsAssetBrowserOpen] = useState(false)

  // Token spawning with optional model
  const spawnTokenWithModel = (asset: VTTAsset | null, customUrl?: string) => {
    const modelUrl = customUrl || asset?.modelUrl
    const scale = asset?.scale || { x: 1, y: 1, z: 1 }
    const category = asset?.category || 'prop'

    // Map category to token type
    const type: TokenType =
      category === 'humanoid' ? 'pc' :
      category === 'monster' ? 'monster' :
      category === 'terrain' ? 'prop' :
      'prop'

    const preset = TOKEN_PRESETS[type]
    const name = asset?.name || `Token ${Math.floor(Math.random() * 1000)}`

    sendAction({
      type: 'create_token',
      data: {
        name,
        type,
        position: {
          x: cameraPosition.x,
          y: 0,
          z: cameraPosition.z
        },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale,
        color: preset.color,
        modelUrl,
        visibleTo: 'all',
        isHidden: false,
        isLocked: false
      }
    })

    setSelectedTool(null)
  }

  // Quick spawn without model (fallback to colored cylinder)
  const spawnToken = (type: TokenType) => {
    const preset = TOKEN_PRESETS[type]

    sendAction({
      type: 'create_token',
      data: {
        name: `${preset.name} ${Math.floor(Math.random() * 1000)}`,
        type,
        position: {
          x: cameraPosition.x,
          y: 0,
          z: cameraPosition.z
        },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        color: preset.color,
        visibleTo: 'all',
        isHidden: false,
        isLocked: false
      }
    })

    setSelectedTool(null)
  }

  // Light spawning
  const spawnLight = (type: 'point' | 'directional') => {
    sendAction({
      type: 'create_light',
      data: {
        type,
        position: {
          x: cameraPosition.x,
          y: 10,
          z: cameraPosition.z
        },
        color: '#ffffff',
        intensity: 1,
        range: 20,
        castShadows: type === 'point',
        isEnabled: true,
        visibleTo: 'all'
      }
    })

    setSelectedTool(null)
  }

  // Fog reveal (basic - reveals 10x10 chunk at camera position)
  const revealFog = () => {
    const chunkX = Math.floor(cameraPosition.x / 10)
    const chunkZ = Math.floor(cameraPosition.z / 10)
    const chunkKey = `${chunkX},${chunkZ}`

    sendAction({
      type: 'reveal_fog',
      data: {
        sceneId: activeSceneId,
        chunks: [chunkKey]
      }
    })

    setSelectedTool(null)
  }

  const hideFog = () => {
    const chunkX = Math.floor(cameraPosition.x / 10)
    const chunkZ = Math.floor(cameraPosition.z / 10)
    const chunkKey = `${chunkX},${chunkZ}`

    sendAction({
      type: 'hide_fog',
      data: {
        sceneId: activeSceneId,
        chunks: [chunkKey]
      }
    })

    setSelectedTool(null)
  }

  const toggleFog = () => {
    sendAction({
      type: 'toggle_fog',
      data: {
        sceneId: activeSceneId
      }
    })
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      {/* Main toolbar */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-2 border-purple-500/50 rounded-lg shadow-2xl p-2">
        <div className="flex items-center gap-2">
          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold transition-colors"
          >
            {isExpanded ? '👑 Hide' : '👑 GM Tools'}
          </button>

          {isExpanded && (
            <>
              {/* Token Tool */}
              <div className="relative">
                <button
                  onClick={() => setSelectedTool(selectedTool === 'token' ? null : 'token')}
                  className={`px-3 py-2 rounded font-semibold transition-colors ${
                    selectedTool === 'token'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  🎭 Token
                </button>

                {selectedTool === 'token' && (
                  <div className="absolute bottom-full left-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg p-2 min-w-[200px]">
                    <div className="text-xs text-gray-400 mb-2 font-semibold">Spawn Token:</div>

                    {/* Browse Models Button */}
                    <button
                      onClick={() => {
                        setIsAssetBrowserOpen(true)
                        setSelectedTool(null)
                      }}
                      className="w-full px-3 py-2 mb-2 text-left rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
                    >
                      🎨 Browse 3D Models
                    </button>

                    <div className="text-xs text-gray-400 mb-2 font-semibold border-t border-slate-600 pt-2">Quick Spawn (No Model):</div>

                    {(Object.keys(TOKEN_PRESETS) as TokenType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => spawnToken(type)}
                        className="w-full px-3 py-2 mb-1 text-left rounded hover:bg-slate-600 text-white text-sm transition-colors"
                        style={{ backgroundColor: TOKEN_PRESETS[type].color + '40' }}
                      >
                        {TOKEN_PRESETS[type].name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Light Tool */}
              <div className="relative">
                <button
                  onClick={() => setSelectedTool(selectedTool === 'light' ? null : 'light')}
                  className={`px-3 py-2 rounded font-semibold transition-colors ${
                    selectedTool === 'light'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  💡 Light
                </button>

                {selectedTool === 'light' && (
                  <div className="absolute bottom-full left-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg p-2 min-w-[200px]">
                    <div className="text-xs text-gray-400 mb-2 font-semibold">Add Light:</div>
                    <button
                      onClick={() => spawnLight('point')}
                      className="w-full px-3 py-2 mb-1 text-left rounded hover:bg-slate-600 text-white text-sm transition-colors"
                    >
                      Point Light
                    </button>
                    <button
                      onClick={() => spawnLight('directional')}
                      className="w-full px-3 py-2 text-left rounded hover:bg-slate-600 text-white text-sm transition-colors"
                    >
                      Directional Light
                    </button>
                  </div>
                )}
              </div>

              {/* Fog Tool */}
              <div className="relative">
                <button
                  onClick={() => setSelectedTool(selectedTool === 'fog' ? null : 'fog')}
                  className={`px-3 py-2 rounded font-semibold transition-colors ${
                    selectedTool === 'fog'
                      ? 'bg-gray-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  🌫️ Fog
                </button>

                {selectedTool === 'fog' && (
                  <div className="absolute bottom-full left-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg p-2 min-w-[200px]">
                    <div className="text-xs text-gray-400 mb-2 font-semibold">Fog of War:</div>
                    <button
                      onClick={revealFog}
                      className="w-full px-3 py-2 mb-1 text-left rounded hover:bg-slate-600 text-white text-sm transition-colors"
                    >
                      Reveal Chunk
                    </button>
                    <button
                      onClick={hideFog}
                      className="w-full px-3 py-2 mb-1 text-left rounded hover:bg-slate-600 text-white text-sm transition-colors"
                    >
                      Hide Chunk
                    </button>
                    <button
                      onClick={toggleFog}
                      className="w-full px-3 py-2 text-left rounded hover:bg-slate-600 text-white text-sm transition-colors"
                    >
                      Toggle Fog System
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      {isExpanded && (
        <div className="mt-2 text-center text-xs text-gray-400">
          Shortcuts: <span className="text-white font-mono">T</span>=Token{' '}
          <span className="text-white font-mono">L</span>=Light{' '}
          <span className="text-white font-mono">F</span>=Fog
        </div>
      )}

      {/* Asset Browser Modal */}
      <AssetBrowser
        isOpen={isAssetBrowserOpen}
        onClose={() => setIsAssetBrowserOpen(false)}
        onSelectAsset={spawnTokenWithModel}
      />
    </div>
  )
}
