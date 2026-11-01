// tests/e2e/portal.test.ts
// Main-domain portal: the landing page sections and the /games and /apps hubs.
import { expect, test } from "bun:test";
import { app, hasSection, headings, links, tags } from "./kit.ts";

const RUSTY_BUNS = "https://github.com/QuinnsCode/RustyBuns";

test("landing page is a feed of the featured apps, then the lab and the shelves", async () => {
  const b = (await app()).browser();
  const page = await b.get("/");
  expect(page.status).toBe(200);
  expect(page.hops).toEqual([]);
  for (const id of ["feed", "lab", "products", "games", "apps"]) expect(hasSection(page.body, id)).toBe(true);
  // One post per featured app, codeSplitter first, each one link to the running app.
  const hosts = ["codesplitter", "git-recon", "skatetechpark", "park-hide-seek"];
  const posts = links(page.body, { class: "q-post" }).map((l) => l.attrs.href);
  expect(posts).toEqual(hosts.map((h) => `https://${h}.notryanquinn.workers.dev`));
  // Each post shows a capture of the app, and the capture is served.
  for (const key of ["codesplitter", "git-recon", "skate-tech-park", "park-hide-seek"]) {
    const shot = await b.get(`/landing/${key}.jpg`);
    expect(shot.status).toBe(200);
  }
  // Magic: The Gathering on the front door is one bar, a draft of the cube; the other tables live on /games.
  expect(links(page.body, { href: "/draft/new", class: "q-tile" }).map((l) => l.attrs.class)).toEqual([expect.stringContaining("q-wide")]);
  expect(links(page.body, { href: "/sanctum", class: "q-tile" })).toHaveLength(0);
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
  // Shippycloud is on ice: shown, not linked.
  expect(headings(page.body)).toContain("Shippycloud");
  expect(links(page.body, { href: "https://github.com/QuinnsCode/shippycloud" })).toHaveLength(0);
  expect(links(page.body, { class: "q-active" }).map((l) => l.text)).toEqual(["Apps"]);
});

test("unknown paths redirect home", async () => {
  const b = (await app()).browser();
  const page = await b.get("/definitely-not-a-route");
  expect(page.hops.map((h) => h.status)).toEqual([301]);
  expect(page.url.pathname).toBe("/");
  expect(page.status).toBe(200);
});
