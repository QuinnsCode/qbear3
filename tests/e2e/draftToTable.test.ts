// tests/e2e/draftToTable.test.ts
// Draft against AI, build a 40-card deck from the pool, and sit down with it at a card game table:
// the whole path from /api/draft to the table's library, as the signed-in drafter.
import { expect, test } from "bun:test";
import { app, uniqueEmail } from "./kit.ts";

interface Card { scryfallId: string; name: string }
interface Seat { status: string; pack: Card[]; pool: Card[]; hasPicked: boolean; deckId: string | null }

test("a draft becomes a deck that a table can load; nobody else sees or picks from your packs", async () => {
  const a = await app();
  const me = a.browser();
  await me.signUp({ email: uniqueEmail("drafter"), name: "Drafter" });
  const lair = (await me.get("/")).url.host;

  const table = await me.get("/cardGame", { host: lair });
  const gameId = table.url.pathname.match(/^\/cardGame\/([a-z-]+)$/)?.[1];
  expect(gameId).toBeTruthy();

  // Two packs of four, two cards a pick, against two AI drafters: four picks, eight cards.
  const started = await me.post("/api/draft", { packSize: 4, packsPerPlayer: 2, pickCount: 2, aiCount: 2 }, { host: lair });
  expect(started.status).toBe(201);
  const { draftId } = started.json<{ draftId: string }>();
  const seat = async () => {
    const res = await me.get(`/api/draft/${draftId}`, { host: lair });
    expect(res.status).toBe(200);
    return res.json<Seat>();
  };

  const stranger = a.browser();
  await stranger.signUp({ email: uniqueEmail("snoop"), name: "Snoop" });
  const theirLair = (await stranger.get("/")).url.host;
  expect((await stranger.get(`/api/draft/${draftId}`, { host: theirLair })).status).toBe(403);

  let picks = 0;
  for (const deadline = Date.now() + 60_000; ;) {
    const s = await seat();
    if (s.status === "complete") break;
    if (Date.now() > deadline) throw new Error(`draft stuck after ${picks} picks: ${JSON.stringify(s)}`);
    if (s.hasPicked || s.pack.length === 0) { await Bun.sleep(150); continue; } // AI drafters still picking
    const cardIds = s.pack.slice(0, 2).map((c) => c.scryfallId);
    expect((await stranger.post(`/api/draft/${draftId}/pick`, { cardIds }, { host: theirLair })).status).toBe(403);
    expect((await me.post(`/api/draft/${draftId}/pick`, { cardIds }, { host: lair })).status).toBe(200);
    picks++;
    // A double click: the pack hasn't passed, so a second pick from it is refused.
    const again = await me.post(`/api/draft/${draftId}/pick`, { cardIds: s.pack.slice(2, 4).map((c) => c.scryfallId) }, { host: lair });
    if (s.pack.length > 2) expect(again.status).toBe(409);
  }
  expect(picks).toBe(4);
  const { pool } = await seat();
  expect(pool).toHaveLength(8);

  const counts = new Map<string, number>();
  for (const c of pool) counts.set(c.scryfallId, (counts.get(c.scryfallId) ?? 0) + 1);
  const mainDeck = [...counts].map(([scryfallId, quantity]) => ({ scryfallId, quantity }));

  const notMine = await me.post(`/api/draft/${draftId}/deck`, { mainDeck: [...mainDeck, { scryfallId: "not-drafted", quantity: 1 }], basics: { W: 31 } }, { host: lair });
  expect(notMine.status).toBe(400);

  const saved = await me.post(`/api/draft/${draftId}/deck`, { mainDeck, basics: { W: 16, U: 16 } }, { host: lair });
  expect(saved.status).toBe(201);
  const { deckId, totalCards } = saved.json<{ deckId: string; totalCards: number }>();
  expect(totalCards).toBe(40);
  expect((await seat()).deckId).toBe(deckId);

  const sat = await me.post(`/api/cardGame/${gameId}/deck`, { deckId }, { host: lair });
  expect(sat.status).toBe(200);
  expect(sat.json<{ libraryCount: number }>().libraryCount).toBe(40);

  const game = await me.get(`/__cgsync/cardGame/${gameId}`, { host: lair });
  const players = game.json<{ players: { name: string; zones: { library: string[] } }[] }>().players;
  expect(players.find((p) => p.name === "Drafter")?.zones.library).toHaveLength(40);
});
