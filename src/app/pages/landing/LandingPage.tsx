// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door. The headline act first: codeSplitter on a full-width Steam-style capsule,
// then the three games we are proudest of on their own capsules, then the lab (every game and app
// is a verb and a noun; drop one on the other and the app appears), then the same compact shelves
// the hubs use.
import { type RequestInfo } from "rwsdk/worker";
import { Capsule } from "@qntbr/ui";
import { apps, appGroups, gameGroups, games, isExternal, resolveHref, type PortalEntry } from "@/app/pages/portal/portalData";
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from "@/app/pages/portal/PortalShell";
import { KeyArt } from "./KeyArt";
import LandingLab from "./LandingLab";
import { labItems } from "./lab";

/** The one app the page is about, and the games under it, in the order they are shown. */
export const FEATURED_APP = 'codesplitter';
export const FEATURED_GAMES = ['git-recon', 'skate-tech-park', 'park-hide-seek'] as const;

const byKey = (key: string): PortalEntry => {
  const entry = [...apps, ...games].find((e) => e.key === key);
  if (!entry) throw new Error(`landing: no portal entry "${key}"`);
  return entry;
};

function EntryCapsule({ entry, request, hero }: { entry: PortalEntry; request: Request; hero?: boolean }) {
  const href = resolveHref(entry, request);
  return (
    <Capsule
      hero={hero}
      nameAs={hero ? 'h2' : 'h3'}
      name={entry.name}
      tag={entry.tag}
      tagline={entry.tagline}
      pitch={entry.pitch}
      art={entry.image ?? <KeyArt entryKey={entry.key} glyph={entry.glyph} />}
      href={href}
      cta={entry.cta}
      external={isExternal(href)}
    />
  );
}

export default function LandingPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;
  const items = labItems(request);

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="home">
      {/* ── Feature: codeSplitter ── */}
      <PortalSection id="feature">
        <PortalSectionHead
          as="h1"
          eyebrow="QNTBR · Solutions architecture · Web apps & web solutions"
          title={<>Built for the <em>fleet.</em></>}
          lede="We build tools we actually use and ship them on the runtime we wrote for it. This is the one we would show you first."
        />
        <EntryCapsule entry={byKey(FEATURED_APP)} request={request} hero />
      </PortalSection>

      {/* ── Featured games ── */}
      <PortalSection id="featured-games">
        <PortalSectionHead
          small
          eyebrow="Game Center · Featured"
          title={<>Then we <em>play.</em></>}
          lede="Three games shipped on Rusty Buns, in the order we love them. Each one is a browser tab away; the whole Game Center is further down."
        />
        <div className="q-capsules">
          {FEATURED_GAMES.map((key) => <EntryCapsule key={key} entry={byKey(key)} request={request} />)}
        </div>
      </PortalSection>

      {/* ── The lab ── */}
      <PortalSection id="lab">
        <PortalSectionHead
          small
          eyebrow="The lab"
          title={<>Combine words. <em>Get software.</em></>}
          lede="Every game and app we ship is a verb and a noun. Drop one on the other and it appears; click it to go. The whole shelf is in the bag if you would rather just pick."
        />
        <LandingLab items={items} seed={['verb:draft', 'noun:cards', 'verb:split', 'noun:code']} />
      </PortalSection>

      {/* ── Products: the code host and the runtime it ships on ── */}
      <PortalSection id="products">
        <PortalSectionHead
          small
          eyebrow="Products"
          title={<>What we <em>build.</em></>}
          lede="A code host for agents, the runtime it ships on, and everything we've built with them."
        />
        <PortalGroups compact entries={apps} groups={appGroups.filter((g) => g.key === 'dev')} request={request} />
      </PortalSection>

      {/* ── Game Center ── */}
      <PortalSection id="games">
        <PortalSectionHead
          small
          eyebrow="Game Center"
          title={<>The <em>tables.</em></>}
          lede="Where QNTBR started: Commander tables, drafts, a sandbox that never closes, a strategy map, and the games shipped on Rusty Buns."
          linkHref="/games"
          linkLabel="Open Game Center"
        />
        <PortalGroups compact entries={games} groups={gameGroups} request={request} />
      </PortalSection>

      {/* ── App Center ── */}
      <PortalSection id="apps">
        <PortalSectionHead
          small
          eyebrow="App Center"
          title={<>The <em>rest.</em></>}
          lede="Calls, fulfillment, one login for everything, and the projects on the back burner."
          linkHref="/apps"
          linkLabel="Open App Center"
        />
        <PortalGroups compact entries={apps} groups={appGroups.filter((g) => g.key !== 'dev')} request={request} />
      </PortalSection>

      {/* ── About ── */}
      <PortalSection>
        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">About</span>
          <p className="q-prose" style={{ marginTop: 12 }}>
            QNTBR is a <b>solutions architecture studio</b> focused on web apps and web solutions.
            We build tools we actually use, and ship them on the runtime we wrote for it.
            The goal is software that works, ships fast, and stays out of your way.
          </p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
