// app/serverActions/cardGame/cardGameActions.ts
// Server actions - called from CLIENT components (has 'use server')
'use server'

import * as lib from '@/app/lib/cardGame/cardGameFunctions'
import { env } from "cloudflare:workers"
import type { CardGameState } from "@/app/services/cardGame/CardGameState"

export async function getCardGameState(cardGameId: string): Promise<CardGameState> {
  return lib.getCardGameState(cardGameId)
}

export async function getCurrentCardGamePlayer(cardGameId: string, playerId: string) {
  return lib.getCurrentCardGamePlayer(cardGameId, playerId)
}

export async function joinCardGame(cardGameId: string, playerId: string, playerName: string): Promise<CardGameState> {
  return lib.joinCardGame(cardGameId, playerId, playerName)
}

export async function restartCardGame(cardGameId: string): Promise<CardGameState> {
  return lib.restartCardGame(cardGameId)
}

export async function applyCardGameAction(
  cardGameId: string, 
  action: { type: string, playerId: string, data: any }
): Promise<CardGameState> {
  if (!env?.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO binding not found')
  }

  try {
    const id = env.CARD_GAME_STATE_DO.idFromName(cardGameId)
    const stub = env.CARD_GAME_STATE_DO.get(id)
    
    const response = await stub.fetch(new Request('https://fake-host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    }))
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to apply action: ${error}`)
    }
    
    const gameState = await response.json() as CardGameState
    return gameState
  } catch (error) {
    console.error('Error applying card game action:', error)
    throw error
  }
}