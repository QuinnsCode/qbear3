// tests/e2e/portal.test.ts
// Main-domain portal: the landing page sections and the /games and /apps hubs.
import { expect, test } from "bun:test";
import { app, hasSection, headings, links, tags } from "./kit.ts";

const RUSTY_BUNS = "https://github.com/QuinnsCode/RustyBuns";

test("landing page leads with codeSplitter, then the featured games, the lab and the shelves", async () => {
  const b = (await app()).browser();
  const page = await b.get("/");
  expect(page.status).toBe(200);
  expect(page.hops).toEqual([]);
  for (const id of ["feature", "featured-games", "lab", "products", "games", "apps"]) expect(hasSection(page.body, id)).toBe(true);
  // The feature capsule is one link to codeSplitter; the three games sit on their own capsules under it.
  expect(links(page.body, { href: "https://codesplitter.notryanquinn.workers.dev", class: "q-hero" })).toHaveLength(1);
  for (const host of ["git-recon", "skatetechpark", "park-hide-seek"]) {
    expect(links(page.body, { href: `https://${host}.notryanquinn.workers.dev`, class: "q-capsule" })).toHaveLength(1);
  }
  expect(page.body).toContain("Git the main HEAD merged before the Conflict takes over");
  // The lab's bag is server-rendered: words to combine and every app already in it.
  const bag = tags(page.body, "button").map((t) => t.text);
  for (const name of ["Draft", "Cards", "Draft Lobby", "codeSplitter", "Hippo Tycoon"]) {
    expect(bag.some((t) => t === name || t.includes(name))).toBe(true); // app tiles carry an emoji and an arrow
  }
  // Section links into the hubs, and RustyBuns from the nav.
  expect(links(page.body, { href: "/games", class: "q-section-link" })).toHaveLength(1);
  expect(links(page.body, { href: "/apps", class: "q-section-link" })).toHaveLength(1);
  expect(links(page.body, { href: RUSTY_BUNS, class: "q-nav-link" })).toHaveLength(1);
});

test("game center lists games and marks itself active", async () => {
  const b = (await app()).browser();
  const page = await b.get("/games");
  expect(page.status).toBe(200);
  expect(page.url.pathname).toBe("/games");
  expect(headings(page.body)).toEqual(expect.arrayContaining(["Sanctum", "Sandbox"]));
  expect(links(page.body, { href: "/sanctum", class: "q-tile" })).toHaveLength(1);
  expect(links(page.body, { class: "q-active" }).map((l) => l.text)).toEqual(["Games"]);
});

test("game and app centers link the deployed Rusty Buns apps, not their repo", async () => {
  const b = (await app()).browser();
  const games = await b.get("/games");
  for (const host of ["park-hide-seek", "skatetechpark", "druids-curse-votv", "splat-spray", "two-fronts", "git-recon", "excalibrawl"]) {
    expect(links(games.body, { href: `https://${host}.notryanquinn.workers.dev`, class: "q-tile" })).toHaveLength(1);
  }
  const apps = await b.get("/apps");
  expect(links(apps.body, { href: "https://codesplitter.notryanquinn.workers.dev", class: "q-tile" })).toHaveLength(1);
});

test("app center lists apps including RustyBuns on GitHub", async () => {
  const b = (await app()).browser();
  const page = await b.get("/apps");
  expect(page.status).toBe(200);
  expect(page.url.pathname).toBe("/apps");
  expect(headings(page.body)).toContain("RustyBuns");
  expect(links(page.body, { href: RUSTY_BUNS, class: "q-tile" })).toHaveLength(1);
  expect(links(page.body, { href: "https://qlave.dev", class: "q-tile" })).toHaveLength(1);
  expect(links(page.body, { class: "q-active" }).map((l) => l.text)).toEqual(["Apps"]);
});

test("unknown paths redirect home", async () => {
  const b = (await app()).browser();
  const page = await b.get("/definitely-not-a-route");
  expect(page.hops.map((h) => h.status)).toEqual([301]);
  expect(page.url.pathname).toBe("/");
  expect(page.status).toBe(200);
});
