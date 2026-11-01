// src/app/api/draft/draft.ts
// Drafting over plain JSON, for anything that isn't the draft page: other apps (eqosys, qollab,
// qlave), bots, and the e2e suite. The drafter is the session's user, or the guest the draft's
// cookie names; nobody passes a player id.
//
//   POST /api/draft                    { packSize?, packsPerPlayer?, pickCount?, aiCount?, humanSeats?, pickTimerSeconds? } -> 201 { draftId }
//   POST /api/draft/:draftId/join      take an open seat (humanSeats > 1)       -> 200 { status }
//   GET  /api/draft/:draftId           -> your seat (DraftSeat): pack, pool, hasPicked, status
//   POST /api/draft/:draftId/pick      { cardIds }                              -> 200 { ok }
//   POST /api/draft/:draftId/deck      { mainDeck, sideboard?, basics? }        -> 201 { deckId }
//
// AI drafters pick about half a second after you do; poll the seat until `hasPicked` is false.
import {
  drafterIn, draftSeat, guestCookie, joinDraft, newDrafter, parseDeckConfig, parseDraftOptions, pickCards, saveDraftDeck, startDraft,
  type Drafter,
} from "@/app/lib/draft/draftFunctions"

interface Info {
  request: Request
  params: Record<string, string>
  ctx: { user?: { id: string; name?: string | null; email?: string | null } | null }
}

const problem = (status: number, error: string) => Response.json({ error }, { status })

const body = (request: Request): Promise<unknown> => request.json().catch(() => undefined)

export async function startHandler({ request, ctx }: Info): Promise<Response> {
  if (request.method !== 'POST') return problem(405, 'POST to start a draft')
  const parsed = parseDraftOptions(await body(request))
  if (!parsed.ok) return problem(parsed.status, parsed.error)
  const me = newDrafter(ctx)
  const started = await startDraft(me, parsed.options)
  if (!started.ok) return problem(started.status, started.error)
  const headers = new Headers()
  if (me.isGuest) headers.append('Set-Cookie', guestCookie(started.draftId, me.id))
  return Response.json({ draftId: started.draftId }, { status: 201, headers })
}

/** `/api/draft/:draftId` and `/api/draft/:draftId/:verb`. */
export async function draftHandler({ request, params, ctx }: Info, verb?: 'pick' | 'deck' | 'join'): Promise<Response> {
  const draftId = params.draftId
  if (!draftId || !/^draft-[\w-]{1,80}$/.test(draftId)) return problem(404, 'No such draft')
  if (verb === 'join') return joinHandler({ request, params, ctx }, false)
  const me: Drafter | null = drafterIn(draftId, ctx, request.headers.get('cookie'))
  if (!me) return problem(401, 'Sign in, or open the draft from the browser that started it')

  if (!verb) {
    if (request.method !== 'GET') return problem(405, 'GET your seat')
    const seat = await draftSeat(draftId, me.id)
    return seat.ok ? Response.json(seat.seat) : problem(seat.status, seat.error)
  }
  if (request.method !== 'POST') return problem(405, `POST to ${verb}`)
  const input = await body(request)

  if (verb === 'pick') {
    const cardIds = typeof input === 'object' && input !== null && 'cardIds' in input ? input.cardIds : undefined
    const picked = await pickCards(draftId, me.id, cardIds)
    return picked.ok ? Response.json({ ok: true }) : problem(picked.status, picked.error)
  }

  const deck = parseDeckConfig(input)
  if (!deck.ok) return problem(deck.status, deck.error)
  const saved = await saveDraftDeck(draftId, me.id, deck.deck)
  return saved.ok
    ? Response.json({ deckId: saved.deckId, deckName: saved.deckName, totalCards: saved.totalCards }, { status: 201 })
    : problem(saved.status, saved.error)
}

/**
 * Take an open seat. A guest gets the draft's cookie with it. From the API the answer is JSON; from the
 * join page's form (`page`) it is a redirect to the draft.
 */
export async function joinHandler({ request, params, ctx }: Info, page: boolean): Promise<Response> {
  const draftId = params.draftId
  if (!draftId || !/^draft-[\w-]{1,80}$/.test(draftId)) return problem(404, 'No such draft')
  if (request.method !== 'POST') return problem(405, 'POST to join')
  const me = drafterIn(draftId, ctx, request.headers.get('cookie')) ?? newDrafter(ctx)
  const joined = await joinDraft(draftId, me)
  if (!joined.ok) return problem(joined.status, joined.error)
  const headers = new Headers()
  if (me.isGuest) headers.append('Set-Cookie', guestCookie(draftId, me.id))
  if (page) {
    headers.set('Location', `/draft/${draftId}`)
    return new Response(null, { status: 303, headers })
  }
  return Response.json({ status: joined.status }, { headers })
}
