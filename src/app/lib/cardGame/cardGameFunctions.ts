// @/src/app/lib/cardGame/cardGameFunctions.ts
// Pure backend functions - NO 'use server', called directly from server components

import { env } from "cloudflare:workers"
import type { CardGameState, MTGPlayer } from "@/app/services/cardGame/CardGameState"

export async function getCardGameState(cardGameId: string): Promise<CardGameState> {
  if (!env?.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO binding not found')
  }

  try {
    const id = env.CARD_GAME_STATE_DO.idFromName(cardGameId)
    const stub = env.CARD_GAME_STATE_DO.get(id)
    
    const response = await stub.fetch(new Request('https://fake-host/', {
      method: 'GET'
    }))
    
    if (!response.ok) {
      throw new Error(`Failed to get card game state: ${response.status}`)
    }
    
    const gameState = await response.json() as CardGameState
    return gameState
  } catch (error) {
    console.error('Error getting card game state:', error)
    throw error
  }
}

export async function getCurrentCardGamePlayer(cardGameId: string, playerId: string): Promise<MTGPlayer | null> {
  const gameState = await getCardGameState(cardGameId)
  return gameState.players.find(p => p.id === playerId) || null
}

export async function joinCardGame(cardGameId: string, playerId: string, playerName: string): Promise<CardGameState> {
  if (!env?.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO binding not found')
  }

  try {
    const id = env.CARD_GAME_STATE_DO.idFromName(cardGameId)
    const stub = env.CARD_GAME_STATE_DO.get(id)
    
    const response = await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        playerName,
        gameId: cardGameId
      })
    }))
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to join card game: ${error}`)
    }
    
    const gameState = await response.json() as CardGameState
    return gameState
  } catch (error) {
    console.error('Error joining card game:', error)
    throw error
  }
}

export async function restartCardGame(cardGameId: string): Promise<CardGameState> {
  if (!env?.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO binding not found')
  }

  const id = env.CARD_GAME_STATE_DO.idFromName(cardGameId)
  const stub = env.CARD_GAME_STATE_DO.get(id)
  
  const response = await stub.fetch(new Request('https://fake-host/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restart_game' })
  }))
  
  return await response.json()
}