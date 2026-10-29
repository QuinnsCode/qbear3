// tests/e2e/portal.test.ts
// Main-domain portal: the landing page sections and the /games and /apps hubs.
import { expect, test } from "bun:test";
import { app, hasSection, headings, links } from "./kit.ts";

const RUSTY_BUNS = "https://github.com/QuinnsCode/RustyBuns";

test("landing page has products, game center and app center sections", async () => {
  const b = (await app()).browser();
  const page = await b.get("/");
  expect(page.status).toBe(200);
  expect(page.hops).toEqual([]);
  for (const id of ["products", "games", "apps"]) expect(hasSection(page.body, id)).toBe(true);
  // Section links into the hubs, and RustyBuns from the nav.
  expect(links(page.body, { href: "/games", class: "section-link" })).toHaveLength(1);
  expect(links(page.body, { href: "/apps", class: "section-link" })).toHaveLength(1);
  expect(links(page.body, { href: RUSTY_BUNS, class: "nav-link" })).toHaveLength(1);
});

test("game center lists games and marks itself active", async () => {
  const b = (await app()).browser();
  const page = await b.get("/games");
  expect(page.status).toBe(200);
  expect(page.url.pathname).toBe("/games");
  expect(headings(page.body)).toEqual(expect.arrayContaining(["Sanctum", "Sandbox"]));
  expect(links(page.body, { href: "/sanctum", class: "portal-card" })).toHaveLength(1);
  expect(links(page.body, { class: "active" }).map((l) => l.text)).toEqual(["Games"]);
});

test("app center lists apps including RustyBuns on GitHub", async () => {
  const b = (await app()).browser();
  const page = await b.get("/apps");
  expect(page.status).toBe(200);
  expect(page.url.pathname).toBe("/apps");
  expect(headings(page.body)).toContain("RustyBuns");
  expect(links(page.body, { href: RUSTY_BUNS, class: "portal-card" })).toHaveLength(1);
  expect(links(page.body, { href: "https://qlave.dev", class: "portal-card" })).toHaveLength(1);
  expect(links(page.body, { class: "active" }).map((l) => l.text)).toEqual(["Apps"]);
});

test("unknown paths redirect home", async () => {
  const b = (await app()).browser();
  const page = await b.get("/definitely-not-a-route");
  expect(page.hops.map((h) => h.status)).toEqual([301]);
  expect(page.url.pathname).toBe("/");
  expect(page.status).toBe(200);
});
