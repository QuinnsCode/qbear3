// Deck server actions are callable from the browser with any arguments: whose decks they touch
// must come from the session, never from the userId a caller passes.
import { beforeEach, expect, mock, test } from "bun:test";

const decks = new Map<string, unknown>(); // "userId:deckId" -> deck
const session: { user: { id: string } | null } = { user: null };

mock.module("cloudflare:workers", () => ({ env: {} }));
mock.module("rwsdk/worker", () => ({ requestInfo: { ctx: session } }));
mock.module("@/db", () => ({ db: {}, setupDb: async () => {} }));
mock.module("@/lib/decks/deckStore", () => ({
  listDeckIds: async (userId: string) => [...decks.keys()].filter((k) => k.startsWith(`${userId}:`)).map((k) => k.split(":")[1]),
  readDeck: async (userId: string, deckId: string) => {
    const deck = decks.get(`${userId}:${deckId}`);
    return deck ? { deck, normalizedAt: Date.now() } : null;
  },
  writeDeck: async (userId: string, stored: { deck: { id: string } }) => {
    decks.set(`${userId}:${stored.deck.id}`, stored.deck);
    return { ok: true };
  },
  removeDeck: async (userId: string, deckId: string) => {
    decks.delete(`${userId}:${deckId}`);
  },
}));

const { getDeck, getUserDecks, deleteDeck, updateDeck } = await import("@/app/serverActions/deckBuilder/deckActions");

beforeEach(() => {
  decks.clear();
  decks.set("alice:d1", { id: "d1", name: "Alice's deck", cards: [], totalCards: 0, colors: [] });
  session.user = { id: "bob" };
});

test("a caller naming someone else's userId still only sees and changes their own decks", async () => {
  expect((await getUserDecks("alice")).decks).toEqual([]);
  expect((await getDeck("alice", "d1")).success).toBe(false);

  expect((await updateDeck("alice", "d1", { name: "pwned" })).success).toBe(false);
  await deleteDeck("alice", "d1");
  expect((decks.get("alice:d1") as { name: string }).name).toBe("Alice's deck");
});

test("the owner, whatever userId they pass, reaches their own deck; signed-out callers are refused", async () => {
  session.user = { id: "alice" };
  expect((await getDeck("bob", "d1")).success).toBe(true);
  expect((await getUserDecks("bob")).decks).toHaveLength(1);

  session.user = null;
  await expect(getUserDecks("alice")).rejects.toThrow();
});
