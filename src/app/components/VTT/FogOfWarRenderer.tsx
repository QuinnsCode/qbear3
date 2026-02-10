// src/app/components/VTT/FogOfWarRenderer.tsx

import * as THREE from 'three'
import type { FogState } from '@/app/services/vtt/VTTGameState'

/**
 * FogOfWarRenderer - Renders fog of war overlay on 3D scene
 *
 * - GM sees semi-transparent fog (can edit)
 * - Players see opaque fog (blocks vision)
 * - Chunk-based system (10x10 unit chunks)
 * - Efficient updates (only changed chunks)
 */

export class FogOfWarRenderer {
  private scene: THREE.Scene
  private isGM: boolean
  private fogGroup: THREE.Group
  private fogChunkMeshes: Map<string, THREE.Mesh> = new Map()

  private readonly CHUNK_SIZE = 10
  private readonly FOG_HEIGHT = 0.2
  private readonly GM_FOG_OPACITY = 0.3
  private readonly PLAYER_FOG_OPACITY = 0.9

  constructor(scene: THREE.Scene, isGM: boolean) {
    this.scene = scene
    this.isGM = isGM

    // Create fog group
    this.fogGroup = new THREE.Group()
    this.fogGroup.name = 'fogOfWar'
    this.scene.add(this.fogGroup)
  }

  /**
   * Update fog state from server
   */
  updateFog(fogState: FogState) {
    if (!fogState.enabled) {
      // Hide all fog
      this.fogGroup.visible = false
      return
    }

    this.fogGroup.visible = true

    // For simplicity, render fog for a fixed grid area (-50 to 50 in both axes)
    // In production, this would be dynamic based on scene bounds
    const minChunkX = -5
    const maxChunkX = 5
    const minChunkZ = -5
    const maxChunkZ = 5

    const revealedChunks = new Set(Array.from(fogState.revealedChunks))

    // Create/update fog chunks
    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let z = minChunkZ; z <= maxChunkZ; z++) {
        const chunkKey = `${x},${z}`
        const isRevealed = revealedChunks.has(chunkKey)

        if (isRevealed) {
          // Remove fog chunk if it exists
          this.removeFogChunk(chunkKey)
        } else {
          // Create fog chunk if it doesn't exist
          if (!this.fogChunkMeshes.has(chunkKey)) {
            this.createFogChunk(x, z, chunkKey)
          }
        }
      }
    }

    // Remove chunks outside the grid
    for (const chunkKey of this.fogChunkMeshes.keys()) {
      const [x, z] = chunkKey.split(',').map(Number)
      if (x < minChunkX || x > maxChunkX || z < minChunkZ || z > maxChunkZ) {
        this.removeFogChunk(chunkKey)
      }
    }
  }

  /**
   * Create a fog chunk mesh
   */
  private createFogChunk(chunkX: number, chunkZ: number, chunkKey: string) {
    const geometry = new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE)
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: this.isGM ? this.GM_FOG_OPACITY : this.PLAYER_FOG_OPACITY,
      side: THREE.DoubleSide,
      depthWrite: false // Allow seeing objects underneath
    })

    const mesh = new THREE.Mesh(geometry, material)

    // Position at chunk coordinates
    const worldX = chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2
    const worldZ = chunkZ * this.CHUNK_SIZE + this.CHUNK_SIZE / 2

    mesh.position.set(worldX, this.FOG_HEIGHT, worldZ)
    mesh.rotation.x = -Math.PI / 2
    mesh.userData.chunkKey = chunkKey

    // Add grid lines for GM (visual aid)
    if (this.isGM) {
      const edges = new THREE.EdgesGeometry(geometry)
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true })
      const line = new THREE.LineSegments(edges, lineMaterial)
      line.rotation.x = -Math.PI / 2
      mesh.add(line)
    }

    this.fogGroup.add(mesh)
    this.fogChunkMeshes.set(chunkKey, mesh)
  }

  /**
   * Remove a fog chunk mesh
   */
  private removeFogChunk(chunkKey: string) {
    const mesh = this.fogChunkMeshes.get(chunkKey)
    if (!mesh) return

    // Dispose geometry and material
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose())
    } else {
      mesh.material.dispose()
    }

    // Dispose children (grid lines)
    mesh.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    })

    this.fogGroup.remove(mesh)
    this.fogChunkMeshes.delete(chunkKey)
  }

  /**
   * Get fog chunk at world position (for raycasting)
   */
  getFogChunkAtPosition(x: number, z: number): string | null {
    const chunkX = Math.floor(x / this.CHUNK_SIZE)
    const chunkZ = Math.floor(z / this.CHUNK_SIZE)
    const chunkKey = `${chunkX},${chunkZ}`

    return this.fogChunkMeshes.has(chunkKey) ? chunkKey : null
  }

  /**
   * Highlight fog chunk on hover (GM only)
   */
  highlightChunk(chunkKey: string | null) {
    if (!this.isGM) return

    // Reset all chunks to default opacity
    for (const mesh of this.fogChunkMeshes.values()) {
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = this.GM_FOG_OPACITY
    }

    // Highlight hovered chunk
    if (chunkKey) {
      const mesh = this.fogChunkMeshes.get(chunkKey)
      if (mesh) {
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = this.GM_FOG_OPACITY + 0.2
      }
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    for (const chunkKey of this.fogChunkMeshes.keys()) {
      this.removeFogChunk(chunkKey)
    }

    this.scene.remove(this.fogGroup)
  }
}
