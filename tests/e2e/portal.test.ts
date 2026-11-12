// tests/e2e/portal.test.ts
// Main-domain portal: the landing page sections and the /games and /apps hubs.
import { expect, test } from "bun:test";
import { app, hasSection, headings, links, tags } from "./kit.ts";

const RUSTY_BUNS = "https://github.com/QuinnsCode/RustyBuns";

/** The hub shows eqosys's screenshot on at least these cards, and every screenshot it shows is served. */
async function expectShotsServed(b: ReturnType<Awaited<ReturnType<typeof app>>["browser"]>, body: string, keys: string[]) {
  const shots = [...body.matchAll(/<img\b[^>]*\bsrc="(\/shots\/[^"]+)"/g)].map((m) => m[1] ?? "");
  expect(shots).toEqual(expect.arrayContaining(keys.map((k) => `/shots/${k}.jpg`)));
  for (const src of new Set(shots)) expect((await b.get(src)).status).toBe(200);
}

test("landing page is a sky hero, the featured apps, then the lab and the shelves", async () => {
  const b = (await app()).browser();
  const page = await b.get("/");
  expect(page.status).toBe(200);
  expect(page.hops).toEqual([]);
  for (const id of ["feed", "lab", "products", "services", "games", "apps"]) expect(hasSection(page.body, id)).toBe(true);
  // The hero: eqosys's sky behind the headline, and its two buttons.
  expect(page.body).toContain('class="q-sky"');
  expect(headings(page.body)).toEqual(expect.arrayContaining(["Tell us the problem.We build the software."]));
  expect(links(page.body, { href: "#feed", class: "q-hero-go" })).toHaveLength(1);
  expect(links(page.body, { href: "/games", class: "q-hero-alt" })).toHaveLength(1);
  // What we do includes the commerce integrations.
  expect(headings(page.body)).toEqual(expect.arrayContaining(["Custom warehouse integrations", "3PL app integrations", "Drop shipping integrations"]));
  // One feature panel per featured app, codeSplitter first, each one link to the running app.
  const hosts = ["codesplitter", "git-recon", "skatetechpark", "park-hide-seek"];
  const feed = page.body.slice(page.body.indexOf('id="feed"'), page.body.indexOf('id="lab"'));
  expect(links(feed, { class: "q-feature-link" }).map((l) => l.attrs.href)).toEqual(hosts.map((h) => `https://${h}.notryanquinn.workers.dev`));
  // Each panel shows a capture of the app, and the capture is served.
  for (const key of ["codesplitter", "git-recon", "skate-tech-park", "park-hide-seek"]) {
    expect(feed).toContain(`src="/landing/${key}.jpg"`);
    const shot = await b.get(`/landing/${key}.jpg`);
    expect(shot.status).toBe(200);
  }
  // Magic: The Gathering is one shelf tile: a draft of the cube.
  expect(links(page.body, { href: "/draft/new", class: "q-feature-link" })).toHaveLength(1);
  expect(links(page.body, { href: "/sanctum" })).toHaveLength(0);
  expect(page.body).toContain("Git the main HEAD merged before the Conflict takes over");
  // The lab's bag is server-rendered: words to combine and every app already in it.
  const bag = tags(page.body, "button").map((t) => t.text);
  for (const name of ["Draft", "Cards", "Draft my cube", "codeSplitter", "Hippo Tycoon"]) {
    expect(bag.some((t) => t === name || t.includes(name))).toBe(true); // app tiles carry an emoji and an arrow
  }
  // Section links into the hubs, and RustyBuns from the nav.
  expect(links(page.body, { href: "/games", class: "q-section-link" })).toHaveLength(1);
  expect(links(page.body, { href: "/apps", class: "q-section-link" })).toHaveLength(1);
  expect(links(page.body, { href: RUSTY_BUNS, class: "q-nav-link" })).toHaveLength(1);
});

test("game center has one Magic link, to draft the cube, and marks itself active", async () => {
  const b = (await app()).browser();
  const page = await b.get("/games");
  expect(page.status).toBe(200);
  expect(page.url.pathname).toBe("/games");
  expect(headings(page.body)).toEqual(expect.arrayContaining(["Magic: The Gathering", "Draft my cube"]));
  expect(links(page.body, { href: "/draft/new", class: "q-card-play" })).toHaveLength(1);
  for (const gone of ["/sanctum", "/pvp", "/deckbuilder"]) expect(links(page.body, { href: gone })).toHaveLength(0);
  expect(links(page.body, { class: "q-active" }).map((l) => l.text)).toEqual(["Games"]);
});

test("game center is the Playground: play the deployed games, download or read the source", async () => {
  const b = (await app()).browser();
  const games = await b.get("/games");
  for (const host of ["park-hide-seek", "skatetechpark", "druids-curse-votv", "splat-spray", "two-fronts", "git-recon", "excalibrawl", "alien-disc-golf", "delayed-reaction", "mythic-masters", "splat-rooms"]) {
    expect(links(games.body, { href: `https://${host}.notryanquinn.workers.dev`, class: "q-card-play" })).toHaveLength(1);
  }
  // Hippo Tycoon plays on Railway and is also a desktop download; a live game still links its source.
  expect(links(games.body, { href: "https://hippo-ty32kk4m44sz57g2i6knvzzb7o-production.up.railway.app", class: "q-card-play" })).toHaveLength(1);
  expect(links(games.body, { text: /Download/ }).filter((l) => l.attrs.href?.includes("q=hippo-tycoon-v"))).toHaveLength(1);
  expect(links(games.body, { href: `${RUSTY_BUNS}/tree/main/apps/mythic-masters`, text: /Source/ })).toHaveLength(1);
  await expectShotsServed(b, games.body, ["alien-disc-golf", "hippo-tycoon", "mythic-masters", "what-would-fantano-say"]);
});

test("app center lists apps including RustyBuns on GitHub", async () => {
  const b = (await app()).browser();
  const page = await b.get("/apps");
  expect(page.status).toBe(200);
  expect(page.url.pathname).toBe("/apps");
  expect(headings(page.body)).toEqual(expect.arrayContaining(["RustyBuns", "FM Groovebox"]));
  for (const href of [RUSTY_BUNS, "https://qlave.dev", "https://codesplitter.notryanquinn.workers.dev", "https://fm-daw-worker-live-ryanquinn-ugis7btfi5dsu52t.notryanquinn.workers.dev"]) {
    expect(links(page.body, { href, class: "q-card-play" })).toHaveLength(1);
  }
  // Shippycloud is on ice: shown, not linked.
  expect(headings(page.body)).toContain("Shippycloud");
  expect(links(page.body, { href: "https://github.com/QuinnsCode/shippycloud" })).toHaveLength(0);
  expect(links(page.body, { class: "q-active" }).map((l) => l.text)).toEqual(["Apps"]);
  // qCRM's demo is live, labelled a proof of concept.
  expect(headings(page.body)).toEqual(expect.arrayContaining(["qCRM", "Flareup", "Staticflare", "Qlave", "Agent Office"]));
  expect(links(page.body, { href: "https://qcrm.qntbr.com", class: "q-card-play" })).toHaveLength(1);
  expect(page.body).toContain("Proof of concept");
  await expectShotsServed(b, page.body, ["codesplitter", "playground", "qcrm", "fm-daw"]);
});

test("unknown paths redirect home", async () => {
  const b = (await app()).browser();
  const page = await b.get("/definitely-not-a-route");
  expect(page.hops.map((h) => h.status)).toEqual([301]);
  expect(page.url.pathname).toBe("/");
  expect(page.status).toBe(200);
});
