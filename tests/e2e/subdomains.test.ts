// tests/e2e/subdomains.test.ts
// Lair subdomains and the public sandbox, as the middleware sees them from the Host header.
import { expect, test } from "bun:test";
import { app } from "./kit.ts";

test("an unknown lair is sent to the main domain to create it, one suggestion per subdomain", async () => {
  const a = await app();
  const b = a.browser();
  const org1 = await b.get("/", { host: a.lair("org1"), follow: false });
  const org2 = await b.get("/", { host: a.lair("org2"), follow: false });
  for (const [page, slug] of [[org1, "org1"], [org2, "org2"]] as const) {
    expect(page.status).toBe(302);
    const to = new URL(page.headers.get("location")!);
    expect(to.hostname).toBe("localhost");
    expect(to.pathname).toBe("/orgs/new");
    expect(to.searchParams.get("suggested")).toBe(slug);
  }
  expect(org1.headers.get("location")).not.toBe(org2.headers.get("location"));
});

test("a lair's sanctum sends a visitor to log in on the main domain", async () => {
  const a = await app();
  const page = await a.browser().get("/sanctum", { host: a.lair("testorg") });
  // /sanctum -> the lair's /user/login -> the main domain's /user/login
  expect(page.hops.map((h) => [h.status, new URL(h.location!).pathname])).toEqual([[302, "/user/login"], [302, "/user/login"]]);
  expect(page.url.host).toBe(a.host);
  expect(page.url.pathname).toBe("/user/login");
  expect(page.status).toBe(200);
});

test("the sandbox is public: the root lands in the one shared card game, never on login", async () => {
  const a = await app();
  const page = await a.browser().get("/", { host: a.lair("sandbox") });
  expect(page.hops.map((h) => new URL(h.location!).pathname)).toEqual(["/cardGame", "/cardGame/regal-gray-wolf"]);
  expect(page.url.hostname).toBe("sandbox.localhost");
  expect(page.url.pathname).toBe("/cardGame/regal-gray-wolf");
  expect(page.status).toBe(200);
});
