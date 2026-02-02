// src/app/components/VTT/SceneManager.ts

import * as THREE from 'three'
import type { VTTGameState, VTTAction, Token } from '@/app/services/vtt/VTTGameState'
import { EntityManager } from './EntityManager'
import { FogOfWarRenderer } from './FogOfWarRenderer'

/**
 * SceneManager - Manages Three.js scene lifecycle
 *
 * - Syncs server state to 3D scene
 * - Handles entity creation/updates/deletion
 * - Manages raycasting for user interactions
 * - Interpolates positions for smooth movement
 */

type OtherPlayer = {
  playerId: string
  playerName: string
  cursor: { x: number; y: number; z: number } | null
  camera: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } | null
}

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private playerId: string
  private isGM: boolean
  private sendAction: (action: Omit<VTTAction, 'playerId'>) => void

  private entityManager: EntityManager
  private fogRenderer: FogOfWarRenderer
  private raycaster: THREE.Raycaster
  private pointer: THREE.Vector2

  private selectedTokenId: string | null = null
  private isDragging: boolean = false

  // Other players' cursor indicators
  private otherPlayerCursors: Map<string, THREE.Mesh> = new Map()
  private otherPlayerLabels: Map<string, THREE.Sprite> = new Map()

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    playerId: string,
    isGM: boolean,
    sendAction: (action: Omit<VTTAction, 'playerId'>) => void
  ) {
    this.scene = scene
    this.camera = camera
    this.playerId = playerId
    this.isGM = isGM
    this.sendAction = sendAction

    this.entityManager = new EntityManager(scene)
    this.fogRenderer = new FogOfWarRenderer(scene, isGM)
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.setupInteractions()
  }

  /**
   * Setup mouse/pointer interactions
   */
  private setupInteractions() {
    const canvas = this.scene.children[0]?.parent as any
    if (!canvas) return

    // Pointer move
    window.addEventListener('pointermove', (event) => {
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    })

    // Click to select tokens
    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return // Left click only

      this.raycaster.setFromCamera(this.pointer, this.camera)
      const tokenMeshes = this.entityManager.getTokenMeshes()
      const intersects = this.raycaster.intersectObjects(tokenMeshes)

      if (intersects.length > 0) {
        const mesh = intersects[0].object
        const tokenId = mesh.userData.tokenId

        if (tokenId) {
          this.selectedTokenId = tokenId
          this.isDragging = true
          console.log('[SceneManager] Selected token:', tokenId)
        }
      } else {
        this.selectedTokenId = null
      }
    })

    // Release to move token
    window.addEventListener('pointerup', () => {
      if (this.isDragging && this.selectedTokenId) {
        // Raycast to ground to get new position
        this.raycaster.setFromCamera(this.pointer, this.camera)
        const ground = this.scene.children.find(
          (child) => child instanceof THREE.Mesh && child.name === 'ground'
        )

        if (ground) {
          const intersects = this.raycaster.intersectObject(ground)
          if (intersects.length > 0) {
            const newPosition = intersects[0].point
            this.sendAction({
              type: 'move_token',
              data: {
                tokenId: this.selectedTokenId,
                position: {
                  x: newPosition.x,
                  y: 0, // Keep on ground
                  z: newPosition.z
                }
              }
            })
            console.log('[SceneManager] Moved token to:', newPosition)
          }
        }
      }

      this.isDragging = false
    })
  }

  /**
   * Update scene from server state
   */
  updateFromState(gameState: VTTGameState) {
    // Update tokens
    const currentTokenIds = new Set(Object.keys(gameState.tokens))
    this.entityManager.syncTokens(gameState.tokens, this.playerId, this.isGM)

    // Update lights
    this.entityManager.syncLights(gameState.lights)

    // Update fog
    const activeScene = gameState.scenes[gameState.activeSceneId]
    if (activeScene?.fogState) {
      this.fogRenderer.updateFog(activeScene.fogState)
    }
  }

  /**
   * Get token at current pointer position (for context menu)
   */
  getTokenAtPointer(): { tokenId: string } | null {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const tokenMeshes = this.entityManager.getTokenMeshes()
    const intersects = this.raycaster.intersectObjects(tokenMeshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object
      const tokenId = mesh.userData.tokenId
      if (tokenId) {
        return { tokenId }
      }
    }

    return null
  }

  /**
   * Update other players' cursors and camera indicators
   */
  updateOtherPlayers(otherPlayers: Map<string, OtherPlayer>) {
    // Remove cursors for players who left
    for (const playerId of this.otherPlayerCursors.keys()) {
      if (!otherPlayers.has(playerId)) {
        const cursor = this.otherPlayerCursors.get(playerId)
        const label = this.otherPlayerLabels.get(playerId)

        if (cursor) {
          this.scene.remove(cursor)
          cursor.geometry.dispose()
          ;(cursor.material as THREE.Material).dispose()
        }

        if (label) {
          this.scene.remove(label)
          label.material.dispose()
        }

        this.otherPlayerCursors.delete(playerId)
        this.otherPlayerLabels.delete(playerId)
      }
    }

    // Update/create cursors for current players
    for (const [playerId, player] of otherPlayers.entries()) {
      if (!player.cursor) continue

      let cursor = this.otherPlayerCursors.get(playerId)

      if (!cursor) {
        // Create new cursor indicator
        const geometry = new THREE.SphereGeometry(0.5, 16, 16)
        const material = new THREE.MeshBasicMaterial({
          color: this.getPlayerColor(playerId),
          transparent: true,
          opacity: 0.7
        })
        cursor = new THREE.Mesh(geometry, material)
        this.scene.add(cursor)
        this.otherPlayerCursors.set(playerId, cursor)

        // Create label
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 64
        const context = canvas.getContext('2d')
        if (context) {
          context.fillStyle = 'white'
          context.font = 'Bold 24px Arial'
          context.textAlign = 'center'
          context.fillText(player.playerName, 128, 40)
        }

        const texture = new THREE.CanvasTexture(canvas)
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
        const label = new THREE.Sprite(spriteMaterial)
        label.scale.set(4, 1, 1)
        this.scene.add(label)
        this.otherPlayerLabels.set(playerId, label)
      }

      // Update cursor position
      cursor.position.set(player.cursor.x, player.cursor.y + 1, player.cursor.z)

      // Update label position
      const label = this.otherPlayerLabels.get(playerId)
      if (label) {
        label.position.set(player.cursor.x, player.cursor.y + 3, player.cursor.z)
      }
    }
  }

  /**
   * Get a consistent color for a player based on their ID
   */
  private getPlayerColor(playerId: string): number {
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da]
    const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  /**
   * Update loop (called every frame)
   */
  update() {
    // Update entity animations/interpolations
    this.entityManager.update()

    // Highlight selected token
    if (this.selectedTokenId) {
      const mesh = this.entityManager.getTokenMesh(this.selectedTokenId)
      if (mesh) {
        // TODO: Add selection ring or highlight
      }
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    this.entityManager.dispose()
    this.fogRenderer.dispose()

    // Clean up other player cursors
    for (const cursor of this.otherPlayerCursors.values()) {
      this.scene.remove(cursor)
      cursor.geometry.dispose()
      ;(cursor.material as THREE.Material).dispose()
    }

    for (const label of this.otherPlayerLabels.values()) {
      this.scene.remove(label)
      label.material.dispose()
    }
  }
}
