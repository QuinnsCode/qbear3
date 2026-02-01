// app/lib/game/playerUtils.ts

import type { CardGameState, MTGPlayer } from '@/app/services/cardGame/CardGameState'

export function getOpponents(players: MTGPlayer[], currentPlayerId: string): MTGPlayer[] {
  return players.filter(p => p.id !== currentPlayerId)
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