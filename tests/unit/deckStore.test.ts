import { beforeEach, expect, mock, test } from "bun:test"

// A fake eqosys (slots that can't be deleted, 20 per person) and a fake DECKS_KV, behind the real deckStore.
const slots = new Map<string, string>()
const kv = new Map<string, string>()
let signedIn = true

mock.module("cloudflare:workers", () => ({
  env: {
    DECKS_KV: {
      get: async (k: string) => kv.get(k) ?? null,
      getWithMetadata: async (k: string) => ({ value: kv.get(k) ?? null, metadata: null }),
      put: async (k: string, v: string) => void kv.set(k, v),
      delete: async (k: string) => void kv.delete(k),
    },
  },
}))
mock.module("@/lib/eqosys", () => ({
  eqosysToken: async () => (signedIn ? "token" : null),
  getSave: async (_t: string, slot: string) => slots.get(slot) ?? null,
  putSave: async (_t: string, slot: string, body: string) => {
    if (!slots.has(slot) && slots.size >= 20) return { ok: false, status: 409, error: "full" }
    slots.set(slot, body)
    return { ok: true }
  },
}))

const { listDeckIds, readDeck, removeDeck, writeDeck } = await import("@/lib/decks/deckStore")
const deck = (id: string) => ({ id, name: id, version: 4, format: "commander", cards: [], totalCards: 0 }) as never

beforeEach(() => {
  slots.clear()
  kv.clear()
  signedIn = true
})

test("an eqosys deck round-trips, newest first, and a deleted deck's slot is reused", async () => {
  for (const id of ["a", "b"]) expect(await writeDeck("u", { deck: deck(id) })).toEqual({ ok: true })
  expect(await listDeckIds("u")).toEqual(["b", "a"])
  expect((await readDeck("u", "a"))?.deck.id).toBe("a")

  await removeDeck("u", "a")
  expect(await listDeckIds("u")).toEqual(["b"])
  expect(await readDeck("u", "a")).toBeNull()

  await writeDeck("u", { deck: deck("c") })
  expect([...slots.keys()].sort()).toEqual(["deck-1", "deck-2", "index"])
})

test("the 20th deck is refused with a message, not a crash", async () => {
  for (let i = 0; i < 19; i++) expect((await writeDeck("u", { deck: deck(`d${i}`) })).ok).toBe(true)
  const over = await writeDeck("u", { deck: deck("one-too-many") })
  expect(over.ok).toBe(false)
})

test("an old KV deck is listed and read; editing it moves it to eqosys and drops the KV copy", async () => {
  signedIn = false
  await writeDeck("u", { deck: deck("old") })
  signedIn = true
  expect(await listDeckIds("u")).toEqual(["old"])
  expect((await readDeck("u", "old"))?.deck.id).toBe("old")

  await writeDeck("u", { deck: deck("old") })
  expect(kv.has("deck:u:old")).toBe(false)
  expect(await listDeckIds("u")).toEqual(["old"])
})

test("someone without an eqosys account keeps using KV", async () => {
  signedIn = false
  await writeDeck("u", { deck: deck("x") })
  expect(slots.size).toBe(0)
  expect(await listDeckIds("u")).toEqual(["x"])
})
