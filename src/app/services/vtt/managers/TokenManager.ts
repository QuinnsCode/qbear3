// src/app/services/vtt/managers/TokenManager.ts

import type {
  VTTGameState,
  VTTAction,
  Token,
  Vector3D,
  Quaternion,
  CreateTokenAction,
  MoveTokenAction,
  UpdateTokenAction,
  DeleteTokenAction
} from '../VTTGameState'
import {
  createIdentityQuaternion,
  createZeroVector,
  createDefaultScale
} from '../VTTGameState'

/**
 * TokenManager - Pure functions for token operations
 *
 * All functions follow immutable pattern:
 * - Take state + action
 * - Return new state (or same reference if no change)
 * - Use spread operators for shallow copies
 */

export class TokenManager {
  /**
   * Create a new token
   */
  static createToken(gameState: VTTGameState, action: CreateTokenAction): VTTGameState {
    const instanceId = crypto.randomUUID()

    const newToken: Token = {
      instanceId,
      name: action.data.name || 'Unnamed Token',
      type: action.data.type || 'prop',
      position: action.data.position || createZeroVector(),
      rotation: action.data.rotation || createIdentityQuaternion(),
      scale: action.data.scale || createDefaultScale(),
      modelUrl: action.data.modelUrl,
      color: action.data.color || this.getRandomColor(),
      avatar: undefined,
      opacity: 1,
      ownerId: action.data.ownerId || action.playerId,
      visibleTo: 'all',
      isHidden: false,
      isLocked: false,
      stats: {},
      notes: ''
    }

    // Add token to active scene
    const activeScene = gameState.scenes[gameState.activeSceneId]
    if (!activeScene) {
      console.warn('[TokenManager] No active scene found')
      return gameState
    }

    return {
      ...gameState,
      tokens: {
        ...gameState.tokens,
        [instanceId]: newToken
      },
      scenes: {
        ...gameState.scenes,
        [gameState.activeSceneId]: {
          ...activeScene,
          tokenIds: [...activeScene.tokenIds, instanceId]
        }
      },
      updatedAt: new Date()
    }
  }

  /**
   * Move a token to a new position
   */
  static moveToken(gameState: VTTGameState, action: MoveTokenAction): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]

    if (!token) {
      console.warn(`[TokenManager] Token not found: ${action.data.tokenId}`)
      return gameState
    }

    const updatedToken: Token = {
      ...token,
      position: action.data.position,
      rotation: action.data.rotation || token.rotation
    }

    return {
      ...gameState,
      tokens: {
        ...gameState.tokens,
        [action.data.tokenId]: updatedToken
      },
      updatedAt: new Date()
    }
  }

  /**
   * Update token properties
   */
  static updateToken(gameState: VTTGameState, action: UpdateTokenAction): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]

    if (!token) {
      console.warn(`[TokenManager] Token not found: ${action.data.tokenId}`)
      return gameState
    }

    const updatedToken: Token = {
      ...token,
      ...action.data.updates
    }

    return {
      ...gameState,
      tokens: {
        ...gameState.tokens,
        [action.data.tokenId]: updatedToken
      },
      updatedAt: new Date()
    }
  }

  /**
   * Delete a token
   */
  static deleteToken(gameState: VTTGameState, action: DeleteTokenAction): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]

    if (!token) {
      console.warn(`[TokenManager] Token not found: ${action.data.tokenId}`)
      return gameState
    }

    // Remove from tokens
    const { [action.data.tokenId]: removed, ...remainingTokens } = gameState.tokens

    // Remove from all scenes
    const updatedScenes: Record<string, any> = {}
    for (const [sceneId, scene] of Object.entries(gameState.scenes)) {
      updatedScenes[sceneId] = {
        ...scene,
        tokenIds: scene.tokenIds.filter(id => id !== action.data.tokenId)
      }
    }

    // Remove from player controlled tokens
    const updatedPlayers = gameState.players.map(player => ({
      ...player,
      controlledTokenIds: player.controlledTokenIds.filter(id => id !== action.data.tokenId)
    }))

    // Remove from GM controlled tokens (if GM exists)
    const updatedGM = gameState.gameMaster
      ? {
          ...gameState.gameMaster,
          controlledTokenIds: gameState.gameMaster.controlledTokenIds.filter(
            id => id !== action.data.tokenId
          )
        }
      : null

    return {
      ...gameState,
      tokens: remainingTokens,
      scenes: updatedScenes,
      players: updatedPlayers,
      gameMaster: updatedGM,
      updatedAt: new Date()
    }
  }

  /**
   * Batch move multiple tokens
   */
  static moveTokensBatch(
    gameState: VTTGameState,
    action: VTTAction & { data: { moves: Array<{ tokenId: string, position: Vector3D, rotation?: Quaternion }> } }
  ): VTTGameState {
    let updatedState = gameState

    for (const move of action.data.moves) {
      updatedState = this.moveToken(updatedState, {
        ...action,
        type: 'move_token',
        data: move
      } as MoveTokenAction)
    }

    return updatedState
  }

  /**
   * Set token visibility
   */
  static setTokenVisibility(
    gameState: VTTGameState,
    action: VTTAction & { data: { tokenId: string, visibleTo: Token['visibleTo'] } }
  ): VTTGameState {
    return this.updateToken(gameState, {
      ...action,
      type: 'update_token',
      data: {
        tokenId: action.data.tokenId,
        updates: { visibleTo: action.data.visibleTo }
      }
    } as UpdateTokenAction)
  }

  /**
   * Toggle token hidden state
   */
  static toggleTokenHidden(
    gameState: VTTGameState,
    action: VTTAction & { data: { tokenId: string } }
  ): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]

    if (!token) {
      return gameState
    }

    return this.updateToken(gameState, {
      ...action,
      type: 'update_token',
      data: {
        tokenId: action.data.tokenId,
        updates: { isHidden: !token.isHidden }
      }
    } as UpdateTokenAction)
  }

  /**
   * Toggle token locked state
   */
  static toggleTokenLocked(
    gameState: VTTGameState,
    action: VTTAction & { data: { tokenId: string } }
  ): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]

    if (!token) {
      return gameState
    }

    return this.updateToken(gameState, {
      ...action,
      type: 'update_token',
      data: {
        tokenId: action.data.tokenId,
        updates: { isLocked: !token.isLocked }
      }
    } as UpdateTokenAction)
  }

  /**
   * Update token stats (system-agnostic)
   */
  static updateTokenStats(
    gameState: VTTGameState,
    action: VTTAction & { data: { tokenId: string, stats: Record<string, any> } }
  ): VTTGameState {
    const token = gameState.tokens[action.data.tokenId]

    if (!token) {
      return gameState
    }

    return this.updateToken(gameState, {
      ...action,
      type: 'update_token',
      data: {
        tokenId: action.data.tokenId,
        updates: {
          stats: {
            ...token.stats,
            ...action.data.stats
          }
        }
      }
    } as UpdateTokenAction)
  }

  /**
   * Helper: Get random color for new tokens
   */
  private static getRandomColor(): string {
    const colors = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Orange
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316'  // Orange-red
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  /**
   * Helper: Check if token is visible to player
   */
  static isTokenVisibleToPlayer(token: Token, playerId: string, isGM: boolean): boolean {
    if (isGM) {
      // GM sees everything
      return true
    }

    if (token.isHidden) {
      // Hidden tokens only visible to GM
      return false
    }

    if (token.visibleTo === 'all') {
      return true
    }

    if (token.visibleTo === 'gm') {
      return false
    }

    if (Array.isArray(token.visibleTo)) {
      return token.visibleTo.includes(playerId)
    }

    return false
  }
}
