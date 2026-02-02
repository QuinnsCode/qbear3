// src/vttDurableObject.ts

import { DurableObject } from 'cloudflare:workers'
import type {
  VTTGameState,
  VTTAction,
  VTTPlayer,
  Scene
} from '@/app/services/vtt/VTTGameState'
import { createIdentityQuaternion, createZeroVector } from '@/app/services/vtt/VTTGameState'
import { TokenManager } from '@/app/services/vtt/managers/TokenManager'
import { FogManager } from '@/app/services/vtt/managers/FogManager'
import { LightingManager } from '@/app/services/vtt/managers/LightingManager'
import { PermissionManager } from '@/app/services/vtt/managers/PermissionManager'

// Storage-only state (actions not stored to save space)
type StoredVTTState = VTTGameState

const CURSOR_THROTTLE_MS = 16 // Server-side cursor throttle (60fps)
const CAMERA_THROTTLE_MS = 100 // Camera updates less critical (10fps)
const INACTIVE_THRESHOLD_MS = 4 * 60 * 60 * 1000 // 4 hours for VTT sessions

/**
 * VTTDO - 3D Virtual Tabletop Durable Object
 *
 * Manages game state for 3D RPG sessions with real-time WebSocket sync.
 * Extends CardGameDO pattern with 3D-specific features.
 */
export class VTTDO extends DurableObject {
  private gameState: VTTGameState | null = null
  private gameId: string | null = null

  private lastCursorBroadcast: Map<string, number> = new Map()
  private lastCameraBroadcast: Map<string, number> = new Map()
  private playerActivity: Map<string, number> = new Map()
  private spectatorCount = 0

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)

    this.ctx.blockConcurrencyWhile(async () => {
      const initialized = await this.ctx.storage.get('initialized')
      if (!initialized) {
        await this.ctx.storage.put('initialized', true)
        await this.ctx.storage.put('createdAt', Date.now())
      }

      const storedActivity = await this.ctx.storage.get<Record<string, number>>('playerActivity')
      if (storedActivity) {
        this.playerActivity = new Map(Object.entries(storedActivity))
      }
    })

    // Schedule cleanup alarm (every 4 hours)
    this.ctx.storage.setAlarm(Date.now() + INACTIVE_THRESHOLD_MS)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    try {
      // WebSocket upgrade
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocketUpgrade(request)
      }

      // HTTP routes
      if (method === 'GET') {
        const state = await this.getState()

        // Filter state based on player role
        const playerId = request.headers.get('X-Auth-User-Id')
        const filteredState = playerId
          ? PermissionManager.filterStateForPlayer(state, playerId)
          : state

        return Response.json(filteredState)
      }

      if (method === 'POST') {
        const requestData = (await request.json()) as any

        // Join game
        if (requestData.playerName && !requestData.type) {
          const joinResult = await this.joinGame(requestData)
          this.updatePlayerActivity(requestData.playerId)
          return Response.json(joinResult)
        }

        // Action request
        if (requestData.type) {
          // Authorization check
          const authResult = PermissionManager.authorizeAction(
            await this.getState(),
            requestData
          )

          if (!authResult.authorized) {
            return Response.json({ error: authResult.error }, { status: 403 })
          }

          const result = await this.applyAction(requestData)
          this.updatePlayerActivity(requestData.playerId)
          return Response.json(result)
        }
      }

      if (method === 'DELETE') {
        // Wipe storage
        this.broadcast({ type: 'game_deleted', message: 'Game deleted' })
        this.closeAllWebSockets()
        await this.ctx.storage.deleteAll()
        this.gameState = null
        this.playerActivity.clear()
        return Response.json({ success: true })
      }

      return new Response('Method not allowed', { status: 405 })
    } catch (error: any) {
      console.error('[VTTDO] Error:', error)
      return new Response(`Error: ${error?.message || error}`, { status: 500 })
    }
  }

  /**
   * Handle WebSocket upgrade with Hibernation API
   */
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    const playerId = request.headers.get('X-Auth-User-Id') || `guest-${crypto.randomUUID()}`
    const playerName = request.headers.get('X-Auth-User-Name') || 'Guest'
    const isSpectator = !request.headers.has('X-Auth-User-Id')

    // Check if player is GM
    const state = await this.getState()
    const isGM = state.gameMaster?.id === playerId

    // Tags: type, playerId, playerName, isSpectator, isGM
    this.ctx.acceptWebSocket(server, [
      'vtt-player',
      playerId,
      playerName,
      isSpectator ? '1' : '0',
      isGM ? '1' : '0'
    ])

    if (isSpectator) {
      this.spectatorCount++
    }

    // Send initial state (filtered for player)
    const filteredState = isGM ? state : PermissionManager.filterStateForPlayer(state, playerId)
    server.send(JSON.stringify({ type: 'state_update', state: filteredState }))

    return new Response(null, { status: 101, webSocket: client })
  }

  /**
   * Handle WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const messageString =
      typeof message === 'string' ? message : new TextDecoder().decode(message)

    const tags = this.ctx.getTags(ws)
    const playerId = tags[1]
    const isSpectator = tags[3] === '1'
    const isGM = tags[4] === '1'

    try {
      const data = JSON.parse(messageString)

      // Ping/pong
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        return
      }

      // Cursor update (3D position + optional target)
      if (data.type === 'cursor_move') {
        if (isSpectator) return

        this.updatePlayerActivity(playerId)

        const now = Date.now()
        const lastBroadcast = this.lastCursorBroadcast.get(playerId) || 0

        if (now - lastBroadcast >= CURSOR_THROTTLE_MS) {
          this.lastCursorBroadcast.set(playerId, now)
          this.broadcastExcept(
            {
              type: 'cursor_update',
              playerId,
              position: data.position,
              target: data.target,
              timestamp: now
            },
            playerId
          )
        }

        return
      }

      // Camera update (ephemeral, only to GM)
      if (data.type === 'camera_update') {
        if (isSpectator) return

        const now = Date.now()
        const lastBroadcast = this.lastCameraBroadcast.get(playerId) || 0

        if (now - lastBroadcast >= CAMERA_THROTTLE_MS) {
          this.lastCameraBroadcast.set(playerId, now)

          // Only broadcast to GM for monitoring
          this.broadcastToRole('gm', {
            type: 'camera_update',
            playerId,
            position: data.position,
            rotation: data.rotation,
            timestamp: now
          })
        }

        return
      }

      // Action request
      if (data.type && data.playerId) {
        // Authorization check
        const authResult = PermissionManager.authorizeAction(await this.getState(), data)

        if (!authResult.authorized) {
          ws.send(JSON.stringify({ type: 'error', error: authResult.error }))
          return
        }

        await this.applyAction(data)
        this.updatePlayerActivity(playerId)
        return
      }
    } catch (e) {
      console.error('[VTTDO] Failed to parse message:', e)
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }))
    }
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    const tags = this.ctx.getTags(ws)
    const playerId = tags[1]
    const playerName = tags[2]
    const isSpectator = tags[3] === '1'

    if (isSpectator) {
      this.spectatorCount--
      console.log(`[VTTDO] Spectator ${playerName} disconnected (${this.spectatorCount} remaining)`)
    } else {
      console.log(`[VTTDO] Player ${playerName} (${playerId}) disconnected`)
      this.broadcast({ type: 'player_left', playerId })
    }
  }

  /**
   * Handle WebSocket error
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[VTTDO] WebSocket error:', error)
  }

  /**
   * Handle scheduled cleanup alarm
   */
  async alarm(): Promise<void> {
    console.log('[VTTDO] Running cleanup alarm')

    const now = Date.now()

    // Remove inactive players
    for (const [playerId, lastActivity] of this.playerActivity.entries()) {
      if (now - lastActivity > INACTIVE_THRESHOLD_MS) {
        console.log(`[VTTDO] Removing inactive player: ${playerId}`)
        this.playerActivity.delete(playerId)
      }
    }

    await this.ctx.storage.put(
      'playerActivity',
      Object.fromEntries(this.playerActivity)
    )

    // Schedule next alarm
    this.ctx.storage.setAlarm(now + INACTIVE_THRESHOLD_MS)
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Get current game state (load if needed)
   */
  async getState(): Promise<VTTGameState> {
    if (!this.gameState) {
      await this.loadState()
    }

    if (!this.gameState) {
      this.gameState = await this.createDefaultGame(this.gameId)
    }

    return this.gameState
  }

  /**
   * Load state from storage
   */
  async loadState(): Promise<void> {
    const stored = await this.ctx.storage.get<StoredVTTState>('vttGameState')

    if (stored) {
      this.gameState = {
        ...stored,
        createdAt: new Date(stored.createdAt),
        updatedAt: new Date(stored.updatedAt)
      }

      // Recreate Sets (they're serialized as arrays)
      for (const scene of Object.values(this.gameState.scenes)) {
        if (Array.isArray(scene.fogState.revealedChunks)) {
          scene.fogState.revealedChunks = new Set(scene.fogState.revealedChunks as any)
        }
      }
    }
  }

  /**
   * Create default game state
   */
  async createDefaultGame(gameId?: string): Promise<VTTGameState> {
    const id = gameId || this.ctx.id.toString()

    // Create default scene
    const defaultSceneId = crypto.randomUUID()

    const defaultScene: Scene = {
      id: defaultSceneId,
      name: 'Main Scene',
      ambientLight: { color: '#ffffff', intensity: 0.5 },
      backgroundColor: '#1a1a1a',
      gridEnabled: true,
      gridSize: 5,
      gridColor: '#444444',
      tokenIds: [],
      terrainIds: [],
      lightIds: [],
      fogState: {
        enabled: false,
        mode: 'grid',
        gridSize: 10,
        revealedChunks: new Set(),
        visionTokens: {}
      }
    }

    this.gameState = {
      id,
      status: 'lobby',
      gameSystem: {
        name: 'Generic',
        version: '1.0'
      },
      gameMaster: null,
      players: [],
      tokens: {},
      terrain: {},
      lights: {},
      scenes: {
        [defaultSceneId]: defaultScene
      },
      activeSceneId: defaultSceneId,
      fogOfWar: defaultScene.fogState,
      combat: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.persist()
    return this.gameState
  }

  /**
   * Join game as player or GM
   */
  async joinGame(data: {
    playerId: string
    playerName: string
    role?: 'gm' | 'player'
  }): Promise<VTTGameState> {
    if (!this.gameState) {
      await this.getState()
    }

    // Check if player already exists
    const existingPlayer = this.gameState!.players.find(p => p.id === data.playerId)
    if (existingPlayer) {
      this.broadcast({ type: 'player_rejoined', player: existingPlayer })
      return this.gameState!
    }

    // Assign role (first player is GM, others are players)
    const role = data.role || (this.gameState!.gameMaster ? 'player' : 'gm')

    const newPlayer: VTTPlayer = {
      id: data.playerId,
      name: data.playerName,
      role,
      cursorColor: this.getNextCursorColor(),
      controlledTokenIds: []
    }

    if (role === 'gm') {
      this.gameState!.gameMaster = newPlayer
    } else {
      this.gameState!.players.push(newPlayer)
    }

    this.gameState!.updatedAt = new Date()
    this.persist()

    this.broadcast({ type: 'player_joined', player: newPlayer })

    return this.gameState!
  }

  /**
   * Apply an action to the game state
   */
  async applyAction(action: VTTAction): Promise<VTTGameState> {
    if (!this.gameState) {
      await this.getState()
    }

    const newState = this.reduceAction(this.gameState!, action)

    if (newState !== this.gameState) {
      this.gameState = newState
      this.gameState.updatedAt = new Date()

      this.persist()
      this.broadcastStateUpdate()
    }

    return this.gameState!
  }

  /**
   * Reduce action to new state (immutable)
   */
  private reduceAction(gameState: VTTGameState, action: VTTAction): VTTGameState {
    switch (action.type) {
      // Token actions
      case 'move_token':
        return TokenManager.moveToken(gameState, action as any)

      case 'create_token':
        return TokenManager.createToken(gameState, action as any)

      case 'update_token':
        return TokenManager.updateToken(gameState, action as any)

      case 'delete_token':
        return TokenManager.deleteToken(gameState, action as any)

      // Lighting actions
      case 'create_light':
        return LightingManager.createLight(gameState, action as any)

      case 'update_light':
        return LightingManager.updateLight(gameState, action as any)

      case 'delete_light':
        return LightingManager.deleteLight(gameState, action as any)

      // Fog of war actions
      case 'reveal_fog':
        return FogManager.revealFog(gameState, action as any)

      case 'hide_fog':
        return FogManager.hideFog(gameState, action as any)

      default:
        console.warn(`[VTTDO] Unknown action type: ${action.type}`)
        return gameState
    }
  }

  /**
   * Persist state to storage
   */
  private persist(): void {
    if (this.gameState) {
      // Convert Sets to arrays for serialization
      const serializableState = {
        ...this.gameState,
        scenes: Object.fromEntries(
          Object.entries(this.gameState.scenes).map(([id, scene]) => [
            id,
            {
              ...scene,
              fogState: {
                ...scene.fogState,
                revealedChunks: Array.from(scene.fogState.revealedChunks)
              }
            }
          ])
        )
      }

      this.ctx.storage.put('vttGameState', serializableState)
    }
  }

  // ==========================================================================
  // BROADCASTING
  // ==========================================================================

  /**
   * Broadcast to all connected clients
   */
  private broadcast(message: any): void {
    const jsonString = JSON.stringify(message)
    const sockets = this.ctx.getWebSockets()

    for (const ws of sockets) {
      try {
        ws.send(jsonString)
      } catch (error) {
        console.error('[VTTDO] Failed to send:', error)
      }
    }
  }

  /**
   * Broadcast to all except one player
   */
  private broadcastExcept(message: any, excludePlayerId: string): void {
    const jsonString = JSON.stringify(message)
    const sockets = this.ctx.getWebSockets()

    for (const ws of sockets) {
      const tags = this.ctx.getTags(ws)
      const wsPlayerId = tags[1]

      if (wsPlayerId === excludePlayerId) continue

      try {
        ws.send(jsonString)
      } catch (error) {
        console.error('[VTTDO] Failed to send:', error)
      }
    }
  }

  /**
   * Broadcast to specific role (gm or player)
   */
  private broadcastToRole(role: 'gm' | 'player', message: any): void {
    const jsonString = JSON.stringify(message)
    const sockets = this.ctx.getWebSockets()

    for (const ws of sockets) {
      const tags = this.ctx.getTags(ws)
      const isGM = tags[4] === '1'

      if ((role === 'gm' && isGM) || (role === 'player' && !isGM)) {
        try {
          ws.send(jsonString)
        } catch (error) {
          console.error('[VTTDO] Failed to send:', error)
        }
      }
    }
  }

  /**
   * Broadcast state update (filtered per player)
   */
  private broadcastStateUpdate(): void {
    const sockets = this.ctx.getWebSockets()

    for (const ws of sockets) {
      const tags = this.ctx.getTags(ws)
      const playerId = tags[1]
      const isGM = tags[4] === '1'

      const state = isGM
        ? this.gameState
        : PermissionManager.filterStateForPlayer(this.gameState!, playerId)

      try {
        ws.send(JSON.stringify({ type: 'state_update', state }))
      } catch (error) {
        console.error('[VTTDO] Failed to send state update:', error)
      }
    }
  }

  /**
   * Close all WebSocket connections
   */
  private closeAllWebSockets(): void {
    const sockets = this.ctx.getWebSockets()
    for (const ws of sockets) {
      try {
        ws.close(1000, 'Game deleted')
      } catch (error) {
        console.error('[VTTDO] Failed to close:', error)
      }
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Get next cursor color for new player
   */
  private getNextCursorColor(): string {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6']
    const usedColors = this.gameState!.players.map(p => p.cursorColor)
    return colors.find(c => !usedColors.includes(c)) || colors[0]
  }

  /**
   * Update player activity timestamp
   */
  private updatePlayerActivity(playerId: string): void {
    this.playerActivity.set(playerId, Date.now())
    this.ctx.storage.put('playerActivity', Object.fromEntries(this.playerActivity))
  }
}

export default VTTDO
