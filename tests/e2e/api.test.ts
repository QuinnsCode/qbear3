// tests/e2e/api.test.ts
// /api/* handlers nested under a folder (src/app/api/<folder>/<name>.ts) must be routed.
import { expect, test } from "bun:test";
import { app } from "./kit.ts";

test("an unknown /api path is a 404", async () => {
  const a = await app();
  const res = await a.browser().get("/api/nope");
  expect(res.status).toBe(404);
});
