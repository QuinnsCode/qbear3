// app/serverActions/cardGame/cardGameActions.ts
// Server actions - called from CLIENT components (has 'use server')
//
// Every export here is reachable from the browser with any arguments, so the acting player is
// always the session's user (ctx.user, which sandbox middleware also fills), never an argument.
'use server'

import * as lib from '@/app/lib/cardGame/cardGameFunctions'
import { requestInfo } from "rwsdk/worker"
import type { CardGameState } from "@/app/services/cardGame/CardGameState"

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

export async function applyCardGameAction(
  cardGameId: string,
  action: { type: string, playerId?: string, data: unknown }
): Promise<CardGameState> {
  if (typeof action?.type !== 'string') throw new Error('Invalid action')
  // Callers still send playerId; it is replaced, not trusted.
  return lib.applyCardGameActionAs(cardGameId, sessionPlayer().id, action.type, action.data)
}
