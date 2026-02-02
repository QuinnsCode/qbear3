// src/app/services/vtt/VTTGameState.ts

/**
 * 3D Virtual Tabletop State Types
 *
 * Generic RPG system for D&D, Pathfinder, Call of Cthulhu, etc.
 * Optimized for 4-8 players with real-time WebSocket sync.
 */

// ============================================================================
// CORE STATE
// ============================================================================

export type VTTGameState = {
  id: string
  status: 'lobby' | 'active' | 'paused'
  gameSystem: RPGSystem

  // Participants
  gameMaster: VTTPlayer | null
  players: VTTPlayer[]

  // 3D Entities (keyed by instanceId)
  tokens: Record<string, Token>
  terrain: Record<string, Terrain>
  lights: Record<string, Light>

  // Scenes (multiple maps)
  scenes: Record<string, Scene>
  activeSceneId: string

  // GM Tools
  fogOfWar: FogState
  combat: CombatState | null

  // Metadata
  createdAt: Date
  updatedAt: Date
}

export type RPGSystem = {
  name: string           // "D&D 5e", "Pathfinder 2e", "Call of Cthulhu", "Generic"
  version?: string       // "5th Edition", "2e", etc.
  customRules?: Record<string, any> // System-specific data
}

export type VTTPlayer = {
  id: string
  name: string
  role: 'gm' | 'player'
  cursorColor: string    // Hex color for 3D cursor
  controlledTokenIds: string[] // Tokens this player controls
}

// ============================================================================
// 3D MATH TYPES
// ============================================================================

export type Vector3D = {
  x: number
  y: number
  z: number
}

export type Quaternion = {
  x: number
  y: number
  z: number
  w: number
}

// ============================================================================
// ENTITIES
// ============================================================================

export type Token = {
  instanceId: string
  name: string
  type: 'pc' | 'npc' | 'monster' | 'prop'

  // 3D Transform
  position: Vector3D
  rotation: Quaternion
  scale: Vector3D

  // Visual
  modelUrl?: string      // GLB/GLTF model URL
  color?: string         // Fallback hex color
  avatar?: string        // 2D image URL (billboard mode)
  opacity: number        // 0-1 for transparency

  // Ownership & Visibility
  ownerId: string        // Player who controls this token
  visibleTo: 'all' | 'gm' | string[] // Visibility control
  isHidden: boolean      // Hidden from players
  isLocked: boolean      // Prevent movement

  // Stats (optional, system-agnostic)
  stats?: Record<string, any> // e.g., { hp: 50, maxHp: 100, ac: 15 }
  notes?: string         // GM notes
}

export type Terrain = {
  instanceId: string
  name: string
  type: 'wall' | 'floor' | 'building' | 'stairs' | 'door' | 'custom'

  // 3D Transform
  position: Vector3D
  rotation: Quaternion
  scale: Vector3D

  // Visual
  modelUrl?: string
  color?: string
  textureUrl?: string

  // Physics
  hasCollision: boolean
  blocksLineOfSight: boolean // For fog of war

  // Interaction
  isInteractive: boolean
  interactionState?: Record<string, any> // e.g., { open: true }

  // Metadata
  isHidden: boolean
  isLocked: boolean
}

export type Light = {
  instanceId: string
  name: string
  type: 'point' | 'directional' | 'spotlight' | 'ambient'

  // 3D Position
  position: Vector3D
  rotation?: Quaternion  // For directional/spotlight

  // Light properties
  color: string          // Hex color
  intensity: number      // 0-1
  range: number          // In world units

  // Advanced
  castShadows: boolean
  angle?: number         // For spotlights (degrees)
  decay?: number         // Light falloff

  // Visibility & Animation
  visibleTo: 'all' | 'gm' // GM can see light sources, players just see effect
  isEnabled: boolean
  isAnimated: boolean
  animationData?: {
    flicker?: { speed: number, intensity: number }
    pulse?: { speed: number, range: number }
  }
}

// ============================================================================
// FOG OF WAR
// ============================================================================

export type FogState = {
  enabled: boolean
  mode: 'grid'           // Chunk-based fog (10x10 unit chunks)
  gridSize: number       // Size of each fog chunk in world units (default: 10)
  revealedChunks: Set<string> // "x,y" coordinates of revealed cells
  visionTokens: Record<string, TokenVision> // Which tokens provide vision
}

export type TokenVision = {
  tokenId: string
  range: number          // Vision range in world units
  shape: 'circle' | 'cone' | 'square'
  angle?: number         // For cone vision (degrees)
}

// ============================================================================
// SCENES
// ============================================================================

export type Scene = {
  id: string
  name: string
  description?: string

  // Environment
  skyboxUrl?: string
  ambientLight: { color: string, intensity: number }
  backgroundColor: string

  // Grid settings
  gridEnabled: boolean
  gridSize: number       // Size of grid cells in world units
  gridColor: string

  // Bounds (for camera limits)
  bounds?: {
    min: Vector3D
    max: Vector3D
  }

  // Entity references (not duplicated data, just IDs)
  tokenIds: string[]
  terrainIds: string[]
  lightIds: string[]

  // Scene-specific fog
  fogState: FogState
}

// ============================================================================
// COMBAT TRACKER
// ============================================================================

export type CombatState = {
  isActive: boolean
  round: number
  turnIndex: number
  initiativeOrder: InitiativeEntry[]
}

export type InitiativeEntry = {
  tokenId: string
  initiative: number
  hasActed: boolean
}

// ============================================================================
// ACTIONS
// ============================================================================

export type VTTAction = {
  id: string
  type: string
  playerId: string
  data: any
  timestamp: Date
}

// Specific action types
export type MoveTokenAction = VTTAction & {
  type: 'move_token'
  data: {
    tokenId: string
    position: Vector3D
    rotation?: Quaternion
  }
}

export type CreateTokenAction = VTTAction & {
  type: 'create_token'
  data: {
    name: string
    type: Token['type']
    position: Vector3D
    rotation?: Quaternion
    scale?: Vector3D
    modelUrl?: string
    color?: string
    ownerId: string
  }
}

export type UpdateTokenAction = VTTAction & {
  type: 'update_token'
  data: {
    tokenId: string
    updates: Partial<Token>
  }
}

export type DeleteTokenAction = VTTAction & {
  type: 'delete_token'
  data: {
    tokenId: string
  }
}

export type CreateLightAction = VTTAction & {
  type: 'create_light'
  data: {
    name: string
    type: Light['type']
    position: Vector3D
    color: string
    intensity: number
    range: number
  }
}

export type UpdateLightAction = VTTAction & {
  type: 'update_light'
  data: {
    lightId: string
    updates: Partial<Light>
  }
}

export type DeleteLightAction = VTTAction & {
  type: 'delete_light'
  data: {
    lightId: string
  }
}

export type RevealFogAction = VTTAction & {
  type: 'reveal_fog'
  data: {
    sceneId: string
    chunks: string[]       // ["5,3", "5,4"] - chunk coordinates
  }
}

export type HideFogAction = VTTAction & {
  type: 'hide_fog'
  data: {
    sceneId: string
    chunks: string[]
  }
}

export type SwitchSceneAction = VTTAction & {
  type: 'switch_scene'
  data: {
    sceneId: string
  }
}

export type UpdateCombatAction = VTTAction & {
  type: 'update_combat'
  data: {
    updates: Partial<CombatState>
  }
}

export type NextTurnAction = VTTAction & {
  type: 'next_turn'
  data: {}
}

export type PreviousTurnAction = VTTAction & {
  type: 'previous_turn'
  data: {}
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export type VTTWSMessage =
  | { type: 'state_update', state: VTTGameState }
  | { type: 'cursor_update', playerId: string, position: Vector3D, target?: Vector3D }
  | { type: 'camera_update', playerId: string, position: Vector3D, rotation: Quaternion }
  | { type: 'player_joined', player: VTTPlayer }
  | { type: 'player_left', playerId: string }
  | { type: 'token_moved', tokenId: string, position: Vector3D, rotation?: Quaternion }
  | { type: 'fog_revealed', sceneId: string, chunks: string[] }
  | { type: 'fog_hidden', sceneId: string, chunks: string[] }
  | { type: 'light_updated', lightId: string, updates: Partial<Light> }
  | { type: 'scene_switched', sceneId: string }
  | { type: 'combat_updated', updates: Partial<CombatState> }
  | { type: 'ping' }
  | { type: 'pong', timestamp: number }
  | { type: 'error', error: string }

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create default quaternion (no rotation)
 */
export function createIdentityQuaternion(): Quaternion {
  return { x: 0, y: 0, z: 0, w: 1 }
}

/**
 * Create default Vector3D (origin)
 */
export function createZeroVector(): Vector3D {
  return { x: 0, y: 0, z: 0 }
}

/**
 * Create default scale Vector3D (1:1:1)
 */
export function createDefaultScale(): Vector3D {
  return { x: 1, y: 1, z: 1 }
}

/**
 * Get fog chunk coordinate from world position
 */
export function getFogChunkCoordinate(position: Vector3D, chunkSize: number): string {
  const chunkX = Math.floor(position.x / chunkSize)
  const chunkZ = Math.floor(position.z / chunkSize)
  return `${chunkX},${chunkZ}`
}

/**
 * Parse fog chunk coordinate string
 */
export function parseFogChunkCoordinate(chunk: string): { x: number, z: number } {
  const [x, z] = chunk.split(',').map(Number)
  return { x, z }
}

/**
 * Get adjacent fog chunks (3x3 grid around token)
 */
export function getAdjacentFogChunks(position: Vector3D, chunkSize: number): string[] {
  const center = getFogChunkCoordinate(position, chunkSize)
  const { x, z } = parseFogChunkCoordinate(center)

  const chunks: string[] = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      chunks.push(`${x + dx},${z + dz}`)
    }
  }
  return chunks
}
