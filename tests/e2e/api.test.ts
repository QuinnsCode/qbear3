// tests/e2e/api.test.ts
// /api/* handlers nested under a folder (src/app/api/<folder>/<name>.ts) must be routed.
import { expect, test } from "bun:test";
import { app } from "./kit.ts";

test("check-username answers instead of 500ing, for free, malformed and reserved names", async () => {
  const a = await app();
  const b = a.browser();
  const ask = async (name: string) => {
    const res = await b.get(`/api/main/check-username?username=${name}`);
    return { status: res.status, body: res.json<{ available: boolean }>() };
  };
  expect(await ask("some-free-name")).toEqual({ status: 200, body: expect.objectContaining({ available: true }) });
  expect((await ask("ab")).body.available).toBe(false);
  expect((await ask("www")).body.available).toBe(false);
});

test("an unknown /api path is a 404", async () => {
  const a = await app();
  const res = await a.browser().get("/api/main/nope");
  expect(res.status).toBe(404);
});
