// @/src/app/lib/cardGame/cardGameFunctions.ts
// Pure backend functions - NO 'use server', called directly from server components

import { env } from "cloudflare:workers"
import type { CardGameState, MTGPlayer } from "@/app/services/cardGame/CardGameState"
import { deckGameCards, migrateDeck } from "@/app/types/Deck"
import { readDeck } from "@/lib/decks/deckStore"

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

/** Apply one action at a table as `playerId`. Callers decide who that is; this trusts them. */
export async function applyCardGameActionAs(cardGameId: string, playerId: string, type: string, data: unknown): Promise<CardGameState> {
  const stub = env.CARD_GAME_STATE_DO.get(env.CARD_GAME_STATE_DO.idFromName(cardGameId))
  const response = await stub.fetch(new Request('https://fake-host/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, playerId, data }),
  }))
  if (!response.ok) throw new Error(`Failed to apply action: ${await response.text()}`)
  return await response.json() as CardGameState
}

/**
 * Put one of `playerId`'s saved decks (deck builder or draft) into their seat at a table and
 * shuffle it. Their cards already at the table are replaced. 403 when they aren't seated there.
 */
export async function sitWithSavedDeck(cardGameId: string, playerId: string, deckId: string): Promise<
  { ok: true; libraryCount: number } | { ok: false; status: number; error: string }
> {
  const game = await getCardGameState(cardGameId)
  if (!game.players.some(p => p.id === playerId)) return { ok: false, status: 403, error: 'Sit at this table first' }

  // eqosys or DECKS_KV, wherever this person's decks live
  const stored = await readDeck(playerId, deckId)
  if (!stored) return { ok: false, status: 404, error: 'No such deck' }
  if (!Array.isArray(stored.deck.cards)) return { ok: false, status: 422, error: 'That deck has no cards' }
  const deck = migrateDeck(stored.deck) // a no-op for current decks
  const deckCards = deckGameCards(deck)
  if (deckCards.length === 0) return { ok: false, status: 422, error: 'That deck has no cards' }

  await applyCardGameActionAs(cardGameId, playerId, 'import_deck_direct', { deckName: deck.name, deckCards })
  const after = await applyCardGameActionAs(cardGameId, playerId, 'shuffle_library', {})
  const libraryCount = after.players.find(p => p.id === playerId)?.zones.library.length ?? 0
  return libraryCount > 0 ? { ok: true, libraryCount } : { ok: false, status: 422, error: 'The deck brought no cards to the table' }
}
