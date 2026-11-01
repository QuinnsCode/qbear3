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
