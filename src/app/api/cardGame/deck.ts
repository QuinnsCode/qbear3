// src/app/api/cardGame/deck.ts
// POST /api/cardGame/:gameId/deck { deckId } -> { libraryCount }
// Bring one of your saved decks (a draft deck included) to a table you sit at, shuffled.
import { sitWithSavedDeck } from "@/app/lib/cardGame/cardGameFunctions"

interface Info {
  request: Request
  params: Record<string, string>
  ctx: { user?: { id: string } | null }
}

export default async function handler({ request, params, ctx }: Info): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'POST { deckId }' }, { status: 405 })
  if (!ctx.user?.id) return Response.json({ error: 'Sign in to play' }, { status: 401 })
  const input: unknown = await request.json().catch(() => undefined)
  const deckId = typeof input === 'object' && input !== null && 'deckId' in input ? input.deckId : undefined
  if (typeof deckId !== 'string' || !params.gameId) return Response.json({ error: 'POST { deckId }' }, { status: 400 })
  const sat = await sitWithSavedDeck(params.gameId, ctx.user.id, deckId)
  return sat.ok ? Response.json({ libraryCount: sat.libraryCount }) : Response.json({ error: sat.error }, { status: sat.status })
}
