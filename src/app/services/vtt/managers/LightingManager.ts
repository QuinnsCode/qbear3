// src/app/services/vtt/managers/LightingManager.ts

import type {
  VTTGameState,
  VTTAction,
  Light,
  CreateLightAction,
  UpdateLightAction,
  DeleteLightAction,
  Vector3D
} from '../VTTGameState'
import { createZeroVector, createIdentityQuaternion } from '../VTTGameState'

/**
 * LightingManager - Dynamic lighting system
 *
 * Manages point lights, directional lights, spotlights, and ambient lights.
 */

export class LightingManager {
  /**
   * Create a new light source
   */
  static createLight(gameState: VTTGameState, action: CreateLightAction): VTTGameState {
    const instanceId = crypto.randomUUID()

    const newLight: Light = {
      instanceId,
      name: action.data.name || 'Light',
      type: action.data.type || 'point',
      position: action.data.position || createZeroVector(),
      rotation: action.data.type === 'directional' || action.data.type === 'spotlight'
        ? createIdentityQuaternion()
        : undefined,
      color: action.data.color || '#ffffff',
      intensity: action.data.intensity ?? 1,
      range: action.data.range ?? 10,
      castShadows: false,
      angle: action.data.type === 'spotlight' ? 45 : undefined,
      decay: 2,
      visibleTo: 'all',
      isEnabled: true,
      isAnimated: false
    }

    // Add light to active scene
    const activeScene = gameState.scenes[gameState.activeSceneId]
    if (!activeScene) {
      console.warn('[LightingManager] No active scene found')
      return gameState
    }

    return {
      ...gameState,
      lights: {
        ...gameState.lights,
        [instanceId]: newLight
      },
      scenes: {
        ...gameState.scenes,
        [gameState.activeSceneId]: {
          ...activeScene,
          lightIds: [...activeScene.lightIds, instanceId]
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Update light properties
   */
  static updateLight(gameState: VTTGameState, action: UpdateLightAction): VTTGameState {
    const light = gameState.lights[action.data.lightId]

    if (!light) {
      console.warn(`[LightingManager] Light not found: ${action.data.lightId}`)
      return gameState
    }

    const updatedLight: Light = {
      ...light,
      ...action.data.updates
    }

    return {
      ...gameState,
      lights: {
        ...gameState.lights,
        [action.data.lightId]: updatedLight
      },
      updatedAt: new Date()
    }
  }

  /**
   * Delete a light
   */
  static deleteLight(gameState: VTTGameState, action: DeleteLightAction): VTTGameState {
    const light = gameState.lights[action.data.lightId]

    if (!light) {
      console.warn(`[LightingManager] Light not found: ${action.data.lightId}`)
      return gameState
    }

    // Remove from lights
    const { [action.data.lightId]: removed, ...remainingLights } = gameState.lights

    // Remove from all scenes
    const updatedScenes: Record<string, any> = {}
    for (const [sceneId, scene] of Object.entries(gameState.scenes)) {
      updatedScenes[sceneId] = {
        ...scene,
        lightIds: scene.lightIds.filter(id => id !== action.data.lightId)
      }
    }

    return {
      ...gameState,
      lights: remainingLights,
      scenes: updatedScenes,
      updatedAt: new Date()
    }
  }

  /**
   * Move a light to a new position
   */
  static moveLight(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string, position: Vector3D } }
  ): VTTGameState {
    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: { position: action.data.position }
      }
    } as UpdateLightAction)
  }

  /**
   * Toggle light on/off
   */
  static toggleLight(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string } }
  ): VTTGameState {
    const light = gameState.lights[action.data.lightId]

    if (!light) {
      return gameState
    }

    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: { isEnabled: !light.isEnabled }
      }
    } as UpdateLightAction)
  }

  /**
   * Set light color
   */
  static setLightColor(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string, color: string } }
  ): VTTGameState {
    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: { color: action.data.color }
      }
    } as UpdateLightAction)
  }

  /**
   * Set light intensity
   */
  static setLightIntensity(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string, intensity: number } }
  ): VTTGameState {
    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: { intensity: Math.max(0, Math.min(1, action.data.intensity)) }
      }
    } as UpdateLightAction)
  }

  /**
   * Set light range
   */
  static setLightRange(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string, range: number } }
  ): VTTGameState {
    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: { range: Math.max(0, action.data.range) }
      }
    } as UpdateLightAction)
  }

  /**
   * Toggle shadow casting
   */
  static toggleShadows(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string } }
  ): VTTGameState {
    const light = gameState.lights[action.data.lightId]

    if (!light) {
      return gameState
    }

    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: { castShadows: !light.castShadows }
      }
    } as UpdateLightAction)
  }

  /**
   * Enable light animation (flicker, pulse)
   */
  static enableLightAnimation(
    gameState: VTTGameState,
    action: VTTAction & {
      data: {
        lightId: string
        animation: 'flicker' | 'pulse'
        speed: number
        intensity?: number
        range?: number
      }
    }
  ): VTTGameState {
    const animationData: Light['animationData'] = {}

    if (action.data.animation === 'flicker') {
      animationData.flicker = {
        speed: action.data.speed,
        intensity: action.data.intensity || 0.2
      }
    } else if (action.data.animation === 'pulse') {
      animationData.pulse = {
        speed: action.data.speed,
        range: action.data.range || 2
      }
    }

    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: {
          isAnimated: true,
          animationData
        }
      }
    } as UpdateLightAction)
  }

  /**
   * Disable light animation
   */
  static disableLightAnimation(
    gameState: VTTGameState,
    action: VTTAction & { data: { lightId: string } }
  ): VTTGameState {
    return this.updateLight(gameState, {
      ...action,
      type: 'update_light',
      data: {
        lightId: action.data.lightId,
        updates: {
          isAnimated: false,
          animationData: undefined
        }
      }
    } as UpdateLightAction)
  }

  /**
   * Batch update multiple lights
   */
  static updateLightsBatch(
    gameState: VTTGameState,
    action: VTTAction & {
      data: {
        updates: Array<{ lightId: string, updates: Partial<Light> }>
      }
    }
  ): VTTGameState {
    let updatedState = gameState

    for (const update of action.data.updates) {
      updatedState = this.updateLight(updatedState, {
        ...action,
        type: 'update_light',
        data: update
      } as UpdateLightAction)
    }

    return updatedState
  }

  /**
   * Helper: Check if light is visible to player
   */
  static isLightVisibleToPlayer(light: Light, playerId: string, isGM: boolean): boolean {
    if (isGM) {
      // GM sees all lights (including light source meshes)
      return true
    }

    if (light.visibleTo === 'all') {
      // Players see light effect but not source mesh
      return true
    }

    if (light.visibleTo === 'gm') {
      return false
    }

    return false
  }
}
