// app/serverActions/draft/makePick.ts
'use server'

import { requestInfo } from "rwsdk/worker"
import { drafterIn, pickCards } from "@/app/lib/draft/draftFunctions"

/** Pick for whoever this request belongs to. Callers may still pass a player id; it is ignored. */
export async function makePick(draftId: string, cardIds: string[], _playerId?: string) {
  const { ctx, request } = requestInfo
  const me = drafterIn(draftId, ctx, request.headers.get('cookie'))
  if (!me) return { success: false, error: 'Not drafting in this draft' }
  const result = await pickCards(draftId, me.id, cardIds)
  return result.ok ? { success: true } : { success: false, error: result.error }
}
