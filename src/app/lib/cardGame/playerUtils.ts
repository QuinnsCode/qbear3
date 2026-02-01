// app/lib/game/playerUtils.ts

import type { CardGameState, MTGPlayer } from '@/app/services/cardGame/CardGameState'

export function getOpponents(players: MTGPlayer[], currentPlayerId: string): MTGPlayer[] {
  // Filter out current player
  const opponents = players.filter(p => p.id !== currentPlayerId)

  // Deduplicate by player ID (safety measure for any state corruption)
  const seen = new Set<string>()
  return opponents.filter(p => {
    if (seen.has(p.id)) {
      console.warn(`⚠️ Duplicate player detected in opponents: ${p.name} (${p.id})`)
      return false
    }
    seen.add(p.id)
    return true
  })
}

export function getViewedPlayer(
  gameState: CardGameState,
  currentPlayerId: string,
  selectedPlayerId: string | null,
  spectatorMode: boolean,
  currentPlayer: MTGPlayer | undefined
): MTGPlayer {
  if (spectatorMode) {
    return selectedPlayerId 
      ? gameState.players.find(p => p.id === selectedPlayerId) || gameState.players[0]
      : gameState.players[0]
  }
  
  return selectedPlayerId 
    ? gameState.players.find(p => p.id === selectedPlayerId) || currentPlayer!
    : currentPlayer!
}