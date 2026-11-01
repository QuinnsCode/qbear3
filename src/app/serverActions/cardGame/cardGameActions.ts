// app/serverActions/cardGame/cardGameActions.ts
// Server actions - called from CLIENT components (has 'use server')
//
// Every export here is reachable from the browser with any arguments, so the acting player is
// always the session's user (ctx.user, which sandbox middleware also fills), never an argument.
'use server'

import * as lib from '@/app/lib/cardGame/cardGameFunctions'
import { env } from "cloudflare:workers"
import { requestInfo } from "rwsdk/worker"
import type { CardGameState } from "@/app/services/cardGame/CardGameState"
import { deleteCardGameCompletely } from "./cardGameRegistry"
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions"

function sessionPlayer(): { id: string, name: string } {
  const user = requestInfo.ctx.user
  if (!user?.id) throw new Error('Sign in to play')
  return { id: user.id, name: user.name || user.email || 'Player' }
}

export async function getCardGameState(cardGameId: string): Promise<CardGameState> {
  return lib.getCardGameState(cardGameId)
}

export async function joinCardGame(cardGameId: string): Promise<CardGameState> {
  const me = sessionPlayer()
  return lib.joinCardGame(cardGameId, me.id, me.name)
}

export async function restartCardGame(cardGameId: string): Promise<CardGameState> {
  const me = sessionPlayer()
  const state = await lib.getCardGameState(cardGameId)
  if (!state.players.some(p => p.id === me.id)) throw new Error('Only a player at this table can restart it')
  return lib.restartCardGame(cardGameId)
}

/** Delete a game from this lair. The lair comes from the subdomain, and the caller must be a member of it. */
export async function deleteCardGame(cardGameId: string): Promise<{ success: boolean, error?: string }> {
  const { ctx, request } = requestInfo
  const orgSlug = extractOrgFromSubdomain(request)
  if (!ctx.user?.id || !orgSlug || !ctx.organization || !ctx.userRole) {
    return { success: false, error: 'Only members of this lair can delete its games' }
  }
  return deleteCardGameCompletely(orgSlug, cardGameId)
}

export async function applyCardGameAction(
  cardGameId: string,
  action: { type: string, playerId?: string, data: unknown }
): Promise<CardGameState> {
  if (!env?.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO binding not found')
  }
  if (typeof action?.type !== 'string') throw new Error('Invalid action')

  // Callers still send playerId; it is replaced, not trusted.
  const body = { type: action.type, playerId: sessionPlayer().id, data: action.data }

  const id = env.CARD_GAME_STATE_DO.idFromName(cardGameId)
  const stub = env.CARD_GAME_STATE_DO.get(id)

  const response = await stub.fetch(new Request('https://fake-host/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }))

  if (!response.ok) {
    throw new Error(`Failed to apply action: ${await response.text()}`)
  }

  return await response.json() as CardGameState
}
