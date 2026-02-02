// src/app/services/cardGame/CardGameState.ts

/**
 * MTG COMMANDER VIRTUAL TABLETOP - Type Definitions
 * 
 * Core types for the card game state management system.
 * Designed for manual card manipulation without automatic rules enforcement.
 */

// ============================================================================
// CORE GAME STATE
// ============================================================================

export type CardGameState = {
  id: string
  status: 'active' // Always active, no separate lobby phase
  players: MTGPlayer[]
  cards: Record<string, Card> // Keyed by instanceId
  actions: CardGameAction[]
  currentActionIndex: number
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PLAYER
// ============================================================================

export type PlayerPosition = 'north' | 'east' | 'south' | 'west'

export type GridCell = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// Map positions to grid cells
export const POSITION_TO_CELL: Record<PlayerPosition, GridCell> = {
north: 2,
east: 6,
south: 8,
west: 4
}

// Cell layout info
export const GRID_LAYOUT = {
1: { row: 0, col: 0, type: 'empty' },
2: { row: 0, col: 1, type: 'player', position: 'north' },
3: { row: 0, col: 2, type: 'empty' },
4: { row: 1, col: 0, type: 'player', position: 'west' },
5: { row: 1, col: 1, type: 'preview' },
6: { row: 1, col: 2, type: 'player', position: 'east' },
7: { row: 2, col: 0, type: 'empty' },
8: { row: 2, col: 1, type: 'player', position: 'south' },
9: { row: 2, col: 2, type: 'empty' }
} as const

// Turn order: South (you) always first, then clockwise
export const PLAYER_POSITIONS: PlayerPosition[] = ['south', 'north', 'west', 'east'] as const

// Cursor colors
export const POSITION_COLORS: Record<PlayerPosition, string> = {
south: '#3B82F6',  // Blue (you)
north: '#EF4444',  // Red
west: '#10B981',   // Green
east: '#F59E0B'    // Yellow
}

export const COMMANDER_STARTING_LIFE = 40
export const MAX_PLAYERS = 4

export type MTGPlayer = {
  id: string
  name: string
  position: PlayerPosition
  cursorColor: string // Hex color for cursor rendering
  life: number // Starting at 40 for Commander
  
  // Deck data (for image caching)
  deckList?: {
    raw: string // Original import text
    deckName?: string
    scryfallIds: string[] // Parsed IDs (with duplicates for qty)
    cardData: ScryfallCard[] // Fetched card data
  }
  
  // Player zones
  zones: {
    library: string[]      // Card instanceIds (top = index 0)
    hand: string[]         // Card instanceIds
    battlefield: string[]  // Card instanceIds (position stored on card)
    graveyard: string[]    // Card instanceIds (ordered)
    exile: string[]        // Card instanceIds
    command: string[]      // Commander(s)
    sideboard?: string[]   // Sideboard cards (for Limited formats, optional for backwards compat)
  }

  gameStateInfo?: string
}

// ============================================================================
// CARD & TOKEN
// ============================================================================

export type ZoneType = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command' | 'sideboard'

export type TokenData = {
  name: string
  typeLine: string // e.g., "Artifact — Treasure" or "Creature — Clue"
  power?: string
  toughness?: string
  oracleText?: string
  colors?: string[]
  imageUrl?: string // From Scryfall if found, otherwise undefined
}

export type Card = {
  instanceId: string    // Unique instance ID
  scryfallId: string    // Scryfall card ID for data lookup
  ownerId: string       // Player who owns this card
  zone: ZoneType        // Current zone
  
  // Battlefield positioning (only relevant when zone='battlefield')
  position: { x: number, y: number }
  rotation: 0 | 90 | 180 | 270  // 0=untapped, 90=tapped, 180=upside down, 270=tapped other way
  isFaceUp: boolean
  
  // Optional metadata
  counters?: Record<string, number> // e.g., { "+1/+1": 3, "loyalty": 5 }
  attachedTo?: string // instanceId of card this is attached to (for auras/equipment)
  
  // Token support
  isToken?: boolean
  tokenData?: TokenData
}

// ============================================================================
// SCRYFALL DATA (for deck import)
// ============================================================================

export type ScryfallCard = {
  id: string // Scryfall ID
  name: string
  mana_cost?: string
  type_line: string
  oracle_text?: string
  power?: string
  toughness?: string
  colors?: string[]
  color_identity?: string[]
  
  // Image URLs
  image_uris?: {
    small?: string
    normal?: string
    large?: string
    png?: string
    art_crop?: string
    border_crop?: string
  }
  
  // For double-faced cards
  card_faces?: Array<{
    name: string
    mana_cost?: string
    type_line: string
    oracle_text?: string
    image_uris?: {
      small?: string
      normal?: string
      large?: string
      png?: string
    }
  }>
  
  // Additional useful fields
  set: string
  set_name: string
  collector_number: string
  rarity: string
  legalities?: Record<string, string>
}

// ============================================================================
// ACTIONS
// ============================================================================

export type CardGameAction = {
  id: string
  type: string
  playerId: string
  data: any
  timestamp: Date
  previousState?: any // Snapshot for replay/rewind
}

// Specific action types for type safety
export type ImportDeckAction = {
  type: 'import_deck'
  playerId: string
  data: {
    deckListText: string
  }
}

export type ShuffleLibraryAction = {
  type: 'shuffle_library'
  playerId: string
  data: {}
}

export type DrawCardsAction = {
  type: 'draw_cards'
  playerId: string
  data: {
    count: number
  }
}

export type MoveCardAction = {
  type: 'move_card'
  playerId: string
  data: {
    cardId: string
    fromZone: ZoneType
    toZone: ZoneType
    position?: { x: number, y: number } // Required for battlefield
    toIndex?: number // For ordered zones (library, graveyard)
  }
}

export type TapCardAction = {
  type: 'tap_card'
  playerId: string
  data: {
    cardId: string
  }
}

export type UntapCardAction = {
  type: 'untap_card'
  playerId: string
  data: {
    cardId: string
  }
}

export type FlipCardAction = {
  type: 'flip_card'
  playerId: string
  data: {
    cardId: string
  }
}

export type RotateCardAction = {
  type: 'rotate_card'
  playerId: string
  data: {
    cardId: string
    rotation: 0 | 90 | 180 | 270
  }
}

export type ResetGameAction = {
  type: 'reset_game'
  playerId: string
  data: {}
}

export type UpdateLifeAction = {
  type: 'update_life'
  playerId: string
  data: {
    life: number
  }
}

export type UpdateGameStateInfoAction = {
  type: 'update_game_state_info'
  playerId: string
  data: {
    gameStateInfo: string
  }
}

export type CreateTokenAction = {
  type: 'create_token'
  playerId: string
  data: {
    tokenData: TokenData
    position: { x: number, y: number }
  }
}

// Union type of all action types
export type TypedCardGameAction = 
  | ImportDeckAction
  | ShuffleLibraryAction
  | DrawCardsAction
  | MoveCardAction
  | TapCardAction
  | UntapCardAction
  | FlipCardAction
  | RotateCardAction
  | ResetGameAction
  | UpdateLifeAction
  | UpdateGameStateInfoAction
  | CreateTokenAction

// ============================================================================
// WEBSOCKET MESSAGES (ephemeral, not persisted)
// ============================================================================

export type WSMessage = 
  | { type: 'cursor_update', playerId: string, x: number, y: number, timestamp: number }
  | { type: 'player_joined', player: MTGPlayer }
  | { type: 'player_left', playerId: string }
  | { type: 'deck_imported', playerId: string, cardData: ScryfallCard[] }
  | { type: 'state_update', state: CardGameState }
  | { type: 'game_deleted', message: string }
  | { type: 'pong', timestamp: number }

// ============================================================================
// UTILITY TYPES
// ============================================================================

// For deck parsing
export type DeckListEntry = {
  quantity: number
  cardName: string
  set?: string
  collectorNumber?: string
}

// For validation
export type ValidationResult = {
  valid: boolean
  error?: string
}

// For card search/filtering
export type CardFilter = {
  ownerId?: string
  zone?: ZoneType
  isTapped?: boolean
  isFaceUp?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CURSOR_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'] as const // Blue, Red, Green, Yellow

export const ZONE_TYPES: ZoneType[] = ['library', 'hand', 'battlefield', 'graveyard', 'exile', 'command'] as const

export const ROTATION_VALUES = [0, 90, 180, 270] as const


// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isCard(obj: any): obj is Card {
  return (
    typeof obj === 'object' &&
    typeof obj.instanceId === 'string' &&
    typeof obj.scryfallId === 'string' &&
    typeof obj.ownerId === 'string' &&
    typeof obj.zone === 'string' &&
    ZONE_TYPES.includes(obj.zone)
  )
}

export function isMTGPlayer(obj: any): obj is MTGPlayer {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.position === 'string' &&
    PLAYER_POSITIONS.includes(obj.position)
  )
}

export function isValidRotation(rotation: number): rotation is 0 | 90 | 180 | 270 {
  return ROTATION_VALUES.includes(rotation as any)
}

/**
* Get the visual position of a player relative to the current player's view
* Current player always sees themselves at 'south' (bottom)
* Other players are rotated clockwise
*/
export function getRelativePosition(
  playerPosition: PlayerPosition,
  currentPlayerPosition: PlayerPosition
): PlayerPosition {
  const positions: PlayerPosition[] = ['south', 'west', 'north', 'east']
  
  const playerIndex = positions.indexOf(playerPosition)
  const currentIndex = positions.indexOf(currentPlayerPosition)
  
  // Rotate so current player is always at south (index 0)
  const relativeIndex = (playerIndex - currentIndex + 4) % 4
  
  return positions[relativeIndex]
}

/**
 * Get the grid cell for a position (for CSS Grid placement)
 */
export function getCellForPosition(position: PlayerPosition): GridCell {
  return POSITION_TO_CELL[position]
}