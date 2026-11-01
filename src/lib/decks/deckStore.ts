// Where a person's decks live. Signed in with eqosys: one cloud-save slot per deck (deck-1 .. deck-19) plus an `index` slot, because
// eqosys keeps 20 slots per person per app and can't delete one. Everyone else, and decks saved before this, stay in DECKS_KV.
// A deck found in both is read from eqosys; saving one to eqosys drops its KV copy. qntbr's own caps (tiers) are enforced by callers.
import { env } from "cloudflare:workers"
import type { Deck } from "@/app/types/Deck"
import { eqosysToken, getSave, putSave } from "@/lib/eqosys"

const KV_TTL = 60 * 60 * 24 * 90
const MAX_SLOTS = 19
const INDEX = "index"

type Index = { decks: { id: string; slot: string }[]; free: string[] }
export type StoredDeck = { deck: Deck; normalizedAt?: number }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null
const isSlotName = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v)

function parseIndex(raw: string | null): Index {
  const empty: Index = { decks: [], free: [] }
  if (!raw) return empty
  const json: unknown = JSON.parse(raw)
  if (!isRecord(json) || !Array.isArray(json.decks) || !Array.isArray(json.free)) return empty
  const decks = json.decks.flatMap((d: unknown) => isRecord(d) && typeof d.id === "string" && isSlotName(d.slot) ? [{ id: d.id, slot: d.slot }] : [])
  return { decks, free: json.free.filter(isSlotName) }
}

/** A slot that was blanked after a delete holds `{}`, which has no deck and reads as missing. */
function parseStored(raw: string): StoredDeck | null {
  const json: unknown = JSON.parse(raw)
  if (!isRecord(json) || !isRecord(json.deck) || typeof json.deck.id !== "string") return null
  // The deck's own shape is checked by migrateDeck/normalizeDeck where it is read.
  return { deck: json.deck as unknown as Deck, normalizedAt: typeof json.normalizedAt === "number" ? json.normalizedAt : undefined }
}

async function kvList(userId: string): Promise<string[]> {
  const raw = await env.DECKS_KV.get(`deck:${userId}:list`)
  const json: unknown = raw ? JSON.parse(raw) : []
  return Array.isArray(json) ? json.filter((id): id is string => typeof id === "string") : []
}

async function kvForget(userId: string, deckId: string) {
  await env.DECKS_KV.delete(`deck:${userId}:${deckId}`)
  const ids = await kvList(userId)
  if (ids.includes(deckId)) await env.DECKS_KV.put(`deck:${userId}:list`, JSON.stringify(ids.filter(id => id !== deckId)), { expirationTtl: KV_TTL })
}

/** Newest first: eqosys decks, then the KV ones eqosys doesn't hold. */
export async function listDeckIds(userId: string): Promise<string[]> {
  const token = await eqosysToken(userId)
  const cloud = token ? parseIndex(await getSave(token, INDEX)).decks.map(d => d.id) : []
  const kv = (await kvList(userId)).filter(id => !cloud.includes(id))
  return [...cloud, ...kv]
}

export async function readDeck(userId: string, deckId: string): Promise<StoredDeck | null> {
  const token = await eqosysToken(userId)
  if (token) {
    const slot = parseIndex(await getSave(token, INDEX)).decks.find(d => d.id === deckId)?.slot
    const raw = slot ? await getSave(token, slot) : null
    const stored = raw ? parseStored(raw) : null
    if (stored) return stored
  }
  const kv = await env.DECKS_KV.getWithMetadata<{ normalizedAt?: number; version?: number }>(`deck:${userId}:${deckId}`)
  if (!kv.value) return null
  const deck: Deck = JSON.parse(kv.value)
  // KV marks a deck as normalized by its metadata; honour that only when it is for the stored version.
  return { deck, normalizedAt: kv.metadata?.version === deck.version ? kv.metadata?.normalizedAt : undefined }
}

/** Saves a deck (new or edited) and puts it first in the list. */
export async function writeDeck(userId: string, stored: StoredDeck): Promise<{ ok: true } | { ok: false; error: string }> {
  const { deck } = stored
  const token = await eqosysToken(userId)
  if (!token) {
    await env.DECKS_KV.put(`deck:${userId}:${deck.id}`, JSON.stringify(deck), {
      expirationTtl: KV_TTL,
      metadata: {
        userId,
        deckName: deck.name,
        commanders: deck.commanders?.join(", ") || "Unknown",
        totalCards: deck.totalCards,
        version: deck.version,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        normalizedAt: stored.normalizedAt,
      },
    })
    const ids = (await kvList(userId)).filter(id => id !== deck.id)
    await env.DECKS_KV.put(`deck:${userId}:list`, JSON.stringify([deck.id, ...ids].slice(0, 50)), { expirationTtl: KV_TTL })
    return { ok: true }
  }

  const index = parseIndex(await getSave(token, INDEX))
  const taken = new Set([...index.decks.map(d => d.slot), ...index.free])
  const fresh = Array.from({ length: MAX_SLOTS }, (_, i) => `deck-${i + 1}`).find(s => !taken.has(s))
  const slot = index.decks.find(d => d.id === deck.id)?.slot ?? index.free[0] ?? fresh
  if (!slot) return { ok: false, error: `That's ${MAX_SLOTS} decks saved to eqosys: delete one first.` }

  const saved = await putSave(token, slot, JSON.stringify(stored))
  if (!saved.ok) return { ok: false, error: saved.status === 413 ? "That deck is too big to save to eqosys (256 KB)." : saved.error }
  const updated: Index = {
    decks: [{ id: deck.id, slot }, ...index.decks.filter(d => d.id !== deck.id)],
    free: index.free.filter(s => s !== slot),
  }
  const indexed = await putSave(token, INDEX, JSON.stringify(updated))
  if (!indexed.ok) return { ok: false, error: indexed.error }
  await kvForget(userId, deck.id).catch(error => console.error("[deckStore] couldn't drop the KV copy:", error))
  return { ok: true }
}

export async function removeDeck(userId: string, deckId: string): Promise<void> {
  const token = await eqosysToken(userId)
  if (token) {
    const index = parseIndex(await getSave(token, INDEX))
    const gone = index.decks.find(d => d.id === deckId)
    if (gone) {
      // eqosys can't delete a slot: blank it, and hand the slot to the next deck.
      await putSave(token, gone.slot, "{}")
      const updated: Index = { decks: index.decks.filter(d => d.id !== deckId), free: [...index.free, gone.slot] }
      await putSave(token, INDEX, JSON.stringify(updated))
    }
  }
  await kvForget(userId, deckId)
}
