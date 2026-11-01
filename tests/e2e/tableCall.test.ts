// tests/e2e/tableCall.test.ts
// A video call per table: the same table always gets the same qlave room, another table gets another.
import { expect, test } from "bun:test";
import { app, uniqueEmail } from "./kit.ts";

test("a game table and a draft pod each get one qlave room, the same every time", async () => {
  const a = await app();
  if (!a.qlave) return; // pointed at a running server: no qlave stub to ask
  const owner = a.browser();
  await owner.signUp({ email: uniqueEmail("call"), name: "Caller" });
  const lair = (await owner.get("/")).url.host;
  const gameId = (await owner.get("/cardGame", { host: lair })).url.pathname.match(/^\/cardGame\/([a-z-]+)$/)?.[1];
  expect(gameId).toBeTruthy();

  const join = async () => {
    const res = await owner.post(`/api/call/cardGame/${gameId}`, {}, { host: lair });
    expect(res.status).toBe(200);
    return res.json<{ url: string }>().url;
  };
  const first = await join();
  expect(first).toMatch(/\/s\/room\d+$/);
  expect(await join()).toBe(first);
  expect(a.qlave.requests.filter((id) => id === `qntbr:cardGame:${gameId}`)).toHaveLength(1);

  // A draft pod: a guest with a cookie is enough, and it is a different room.
  const guest = a.browser();
  const { draftId } = (await guest.post("/api/draft", { packSize: 4, packsPerPlayer: 1, pickCount: 1, aiCount: 2 })).json<{ draftId: string }>();
  await guest.get(`/draft/${draftId}`);
  const draftCall = await guest.post(`/api/call/draft/${draftId}`, {});
  expect(draftCall.status).toBe(200);
  expect(draftCall.json<{ url: string }>().url).not.toBe(first);

  // A table that does not exist, or a stranger with no seat, gets no room.
  expect((await owner.post("/api/call/cardGame/no-such-table", {}, { host: lair })).status).toBe(404);
  expect((await guest.post("/api/call/draft/nope-nope", {})).status).toBe(401);
  expect((await a.browser().post(`/api/call/cardGame/${gameId}`, {})).status).toBe(401);
});
