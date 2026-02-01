// app/lib/cardGame/userRoleLogic.ts

import type { CardGameState } from '@/app/services/cardGame/CardGameState'

const MAX_PLAYERS_STANDARD = 4
const MAX_PLAYERS_SANDBOX = 256

interface UserRole {
  isSpectator: boolean
  isSandboxPlayer: boolean
  isPlayer: boolean
  currentPlayer: any | null
}

/**
 * Determines the user's role in the game based on their ID and game state
 */
export function determineUserRole(
  userId: string,
  gameState: CardGameState,
  isSandbox: boolean
): UserRole {
  const isSpectator = userId?.startsWith('spectator-') || userId?.startsWith('spectator_')
  const isSandboxPlayer = userId?.startsWith('sandbox-') || userId?.startsWith('sandbox_')
  const currentPlayer = gameState.players.find(p => p.id === userId) || null
  
  return {
    isSpectator,
    isSandboxPlayer,
    isPlayer: !!currentPlayer,
    currentPlayer
  }
}

/**
 * Determines if a user should automatically join the game
 */
export function shouldAutoJoinGame(
  userRole: UserRole,
  isLoggedIn: boolean,
  gameState: CardGameState,
  isSandbox: boolean
): boolean {
  // Spectators never auto-join
  if (userRole.isSpectator) return false
  
  // Already in game
  if (userRole.isPlayer) return false
  
  // Check if game is full
  const maxPlayers = isSandbox ? MAX_PLAYERS_SANDBOX : MAX_PLAYERS_STANDARD
  if (gameState.players.length >= maxPlayers) return false
  
  // Auto-join if logged in OR sandbox player
  return isLoggedIn || userRole.isSandboxPlayer
}

/**
 * Gets the maximum number of players for a game mode
 */
export function getMaxPlayers(isSandbox: boolean): number {
  return isSandbox ? MAX_PLAYERS_SANDBOX : MAX_PLAYERS_STANDARD
}