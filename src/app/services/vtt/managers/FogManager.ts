// src/app/services/vtt/managers/FogManager.ts

import type {
  VTTGameState,
  VTTAction,
  RevealFogAction,
  HideFogAction,
  Vector3D
} from '../VTTGameState'
import { getFogChunkCoordinate, getAdjacentFogChunks } from '../VTTGameState'

/**
 * FogManager - Chunk-based fog of war system
 *
 * Uses 10x10 unit chunks for efficient updates.
 * Only changed chunks are broadcast to clients.
 */

export class FogManager {
  /**
   * Reveal fog chunks
   */
  static revealFog(gameState: VTTGameState, action: RevealFogAction): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      console.warn(`[FogManager] Scene not found: ${action.data.sceneId}`)
      return gameState
    }

    // Add chunks to revealed set
    const newRevealedChunks = new Set([
      ...scene.fogState.revealedChunks,
      ...action.data.chunks
    ])

    return {
      ...gameState,
      scenes: {
        ...gameState.scenes,
        [action.data.sceneId]: {
          ...scene,
          fogState: {
            ...scene.fogState,
            revealedChunks: newRevealedChunks
          }
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Hide fog chunks (re-fog)
   */
  static hideFog(gameState: VTTGameState, action: HideFogAction): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      console.warn(`[FogManager] Scene not found: ${action.data.sceneId}`)
      return gameState
    }

    // Remove chunks from revealed set
    const newRevealedChunks = new Set(scene.fogState.revealedChunks)
    for (const chunk of action.data.chunks) {
      newRevealedChunks.delete(chunk)
    }

    return {
      ...gameState,
      scenes: {
        ...gameState.scenes,
        [action.data.sceneId]: {
          ...scene,
          fogState: {
            ...scene.fogState,
            revealedChunks: newRevealedChunks
          }
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Reveal fog around a token's position
   */
  static revealFogAroundToken(
    gameState: VTTGameState,
    action: VTTAction & { data: { sceneId: string, tokenId: string, range?: number } }
  ): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]
    const scene = gameState.scenes[action.data.sceneId]

    if (!token || !scene) {
      return gameState
    }

    const range = action.data.range || 1 // Default to 1 chunk radius
    const chunkSize = scene.fogState.gridSize

    // Get chunks within range
    const centerChunk = getFogChunkCoordinate(token.position, chunkSize)
    const chunks = this.getChunksInRadius(centerChunk, range)

    return this.revealFog(gameState, {
      ...action,
      type: 'reveal_fog',
      data: {
        sceneId: action.data.sceneId,
        chunks
      }
    } as RevealFogAction)
  }

  /**
   * Clear all fog (reveal entire map)
   */
  static clearAllFog(
    gameState: VTTGameState,
    action: VTTAction & { data: { sceneId: string } }
  ): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      return gameState
    }

    // Generate all chunks in scene bounds (if defined)
    const allChunks = scene.bounds
      ? this.getAllChunksInBounds(scene.bounds.min, scene.bounds.max, scene.fogState.gridSize)
      : []

    return this.revealFog(gameState, {
      ...action,
      type: 'reveal_fog',
      data: {
        sceneId: action.data.sceneId,
        chunks: allChunks
      }
    } as RevealFogAction)
  }

  /**
   * Reset fog (hide entire map)
   */
  static resetFog(
    gameState: VTTGameState,
    action: VTTAction & { data: { sceneId: string } }
  ): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      return gameState
    }

    return {
      ...gameState,
      scenes: {
        ...gameState.scenes,
        [action.data.sceneId]: {
          ...scene,
          fogState: {
            ...scene.fogState,
            revealedChunks: new Set()
          }
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Toggle fog of war enabled/disabled
   */
  static toggleFog(
    gameState: VTTGameState,
    action: VTTAction & { data: { sceneId: string } }
  ): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      return gameState
    }

    return {
      ...gameState,
      scenes: {
        ...gameState.scenes,
        [action.data.sceneId]: {
          ...scene,
          fogState: {
            ...scene.fogState,
            enabled: !scene.fogState.enabled
          }
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Update token vision settings
   */
  static updateTokenVision(
    gameState: VTTGameState,
    action: VTTAction & {
      data: {
        sceneId: string
        tokenId: string
        range: number
        shape?: 'circle' | 'cone' | 'square'
        angle?: number
      }
    }
  ): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      return gameState
    }

    return {
      ...gameState,
      scenes: {
        ...gameState.scenes,
        [action.data.sceneId]: {
          ...scene,
          fogState: {
            ...scene.fogState,
            visionTokens: {
              ...scene.fogState.visionTokens,
              [action.data.tokenId]: {
                tokenId: action.data.tokenId,
                range: action.data.range,
                shape: action.data.shape || 'circle',
                angle: action.data.angle
              }
            }
          }
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Remove token vision
   */
  static removeTokenVision(
    gameState: VTTGameState,
    action: VTTAction & { data: { sceneId: string, tokenId: string } }
  ): VTTGameState {
    const scene = gameState.scenes[action.data.sceneId]

    if (!scene) {
      return gameState
    }

    const { [action.data.tokenId]: removed, ...remainingVision } = scene.fogState.visionTokens

    return {
      ...gameState,
      scenes: {
        ...gameState.scenes,
        [action.data.sceneId]: {
          ...scene,
          fogState: {
            ...scene.fogState,
            visionTokens: remainingVision
          }
        }
      },
      updatedAt: new Date()
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get chunks in a radius around a center chunk
   */
  private static getChunksInRadius(centerChunk: string, radius: number): string[] {
    const [cx, cz] = centerChunk.split(',').map(Number)
    const chunks: string[] = []

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        // Circle approximation: dx² + dz² ≤ radius²
        if (dx * dx + dz * dz <= radius * radius) {
          chunks.push(`${cx + dx},${cz + dz}`)
        }
      }
    }

    return chunks
  }

  /**
   * Get all chunks within bounds
   */
  private static getAllChunksInBounds(
    min: Vector3D,
    max: Vector3D,
    chunkSize: number
  ): string[] {
    const chunks: string[] = []

    const minChunkX = Math.floor(min.x / chunkSize)
    const maxChunkX = Math.ceil(max.x / chunkSize)
    const minChunkZ = Math.floor(min.z / chunkSize)
    const maxChunkZ = Math.ceil(max.z / chunkSize)

    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let z = minChunkZ; z <= maxChunkZ; z++) {
        chunks.push(`${x},${z}`)
      }
    }

    return chunks
  }

  /**
   * Check if chunk is revealed
   */
  static isChunkRevealed(gameState: VTTGameState, sceneId: string, chunk: string): boolean {
    const scene = gameState.scenes[sceneId]
    if (!scene) return false

    return scene.fogState.revealedChunks.has(chunk)
  }

  /**
   * Check if position is revealed
   */
  static isPositionRevealed(
    gameState: VTTGameState,
    sceneId: string,
    position: Vector3D
  ): boolean {
    const scene = gameState.scenes[sceneId]
    if (!scene) return false

    const chunk = getFogChunkCoordinate(position, scene.fogState.gridSize)
    return scene.fogState.revealedChunks.has(chunk)
  }
}
