// tests/e2e/draftSeats.test.ts
// What a draft page and socket hand to a browser: your own seat, never another drafter's packs, and
// nothing at all to someone a protected draft doesn't let in.
import { expect, test } from "bun:test";
import { app, uniqueEmail } from "./kit.ts";

// Bun's WebSocket takes request headers (it has no DNS for lair hosts, and carries the cookie jar by hand)
const BunWebSocket = WebSocket as unknown as new (url: string, options: { headers: Record<string, string> }) => WebSocket;

interface Card { scryfallId: string }

/** The first message the draft socket sends, or how the upgrade was refused. */
function socketHello(a: { origin: string }, draftId: string, host: string, cookie: string): Promise<{ type: string; mode: string; state: { cubeCards: Card[] } } | "refused"> {
  return new Promise((resolve) => {
    const ws = new BunWebSocket(`${a.origin.replace("http", "ws")}/__draftsync/${draftId}`, { headers: { host, cookie } });
    const done = (v: Awaited<ReturnType<typeof socketHello>>) => { ws.close(); resolve(v); };
    ws.onmessage = (e) => done(JSON.parse(String(e.data)));
    ws.onerror = () => done("refused");
    ws.onclose = () => resolve("refused");
  });
}

test("a guest draft: the drafter sees their pack, a stranger who opens the link only watches", async () => {
  const a = await app();
  const guest = a.browser();
  const started = await guest.post("/api/draft", { packSize: 4, packsPerPlayer: 1, pickCount: 1, aiCount: 2 });
  expect(started.status).toBe(201);
  const { draftId } = started.json<{ draftId: string }>();
  const mine = (await guest.get(`/api/draft/${draftId}`)).json<{ pack: Card[] }>().pack.map((c) => c.scryfallId);
  expect(mine.length).toBeGreaterThan(0);

  const page = await guest.get(`/draft/${draftId}`);
  expect(page.status).toBe(200);
  for (const id of mine) expect(page.body).toContain(id);

  const watcher = a.browser();
  const watching = await watcher.get(`/draft/${draftId}`);
  expect(watching.status).toBe(200);
  for (const id of mine) expect(watching.body).not.toContain(id);

  const seated = await socketHello(a, draftId, a.host, guest.cookie);
  expect(seated).not.toBe("refused");
  if (seated !== "refused") {
    expect(seated.mode).toBe("drafter");
    expect(seated.state.cubeCards.map((c) => c.scryfallId).sort()).toEqual([...mine].sort());
  }

  const looking = await socketHello(a, draftId, a.host, "");
  expect(looking).not.toBe("refused");
  if (looking !== "refused") {
    expect(looking.mode).toBe("spectator");
    expect(looking.state.cubeCards).toEqual([]);
  }
});

test("a signed-in draft is protected: strangers get neither the page nor the socket", async () => {
  const a = await app();
  const me = a.browser();
  await me.signUp({ email: uniqueEmail("seat"), name: "Seat" });
  const lair = (await me.get("/")).url.host;
  const { draftId } = (await me.post("/api/draft", { packSize: 4, packsPerPlayer: 1, pickCount: 1, aiCount: 1 }, { host: lair })).json<{ draftId: string }>();

  const mine = await me.get(`/draft/${draftId}`, { host: lair });
  expect(mine.status).toBe(200);
  expect(mine.body).not.toContain("This draft is protected");

  const stranger = a.browser();
  const page = await stranger.get(`/draft/${draftId}`);
  expect(page.body).toContain("This draft is protected");
  expect(await socketHello(a, draftId, a.host, "")).toBe("refused");
});

interface Seat { pack: Card[]; pool: Card[]; hasPicked: boolean; status: string }

async function until<T>(read: () => Promise<T>, ok: (v: T) => boolean): Promise<T> {
  let last = await read();
  for (let i = 0; i < 40 && !ok(last); i++) {
    await new Promise((r) => setTimeout(r, 250));
    last = await read();
  }
  return last;
}

test("two humans share a draft: each sees only their pack, packs pass once both have picked, a watcher sees neither", async () => {
  const a = await app();
  const host = a.browser();
  const started = await host.post("/api/draft", { packSize: 4, packsPerPlayer: 1, pickCount: 1, humanSeats: 2, aiCount: 0 });
  expect(started.status).toBe(201);
  const { draftId } = started.json<{ draftId: string }>();
  const seatOf = async (b: ReturnType<typeof a.browser>) => (await b.get(`/api/draft/${draftId}`)).json<Seat>();

  // Nobody can pick while a seat is open
  const early = await host.post(`/api/draft/${draftId}/pick`, { cardIds: [(await seatOf(host)).pack[0].scryfallId] });
  expect(early.status).toBe(409);

  const guest = a.browser();
  expect((await guest.post(`/api/draft/${draftId}/join`, {})).status).toBe(200);
  // A third person finds the draft full
  expect((await a.browser().post(`/api/draft/${draftId}/join`, {})).status).toBe(409);

  const mine = await seatOf(host), theirs = await seatOf(guest);
  expect(mine.status).toBe("drafting");
  const mineIds = mine.pack.map((c) => c.scryfallId), theirIds = theirs.pack.map((c) => c.scryfallId);
  expect(mineIds.length).toBe(4);
  expect(theirIds.filter((id) => mineIds.includes(id))).toEqual([]);

  const watcher = a.browser();
  const watching = (await watcher.get(`/draft/${draftId}`)).body;
  for (const id of [...mineIds, ...theirIds]) expect(watching).not.toContain(id);
  expect((await host.get(`/draft/${draftId}`)).body).not.toContain(theirIds[0]);
  expect((await guest.get(`/draft/${draftId}`)).body).not.toContain(mineIds[0]);

  // The first pick waits for the second
  expect((await host.post(`/api/draft/${draftId}/pick`, { cardIds: [mineIds[0]] })).status).toBe(200);
  await new Promise((r) => setTimeout(r, 1000));
  const waiting = await seatOf(host);
  expect(waiting.hasPicked).toBe(true);
  expect(waiting.pool.length).toBe(1);

  expect((await guest.post(`/api/draft/${draftId}/pick`, { cardIds: [theirIds[0]] })).status).toBe(200);
  const passed = await until(() => seatOf(host), (s) => !s.hasPicked);
  expect(passed.hasPicked).toBe(false);
  // Now the host holds the guest's pack, minus the guest's pick
  expect(passed.pack.map((c) => c.scryfallId).sort()).toEqual(theirIds.slice(1).sort());
});

test("a human who goes idle gets an AI pick so the other can carry on", async () => {
  const a = await app();
  const host = a.browser();
  const { draftId } = (await host.post("/api/draft", { packSize: 4, packsPerPlayer: 1, pickCount: 1, humanSeats: 2, aiCount: 0, pickTimerSeconds: 1 })).json<{ draftId: string }>();
  const guest = a.browser();
  await guest.post(`/api/draft/${draftId}/join`, {});
  const seat = async () => (await host.get(`/api/draft/${draftId}`)).json<Seat>();
  const first = (await seat()).pack[0].scryfallId;
  expect((await host.post(`/api/draft/${draftId}/pick`, { cardIds: [first] })).status).toBe(200);

  const moved = await until(seat, (s) => !s.hasPicked);
  expect(moved.hasPicked).toBe(false);
  const idle = (await guest.get(`/api/draft/${draftId}`)).json<Seat>();
  expect(idle.pool.length).toBe(1);
});
