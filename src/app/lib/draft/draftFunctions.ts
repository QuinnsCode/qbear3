// src/app/lib/draft/draftFunctions.ts
// What a draft can do, for server code only (no 'use server'): server actions, /api/draft and pages
// call these with a drafter they got from the request, never from an argument the browser sent.

import { env } from "cloudflare:workers"
import { BASIC_LANDS, CURRENT_DECK_VERSION, DECK_LIMITS, type BasicLandColor, type DeckV4 } from "@/app/types/Deck"
import { DEFAULT_DRAFT_CONFIG, type CubeCard, type DraftConfig, type DraftDeckConfig, type DraftPlayer, type DraftSeat } from "@/app/types/Draft"
import { VINTAGE_CUBE } from "@/app/data/vintageCubeData"
import { canCreateDraft, trackNewDraft } from "@/app/serverActions/draft/draftTracking"
import { generateGuestId } from "@/lib/userIdentity"
import { listDeckIds, readDeck, writeDeck } from "@/lib/decks/deckStore"

export interface Drafter { id: string; name: string; isGuest: boolean }

export type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string }

const fail = (status: number, error: string) => ({ ok: false as const, status, error })

const GUEST_COOKIE_DAYS = 7

/** The cookie that remembers which guest drafts in `draftId`. */
export const guestCookieName = (draftId: string) => `draft_user_${draftId}`

export function guestCookie(draftId: string, guestId: string): string {
  return `${guestCookieName(draftId)}=${guestId}; Max-Age=${GUEST_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax`
}

interface SessionCtx { user?: { id: string; name?: string | null; email?: string | null } | null }

function signedIn(ctx: SessionCtx): Drafter | null {
  const u = ctx.user
  return u?.id ? { id: u.id, name: u.name || u.email || 'Player', isGuest: false } : null
}

/** Who is drafting in `draftId`: the signed-in user, else the guest whose cookie names them, else nobody. */
export function drafterIn(draftId: string, ctx: SessionCtx, cookieHeader: string | null): Drafter | null {
  const me = signedIn(ctx)
  if (me) return me
  const name = guestCookieName(draftId)
  const id = cookieHeader?.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`))?.slice(name.length + 1)
  return id?.startsWith('guest-') ? { id, name: 'Guest', isGuest: true } : null
}

/** Who would start a new draft: the signed-in user, or a guest with a fresh id. */
export function newDrafter(ctx: SessionCtx): Drafter {
  return signedIn(ctx) ?? { id: generateGuestId(), name: 'Guest', isGuest: true }
}

// ---- input ----

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function intIn(v: unknown, min: number, max: number, fallback: number): number | null {
  if (v === undefined) return fallback
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : null
}

export interface DraftOptions { config: DraftConfig; aiCount: number }

/** Pack shape and table size, from a form or a JSON body. Missing fields take the defaults. */
export function parseDraftOptions(input: unknown): Result<{ options: DraftOptions }> {
  const o = isRecord(input) ? input : {}
  const c = isRecord(o.config) ? o.config : o
  const packSize = intIn(c.packSize, 2, 20, DEFAULT_DRAFT_CONFIG.packSize)
  const packsPerPlayer = intIn(c.packsPerPlayer, 1, 5, DEFAULT_DRAFT_CONFIG.packsPerPlayer)
  const pickCount = intIn(c.pickCount, 1, 3, DEFAULT_DRAFT_CONFIG.pickCount)
  const aiCount = intIn(o.aiCount ?? c.aiCount, 1, 7, DEFAULT_DRAFT_CONFIG.playerCount - 1)
  if (packSize === null || packsPerPlayer === null || pickCount === null || aiCount === null) {
    return fail(400, 'packSize 2-20, packsPerPlayer 1-5, pickCount 1-3 and aiCount 1-7 must be whole numbers')
  }
  if (pickCount > packSize) return fail(400, 'pickCount cannot be more than packSize')
  const players = aiCount + 1
  if (players * packsPerPlayer * packSize > VINTAGE_CUBE.length) return fail(400, `That draft needs more than the cube's ${VINTAGE_CUBE.length} cards`)
  return {
    ok: true,
    options: { aiCount, config: { ...DEFAULT_DRAFT_CONFIG, packSize, packsPerPlayer, pickCount, playerCount: players } },
  }
}

/** A deck built from a pool: main deck and sideboard by scryfallId, plus basics by color. */
export function parseDeckConfig(input: unknown): Result<{ deck: DraftDeckConfig }> {
  if (!isRecord(input)) return fail(400, 'Send { mainDeck, sideboard, basics }')
  const entries = (v: unknown) => {
    if (v === undefined) return []
    if (!Array.isArray(v)) return null
    const out: DraftDeckConfig['mainDeck'] = []
    for (const e of v) {
      if (!isRecord(e) || typeof e.scryfallId !== 'string' || !Number.isInteger(e.quantity) || (e.quantity as number) < 1) return null
      out.push({ scryfallId: e.scryfallId, quantity: e.quantity as number })
    }
    return out
  }
  const mainDeck = entries(input.mainDeck), sideboard = entries(input.sideboard)
  if (!mainDeck || !sideboard) return fail(400, 'mainDeck and sideboard are lists of { scryfallId, quantity }')
  const b = isRecord(input.basics) ? input.basics : {}
  const basics = { W: 0, U: 0, B: 0, R: 0, G: 0 }
  for (const color of Object.keys(basics) as BasicLandColor[]) {
    const n = intIn(b[color], 0, 60, 0)
    if (n === null) return fail(400, 'basics are whole numbers from 0 to 60 per color')
    basics[color] = n
  }
  return { ok: true, deck: { mainDeck, sideboard, basics } }
}

// ---- the DraftDO ----

const draftStub = (draftId: string) => env.DRAFT_DO.get(env.DRAFT_DO.idFromName(draftId))

async function errorOf(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null)
  return isRecord(body) && typeof body.error === 'string' ? body.error : `Draft answered ${res.status}`
}

function isSeat(v: unknown): v is DraftSeat {
  return isRecord(v) && typeof v.status === 'string' && Array.isArray(v.pack) && Array.isArray(v.pool) && isRecord(v.me) && isRecord(v.config)
}

/** Start a draft with `me` in seat one and AI drafters after. */
export async function startDraft(me: Drafter, { config, aiCount }: DraftOptions): Promise<Result<{ draftId: string }>> {
  const limit = await canCreateDraft(me.id)
  if (!limit.canCreate) return fail(429, limit.reason ?? 'Too many drafts in progress')

  const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const players: DraftPlayer[] = [
    { id: me.id, name: me.name, isAI: false, draftPool: [] },
    ...Array.from({ length: aiCount }, (_, i) => ({ id: `ai-${i}`, name: `AI ${i + 1}`, isAI: true, draftPool: [] })),
  ]
  const res = await draftStub(draftId).fetch(new Request('https://fake-host/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Guests leave no creator, which makes the draft public to anyone holding the link.
    body: JSON.stringify({ cubeCards: VINTAGE_CUBE, config, players, creatorId: me.isGuest ? null : me.id }),
  }))
  if (!res.ok) return fail(502, await errorOf(res))

  await trackNewDraft({
    draftId, userId: me.id, userName: me.name, status: 'in_progress',
    createdAt: Date.now(), lastActivity: Date.now(),
    packNumber: 1, pickNumber: 0, totalPacks: config.packsPerPlayer, totalPicks: config.packSize, playerCount: players.length,
  })
  return { ok: true, draftId }
}

/** `playerId`'s seat in a draft: 404 for no such draft, 403 for someone who isn't drafting in it. */
export async function draftSeat(draftId: string, playerId: string): Promise<Result<{ seat: DraftSeat }>> {
  const res = await draftStub(draftId).fetch(`https://fake-host/view/${encodeURIComponent(playerId)}`)
  if (!res.ok) return fail(res.status, await errorOf(res))
  const seat: unknown = await res.json()
  return isSeat(seat) ? { ok: true, seat } : fail(502, 'Draft answered with something that is not a seat')
}

/** Take `cardIds` from the pack in front of `playerId`. AI drafters pick and packs pass shortly after. */
export async function pickCards(draftId: string, playerId: string, cardIds: unknown): Promise<Result<{}>> {
  if (!Array.isArray(cardIds) || !cardIds.every(id => typeof id === 'string')) return fail(400, 'cardIds is a list of scryfallIds')
  const seat = await draftSeat(draftId, playerId)
  if (!seat.ok) return seat
  const res = await draftStub(draftId).fetch(new Request('https://fake-host/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'make_pick', playerId, data: { cardIds } }),
  }))
  return res.ok ? { ok: true } : fail(res.status === 400 ? 409 : 502, await errorOf(res))
}

/**
 * Save a deck built from `playerId`'s pool to their decks, where a card game table can load it.
 * Every card must be one they drafted, as many times as they drafted it; basics are free.
 */
export async function saveDraftDeck(draftId: string, playerId: string, config: DraftDeckConfig): Promise<Result<{ deckId: string; deckName: string; totalCards: number }>> {
  const got = await draftSeat(draftId, playerId)
  if (!got.ok) return got
  const { seat } = got

  const drafted = new Map<string, { card: CubeCard; left: number }>()
  for (const card of seat.pool) {
    const d = drafted.get(card.scryfallId)
    if (d) d.left++; else drafted.set(card.scryfallId, { card, left: 1 })
  }
  const fromPool = (zone: 'main' | 'sideboard') => (e: { scryfallId: string; quantity: number }) => {
    const d = drafted.get(e.scryfallId)
    if (!d || d.left < e.quantity) return null
    d.left -= e.quantity
    const c = d.card
    return {
      id: c.scryfallId, scryfallId: c.scryfallId, name: c.name, quantity: e.quantity,
      imageUrl: c.imageUrl || '', type: c.types.join(' '), manaCost: '', colors: c.colors,
      isCommander: false, zone, cmc: c.cmc || 0, rarity: c.rarity || 'common',
    }
  }
  const main = config.mainDeck.map(fromPool('main'))
  const side = config.sideboard.map(fromPool('sideboard'))
  if (main.includes(null) || side.includes(null)) return fail(400, 'Every card in the deck must come from your draft pool')

  const basics = (Object.entries(config.basics) as [BasicLandColor, number][])
    .filter(([, n]) => n > 0)
    .map(([color, n]) => {
      const land = BASIC_LANDS[color]
      return {
        id: land.scryfallId, scryfallId: land.scryfallId, name: land.name, quantity: n,
        imageUrl: land.imageUrl, type: land.type, manaCost: '', colors: [...land.colors],
        isCommander: false, zone: 'main' as const, cmc: 0, rarity: 'common',
      }
    })
  const cards = [...main.filter(c => c !== null), ...basics, ...side.filter(c => c !== null)]
  const totalCards = cards.reduce((n, c) => n + c.quantity, 0)
  const mainCount = cards.filter(c => c.zone === 'main').reduce((n, c) => n + c.quantity, 0)
  if (mainCount < 40) return fail(400, `A draft deck needs at least 40 main deck cards (has ${mainCount})`)

  // Wherever their decks live (eqosys or DECKS_KV), the deck store knows.
  const stored = await Promise.all((await listDeckIds(playerId)).map(id => readDeck(playerId, id)))
  const draftDecks = stored.filter(s => s?.deck.format === 'draft').length
  if (draftDecks >= DECK_LIMITS.draft) return fail(409, `You can only have ${DECK_LIMITS.draft} draft decks. Please delete an old one first.`)

  const deckId = `deck-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const deck: DeckV4 = {
    version: CURRENT_DECK_VERSION,
    id: deckId,
    format: 'draft',
    name: `Draft - ${new Date().toLocaleDateString()}`,
    colors: [...new Set(cards.flatMap(c => c.colors))].sort(),
    cards,
    totalCards,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    draftMetadata: { draftId, draftDate: Date.now(), pickHistory: seat.pool.map(c => c.scryfallId) },
  }
  const written = await writeDeck(playerId, { deck })
  if (!written.ok) return fail(409, written.error)

  await draftStub(draftId).fetch(new Request('https://fake-host/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'finalize_deck', playerId, data: { deckConfig: config, exportedDeckId: deckId } }),
  }))
  return { ok: true, deckId, deckName: deck.name, totalCards }
}
