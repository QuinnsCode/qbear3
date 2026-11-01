// tests/e2e/cardGame.test.ts
// Start a card game from your lair and sit at it. The sync endpoint only reads: changing a
// game goes through server actions, which act as the signed-in player.
import { expect, test } from "bun:test";
import { app, uniqueEmail } from "./kit.ts";

test("a new game seats its creator; the sync endpoint can read it but not change it", async () => {
  const a = await app();
  const owner = a.browser();
  await owner.signUp({ email: uniqueEmail("table"), name: "Table Owner" });
  const lair = (await owner.get("/")).url.host;

  const game = await owner.get("/cardGame", { host: lair });
  expect(game.status).toBe(200);
  const id = game.url.pathname.match(/^\/cardGame\/([a-z-]+)$/)?.[1];
  expect(id).toBeTruthy();

  const seated = async () => {
    const res = await owner.get(`/__cgsync/cardGame/${id}`, { host: lair });
    expect(res.status).toBe(200);
    return res.json<{ players: { name: string }[] }>().players.map((p) => p.name);
  };
  expect(await seated()).toEqual(["Table Owner"]);

  const other = a.browser();
  await other.signUp({ email: uniqueEmail("passerby"), name: "Passerby" });
  // Signed in on their own lair, where the session is good. The game is found by id alone.
  const theirLair = (await other.get("/")).url.host;
  for (const method of ["DELETE", "POST", "PUT"]) {
    const res = await other.request(`/__cgsync/cardGame/${id}`, { host: theirLair, method, body: {} });
    expect(res.status).toBe(405);
  }
  expect(await seated()).toEqual(["Table Owner"]);
});
