// src/app/services/vtt/managers/PermissionManager.ts

import type { VTTGameState, VTTAction, Token } from '../VTTGameState'

/**
 * PermissionManager - Authorization checks for VTT actions
 *
 * Enforces GM vs player permissions to prevent unauthorized actions.
 */

export class PermissionManager {
  /**
   * Check if a player can perform an action
   */
  static canPerformAction(gameState: VTTGameState, action: VTTAction): boolean {
    const playerId = action.playerId
    const isGM = this.isGameMaster(gameState, playerId)

    switch (action.type) {
      // ========================================================================
      // GM-ONLY ACTIONS
      // ========================================================================
      case 'reveal_fog':
      case 'hide_fog':
      case 'toggle_fog':
      case 'clear_all_fog':
      case 'reset_fog':
        return isGM

      case 'create_light':
      case 'update_light':
      case 'delete_light':
        return isGM

      case 'switch_scene':
        return isGM

      case 'update_combat':
      case 'next_turn':
      case 'previous_turn':
        return isGM

      case 'set_token_visibility':
      case 'toggle_token_hidden':
        return isGM

      // ========================================================================
      // TOKEN ACTIONS (requires ownership or GM)
      // ========================================================================
      case 'move_token': {
        const tokenId = (action as any).data.tokenId
        return this.canModifyToken(gameState, playerId, tokenId, isGM)
      }

      case 'update_token': {
        const tokenId = (action as any).data.tokenId
        return this.canModifyToken(gameState, playerId, tokenId, isGM)
      }

      case 'delete_token': {
        const tokenId = (action as any).data.tokenId
        return this.canModifyToken(gameState, playerId, tokenId, isGM)
      }

      case 'update_token_stats': {
        const tokenId = (action as any).data.tokenId
        return this.canModifyToken(gameState, playerId, tokenId, isGM)
      }

      case 'toggle_token_locked': {
        const tokenId = (action as any).data.tokenId
        // Only GM can lock/unlock
        return isGM
      }

      // ========================================================================
      // CREATE ACTIONS (anyone can create, owner is assigned)
      // ========================================================================
      case 'create_token':
        return true // Anyone can create tokens (owner will be set to creator)

      // ========================================================================
      // DEFAULT DENY
      // ========================================================================
      default:
        console.warn(`[PermissionManager] Unknown action type: ${action.type}`)
        return isGM // Unknown actions default to GM-only
    }
  }

  /**
   * Check if player is the game master
   */
  static isGameMaster(gameState: VTTGameState, playerId: string): boolean {
    return gameState.gameMaster?.id === playerId
  }

  /**
   * Check if player can modify a token
   */
  static canModifyToken(
    gameState: VTTGameState,
    playerId: string,
    tokenId: string,
    isGM: boolean
  ): boolean {
    // GM can modify anything
    if (isGM) {
      return true
    }

    const token = gameState.tokens[tokenId]
    if (!token) {
      console.warn(`[PermissionManager] Token not found: ${tokenId}`)
      return false
    }

    // Token is locked - only GM can modify
    if (token.isLocked) {
      return false
    }

    // Check ownership
    return this.isTokenOwner(gameState, playerId, tokenId)
  }

  /**
   * Check if player owns a token
   */
  static isTokenOwner(gameState: VTTGameState, playerId: string, tokenId: string): boolean {
    const token = gameState.tokens[tokenId]
    if (!token) {
      return false
    }

    // Direct ownership
    if (token.ownerId === playerId) {
      return true
    }

    // Check if token is in player's controlled list
    const player = gameState.players.find(p => p.id === playerId)
    if (player && player.controlledTokenIds.includes(tokenId)) {
      return true
    }

    // Check GM controlled tokens
    if (gameState.gameMaster && gameState.gameMaster.controlledTokenIds.includes(tokenId)) {
      return gameState.gameMaster.id === playerId
    }

    return false
  }

  /**
   * Check if player can see a token
   */
  static canSeeToken(gameState: VTTGameState, playerId: string, tokenId: string): boolean {
    const isGM = this.isGameMaster(gameState, playerId)
    const token = gameState.tokens[tokenId]

    if (!token) {
      return false
    }

    // GM sees everything
    if (isGM) {
      return true
    }

    // Hidden tokens only visible to GM
    if (token.isHidden) {
      return false
    }

    // Check visibility settings
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

  /**
   * Check if player can see fog state (only GM sees full fog state)
   */
  static canSeeFogState(gameState: VTTGameState, playerId: string): boolean {
    return this.isGameMaster(gameState, playerId)
  }

  /**
   * Check if player can see light sources (GM sees light meshes, players just see effect)
   */
  static canSeeLightSource(gameState: VTTGameState, playerId: string): boolean {
    return this.isGameMaster(gameState, playerId)
  }

  /**
   * Check if player can control combat tracker
   */
  static canControlCombat(gameState: VTTGameState, playerId: string): boolean {
    return this.isGameMaster(gameState, playerId)
  }

  /**
   * Check if player can switch scenes
   */
  static canSwitchScenes(gameState: VTTGameState, playerId: string): boolean {
    return this.isGameMaster(gameState, playerId)
  }

  /**
   * Get filtered state for player (hide GM-only data)
   */
  static filterStateForPlayer(gameState: VTTGameState, playerId: string): VTTGameState {
    const isGM = this.isGameMaster(gameState, playerId)

    if (isGM) {
      // GM sees everything
      return gameState
    }

    // Filter hidden tokens
    const visibleTokens: Record<string, Token> = {}
    for (const [tokenId, token] of Object.entries(gameState.tokens)) {
      if (this.canSeeToken(gameState, playerId, tokenId)) {
        // Hide GM notes from players
        visibleTokens[tokenId] = {
          ...token,
          notes: undefined
        }
      }
    }

    // Hide light sources (players see effect but not source meshes)
    const visibleLights = Object.fromEntries(
      Object.entries(gameState.lights).filter(
        ([_, light]) => light.visibleTo === 'all'
      )
    )

    return {
      ...gameState,
      tokens: visibleTokens,
      lights: visibleLights
    }
  }

  /**
   * Authorize action and return error message if denied
   */
  static authorizeAction(
    gameState: VTTGameState,
    action: VTTAction
  ): { authorized: boolean; error?: string } {
    if (this.canPerformAction(gameState, action)) {
      return { authorized: true }
    }

    const isGM = this.isGameMaster(gameState, action.playerId)

    // Specific error messages
    switch (action.type) {
      case 'move_token':
      case 'update_token':
      case 'delete_token': {
        const tokenId = (action as any).data.tokenId
        const token = gameState.tokens[tokenId]

        if (!token) {
          return { authorized: false, error: 'Token not found' }
        }

        if (token.isLocked) {
          return { authorized: false, error: 'Token is locked (GM only)' }
        }

        return { authorized: false, error: 'You do not own this token' }
      }

      case 'reveal_fog':
      case 'hide_fog':
      case 'create_light':
      case 'update_light':
      case 'delete_light':
      case 'switch_scene':
        return { authorized: false, error: 'GM-only action' }

      default:
        return { authorized: false, error: 'Permission denied' }
    }
  }
}
