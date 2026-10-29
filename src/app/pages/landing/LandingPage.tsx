// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door, in three sections: Products (the company), Game Center, App Center.
import { type RequestInfo } from "rwsdk/worker";
import { Button, CraftCanvas, Tile, type CraftItem, type Status } from "@qntbr/ui";
import { apps, games, isExternal, resolveHref, RUSTY_BUNS_URL } from "@/app/pages/portal/portalData";
import { PortalGrid, PortalPage, PortalSection, PortalSectionHead } from "@/app/pages/portal/PortalShell";

const products: Array<{
  key: string;
  name: string;
  tagline: string;
  description: string;
  bullets: string[];
  href: string;
  cta: string;
  accent: string;
  glyph: string;
  status: Status;
}> = [
  {
    key: 'qlave',
    name: 'Qlave',
    tagline: 'Web Calls & Collaboration',
    description: 'Audio, video, and real-time collaboration, browser native with no installs. Built for teams who want calls that disappear into the workflow instead of interrupting it.',
    bullets: ['WebRTC audio & video', 'Live collaboration tools', 'One link, any device', 'Integrated into QVTT'],
    href: 'https://qlave.dev',
    cta: 'Open Qlave',
    accent: '#7c3aed',
    glyph: '📞',
    status: 'live',
  },
  {
    key: 'qvtt',
    name: 'QVTT',
    tagline: 'Virtual Tabletop',
    description: 'Play Magic: The Gathering Commander online with your pod. Real-time board sync, life tracking, and in-game calls. Share one link and play.',
    bullets: ['MTG Commander online', 'Real-time multiplayer sync', 'In-game calls via Qlave', 'No installs for players'],
    href: '/qvtt',
    cta: 'Enter the Sanctum',
    accent: '#16a34a',
    glyph: '🏛️',
    status: 'live',
  },
  {
    key: 'flareup',
    name: 'Flareup',
    tagline: 'Infrastructure Cost Monitor',
    description: "Visibility into your infrastructure spend without digging through dashboards. Know what you're burning before your bill surprises you.",
    bullets: ['Real-time spend alerts', 'Usage breakdowns', 'Cost trend tracking', 'At-a-glance dashboard'],
    href: 'https://flareup.dev',
    cta: 'Check the Burn',
    accent: '#dc2626',
    glyph: '🔥',
    status: 'live',
  },
  {
    key: 'staticflare',
    name: 'Staticflare',
    tagline: 'Static Hosting',
    description: 'Deploy static sites to the edge in one command. Any TypeScript app with a build step can ship, with the infrastructure wiring handled for you.',
    bullets: ['Edge-native deployment', 'Any TS/SSG framework', 'One command to ship', 'Your infrastructure'],
    href: 'https://staticflare.dev',
    cta: 'Coming Soon',
    accent: '#71717a',
    glyph: '⚡',
    status: 'soon',
  },
];

export default function LandingPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  // Every game and app becomes a tile in the bag.
  const craftItems: CraftItem[] = [...games, ...apps].map((e) => {
    const href = resolveHref(e, request);
    return { id: e.key, label: e.name, glyph: e.glyph, accent: e.accent, href: e.status === 'soon' ? undefined : href, external: isExternal(href) };
  });

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="home">
      {/* ── Hero ── */}
      <PortalSection>
        <PortalSectionHead
          as="h1"
          eyebrow="Solutions Architect · Web Apps & Web Solutions"
          title={<>Software that makes things <em>work.</em></>}
          lede="A suite of web tools built to solve real problems: calls, games, deployments, visibility. Each one ships, each one runs."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 28 }}>
          <Button href="#products">Products</Button>
          <Button href="#games">Game Center</Button>
          <Button href="#apps">App Center</Button>
          <Button href={RUSTY_BUNS_URL} target="_blank">RustyBuns ↗</Button>
        </div>
        <CraftCanvas items={craftItems} seed={['sanctum', 'sandbox', 'qlave', 'rustybuns']} title="Everything" />
      </PortalSection>

      {/* ── Section 1: Products (the company) ── */}
      <PortalSection id="products">
        <PortalSectionHead
          small
          eyebrow="Products"
          title="What we build"
          lede="The suite. Each product is tested against the others in production."
        />
        <div style={{ display: 'grid', gap: 14 }}>
          {products.map((p) => (
            <Tile
              key={p.key}
              wide
              name={p.name}
              tagline={p.tagline}
              description={p.description}
              accent={p.accent}
              glyph={p.glyph}
              status={p.status}
              href={p.href}
              cta={p.cta}
              external={isExternal(p.href)}
              aside={<ul className="q-list">{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
            />
          ))}
        </div>
      </PortalSection>

      {/* ── Section 2: Game Center ── */}
      <PortalSection id="games">
        <PortalSectionHead
          small
          eyebrow="Game Center"
          title={<>Pick a table. <em>Play.</em></>}
          lede="Commander tables, drafts, a sandbox that never closes, and a strategy map. One Q auth account, every game."
          linkHref="/games"
          linkLabel="Open Game Center"
        />
        <PortalGrid entries={games.slice(0, 4)} request={request} />
      </PortalSection>

      {/* ── Section 3: App Center ── */}
      <PortalSection id="apps">
        <PortalSectionHead
          small
          eyebrow="App Center"
          title={<>Tools that <em>ship.</em></>}
          lede="Calls, cost monitoring, hosting, fulfillment, and RustyBuns, the open-source runtime that ships a web app as a native binary."
          linkHref="/apps"
          linkLabel="Open App Center"
        />
        <PortalGrid entries={apps.slice(0, 4)} request={request} />
      </PortalSection>

      {/* ── About ── */}
      <PortalSection>
        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">About</span>
          <p className="q-prose" style={{ marginTop: 12 }}>
            QNTBR is a <b>solutions architecture studio</b> focused on web apps and web solutions.
            We build tools we actually use. Each product in the suite is tested against the others in production.
            The goal is software that works, ships fast, and stays out of your way.
          </p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
