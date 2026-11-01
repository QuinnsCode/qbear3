// tests/e2e/subdomains.test.ts
// Subdomains: the public sandbox, reserved names and retired lair addresses, as the middleware sees them from the Host header.
import { expect, test } from "bun:test";
import { app } from "./kit.ts";
import { isReservedSubdomain, isSubdomainAvailable, validateSubdomainForOrg } from "../../src/lib/subdomains.ts";

test("a retired lair address goes to the same path on the main domain", async () => {
  const a = await app();
  const page = await a.browser().get("/pricing?x=1", { host: a.lair("someone"), follow: false });
  expect(page.status).toBe(302);
  const to = new URL(page.headers.get("location")!);
  expect(to.hostname).toBe("localhost");
  expect(to.pathname + to.search).toBe("/pricing?x=1");
});

test("/sanctum is gone and sends everyone home", async () => {
  const a = await app();
  const page = await a.browser().get("/sanctum", { follow: false });
  expect(page.status).toBe(301);
  expect(new URL(page.headers.get("location")!, page.url).pathname).toBe("/");
});

test("the sandbox is public: the root lands in the one shared card game, never on login", async () => {
  const a = await app();
  const page = await a.browser().get("/", { host: a.lair("sandbox") });
  expect(page.hops.map((h) => new URL(h.location!).pathname)).toEqual(["/cardGame", "/cardGame/regal-gray-wolf"]);
  expect(page.url.hostname).toBe("sandbox.localhost");
  expect(page.url.pathname).toBe("/cardGame/regal-gray-wolf");
  expect(page.status).toBe(200);
});

test("a reserved name is a 404, never redirected", async () => {
  const a = await app();
  const b = a.browser();
  // eqosys and qcrm are their own Workers; if a request lands here anyway, don't suggest creating them.
  for (const name of ["eqosys", "qcrm"]) {
    const page = await b.get("/health", { host: a.lair(name), follow: false });
    expect(page.status).toBe(404);
    expect(page.headers.get("location")).toBeNull();
  }
});

test("system and sibling-app names can't be claimed as an org", () => {
  for (const name of ["eqosys", "qcrm", "www", "api", "auth", "admin", "app", "mail", "sandbox", "EQOSYS"]) {
    expect(isReservedSubdomain(name)).toBe(true);
  }
  expect(isSubdomainAvailable("eqosys").available).toBe(false);
  expect(() => validateSubdomainForOrg("eqosys")).toThrow();
});

test("an ordinary name is still available", () => {
  expect(isReservedSubdomain("mylairname")).toBe(false);
  expect(isSubdomainAvailable("mylairname")).toEqual({ available: true });
});
