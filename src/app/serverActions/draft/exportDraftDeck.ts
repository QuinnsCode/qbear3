// app/serverActions/draft/exportDraftDeck.ts
'use server'

import { requestInfo } from 'rwsdk/worker'
import { drafterIn, parseDeckConfig, saveDraftDeck } from '@/app/lib/draft/draftFunctions'

/** Save the deck built from this request's drafter's pool. Callers may still pass a player id; it is ignored. */
export async function exportDraftDeck(draftId: string, _playerId: string, deckConfig: unknown) {
  const { ctx, request } = requestInfo
  const me = drafterIn(draftId, ctx, request.headers.get('cookie'))
  if (!me) return { success: false as const, error: 'Not drafting in this draft' }
  const parsed = parseDeckConfig(deckConfig)
  if (!parsed.ok) return { success: false as const, error: parsed.error }
  const saved = await saveDraftDeck(draftId, me.id, parsed.deck)
  return saved.ok
    ? { success: true as const, deckId: saved.deckId, deckName: saved.deckName, totalCards: saved.totalCards }
    : { success: false as const, error: saved.error }
}
