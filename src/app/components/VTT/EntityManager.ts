// src/app/components/VTT/EntityManager.ts

import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import type { Token, Light } from '@/app/services/vtt/VTTGameState'

/**
 * EntityManager - Creates and manages Three.js meshes for game entities
 *
 * - Tokens: GLB models or colored cylinders (fallback)
 * - Lights: Point lights, directional lights, spotlights
 * - Terrain: Walls, obstacles (Phase 2)
 * - Interpolation: Smooth position updates
 */

export class EntityManager {
  private scene: THREE.Scene

  // Entity tracking
  private tokenMeshes: Map<string, THREE.Group> = new Map()
  private lightObjects: Map<string, THREE.Light> = new Map()

  // Interpolation state
  private tokenTargetPositions: Map<string, THREE.Vector3> = new Map()

  // Model loading
  private gltfLoader: GLTFLoader
  private modelCache: Map<string, THREE.Group> = new Map()
  private loadingModels: Map<string, Promise<THREE.Group>> = new Map()

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.gltfLoader = new GLTFLoader()
  }

  /**
   * Sync tokens from server state
   */
  syncTokens(
    tokens: Record<string, Token>,
    currentPlayerId: string,
    isGM: boolean
  ) {
    const serverTokenIds = new Set(Object.keys(tokens))

    // Remove tokens that no longer exist
    for (const tokenId of this.tokenMeshes.keys()) {
      if (!serverTokenIds.has(tokenId)) {
        this.removeToken(tokenId)
      }
    }

    // Add or update tokens
    for (const [tokenId, token] of Object.entries(tokens)) {
      const existingMesh = this.tokenMeshes.get(tokenId)

      if (existingMesh) {
        // Update existing token
        this.updateToken(tokenId, token)
      } else {
        // Create new token
        this.createToken(tokenId, token, currentPlayerId, isGM)
      }
    }
  }

  /**
   * Load GLB model from URL with caching
   */
  private async loadModel(url: string): Promise<THREE.Group> {
    // Check cache first
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url)!.clone()
    }

    // Check if already loading
    if (this.loadingModels.has(url)) {
      const model = await this.loadingModels.get(url)!
      return model.clone()
    }

    // Start loading
    const loadPromise = new Promise<THREE.Group>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene
          // Enable shadows for all meshes
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })
          this.modelCache.set(url, model)
          this.loadingModels.delete(url)
          resolve(model)
        },
        undefined,
        (error) => {
          console.error(`[EntityManager] Failed to load model: ${url}`, error)
          this.loadingModels.delete(url)
          reject(error)
        }
      )
    })

    this.loadingModels.set(url, loadPromise)
    const model = await loadPromise
    return model.clone()
  }

  /**
   * Create a new token mesh
   */
  private createToken(
    tokenId: string,
    token: Token,
    currentPlayerId: string,
    isGM: boolean
  ) {
    const group = new THREE.Group()
    group.userData.tokenId = tokenId

    // Try to load GLB model if modelUrl is provided
    if (token.modelUrl) {
      this.loadModel(token.modelUrl)
        .then((model) => {
          // Replace cylinder with GLB model
          const cylinder = group.children.find(
            child => child instanceof THREE.Mesh && !child.userData.isSelectionRing
          )
          if (cylinder) {
            group.remove(cylinder)
          }

          // Scale model to fit token scale
          model.scale.set(token.scale.x, token.scale.y, token.scale.z)
          model.userData.tokenId = tokenId
          group.add(model)
        })
        .catch((error) => {
          console.warn(`[EntityManager] Failed to load model for token ${tokenId}, using fallback`)
          // Fallback cylinder is already added below
        })
    }

    // Token body (colored cylinder as fallback or default)
    const geometry = new THREE.CylinderGeometry(
      token.scale.x * 0.5,
      token.scale.x * 0.5,
      token.scale.y * 2,
      32
    )

    // Determine color based on token type and ownership
    let color = token.color ? parseInt(token.color.replace('#', '0x')) : 0x808080
    if (token.type === 'pc') color = 0x4ecdc4
    else if (token.type === 'npc') color = 0xffe66d
    else if (token.type === 'monster') color = 0xff6b6b
    else if (token.type === 'prop') color = 0x95e1d3

    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.7
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.tokenId = tokenId
    group.add(mesh)

    // Name label (billboard sprite)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = 'white'
      context.font = 'Bold 20px Arial'
      context.textAlign = 'center'
      context.fillText(token.name, 128, 40)
    }

    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
    const nameLabel = new THREE.Sprite(spriteMaterial)
    nameLabel.scale.set(3, 0.75, 1)
    nameLabel.position.y = token.scale.y * 2 + 1
    group.add(nameLabel)

    // Selection ring (initially hidden)
    const ringGeometry = new THREE.RingGeometry(
      token.scale.x * 0.6,
      token.scale.x * 0.7,
      32
    )
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1
    ring.userData.isSelectionRing = true
    group.add(ring)

    // Position
    group.position.set(token.position.x, token.position.y, token.position.z)
    this.tokenTargetPositions.set(tokenId, new THREE.Vector3(
      token.position.x,
      token.position.y,
      token.position.z
    ))

    // Rotation (convert quaternion)
    group.quaternion.set(
      token.rotation.x,
      token.rotation.y,
      token.rotation.z,
      token.rotation.w
    )

    this.scene.add(group)
    this.tokenMeshes.set(tokenId, group)
  }

  /**
   * Update an existing token
   */
  private updateToken(tokenId: string, token: Token) {
    const group = this.tokenMeshes.get(tokenId)
    if (!group) return

    // Update target position for interpolation
    const targetPos = new THREE.Vector3(token.position.x, token.position.y, token.position.z)
    this.tokenTargetPositions.set(tokenId, targetPos)

    // Update rotation immediately (no interpolation for rotation)
    group.quaternion.set(
      token.rotation.x,
      token.rotation.y,
      token.rotation.z,
      token.rotation.w
    )

    // Update scale
    const mesh = group.children.find(child => child instanceof THREE.Mesh && !child.userData.isSelectionRing) as THREE.Mesh
    if (mesh) {
      mesh.scale.set(token.scale.x, token.scale.y, token.scale.z)
    }

    // Update color if changed
    if (token.color && mesh) {
      const color = parseInt(token.color.replace('#', '0x'))
      ;(mesh.material as THREE.MeshStandardMaterial).color.setHex(color)
    }

    // Update visibility
    group.visible = !token.isHidden
  }

  /**
   * Remove a token
   */
  private removeToken(tokenId: string) {
    const group = this.tokenMeshes.get(tokenId)
    if (!group) return

    // Dispose geometries and materials
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      } else if (child instanceof THREE.Sprite) {
        child.material.dispose()
      }
    })

    this.scene.remove(group)
    this.tokenMeshes.delete(tokenId)
    this.tokenTargetPositions.delete(tokenId)
  }

  /**
   * Sync lights from server state
   */
  syncLights(lights: Record<string, Light>) {
    const serverLightIds = new Set(Object.keys(lights))

    // Remove lights that no longer exist
    for (const lightId of this.lightObjects.keys()) {
      if (!serverLightIds.has(lightId)) {
        this.removeLight(lightId)
      }
    }

    // Add or update lights
    for (const [lightId, light] of Object.entries(lights)) {
      const existingLight = this.lightObjects.get(lightId)

      if (existingLight) {
        this.updateLight(lightId, light)
      } else {
        this.createLight(lightId, light)
      }
    }
  }

  /**
   * Create a new light
   */
  private createLight(lightId: string, light: Light) {
    let lightObject: THREE.Light

    switch (light.type) {
      case 'point': {
        const pointLight = new THREE.PointLight(
          parseInt(light.color.replace('#', '0x')),
          light.intensity,
          light.range
        )
        pointLight.castShadow = light.castShadows
        pointLight.position.set(light.position.x, light.position.y, light.position.z)
        lightObject = pointLight
        break
      }

      case 'directional': {
        const dirLight = new THREE.DirectionalLight(
          parseInt(light.color.replace('#', '0x')),
          light.intensity
        )
        dirLight.castShadow = light.castShadows
        dirLight.position.set(light.position.x, light.position.y, light.position.z)
        lightObject = dirLight
        break
      }

      case 'ambient': {
        const ambientLight = new THREE.AmbientLight(
          parseInt(light.color.replace('#', '0x')),
          light.intensity
        )
        lightObject = ambientLight
        break
      }

      default:
        return
    }

    lightObject.visible = light.isEnabled
    this.scene.add(lightObject)
    this.lightObjects.set(lightId, lightObject)
  }

  /**
   * Update an existing light
   */
  private updateLight(lightId: string, light: Light) {
    const lightObject = this.lightObjects.get(lightId)
    if (!lightObject) return

    lightObject.color.setHex(parseInt(light.color.replace('#', '0x')))
    lightObject.intensity = light.intensity
    lightObject.visible = light.isEnabled

    if (lightObject instanceof THREE.PointLight) {
      lightObject.distance = light.range
      lightObject.position.set(light.position.x, light.position.y, light.position.z)
    } else if (lightObject instanceof THREE.DirectionalLight) {
      lightObject.position.set(light.position.x, light.position.y, light.position.z)
    }
  }

  /**
   * Remove a light
   */
  private removeLight(lightId: string) {
    const lightObject = this.lightObjects.get(lightId)
    if (!lightObject) return

    this.scene.remove(lightObject)
    this.lightObjects.delete(lightId)
  }

  /**
   * Update loop - interpolate positions
   */
  update() {
    const lerpFactor = 0.1 // Smooth interpolation

    for (const [tokenId, group] of this.tokenMeshes.entries()) {
      const targetPos = this.tokenTargetPositions.get(tokenId)
      if (!targetPos) continue

      // Lerp position
      group.position.lerp(targetPos, lerpFactor)
    }
  }

  /**
   * Get all token meshes (for raycasting)
   */
  getTokenMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = []
    for (const group of this.tokenMeshes.values()) {
      const mesh = group.children.find(child => child instanceof THREE.Mesh && !child.userData.isSelectionRing)
      if (mesh) meshes.push(mesh)
    }
    return meshes
  }

  /**
   * Get a specific token mesh
   */
  getTokenMesh(tokenId: string): THREE.Group | undefined {
    return this.tokenMeshes.get(tokenId)
  }

  /**
   * Cleanup
   */
  dispose() {
    for (const tokenId of this.tokenMeshes.keys()) {
      this.removeToken(tokenId)
    }

    for (const lightId of this.lightObjects.keys()) {
      this.removeLight(lightId)
    }
  }
}
