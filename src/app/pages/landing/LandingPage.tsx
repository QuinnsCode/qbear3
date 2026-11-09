// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door, laid out like the Rusty Buns front doors (eqosys and the Playground): eqosys's day-and-night
// sky behind a big headline, then eqosys's featured panel (codeSplitter, screenshot beside its words) with the three
// games we are proudest of under it, then the lab (every game and app is a verb and a noun; drop one on the other and
// the app appears), what we do, and eqosys-style shelves of screenshot tiles. The page runs wide (PortalPage `wide`).
import { type RequestInfo } from "rwsdk/worker";
import { games, gameGroups } from "@/app/pages/portal/portalGames";
import { apps, appGroups, type PortalEntry } from "@/app/pages/portal/portalData";
import { PortalPage, PortalSection, PortalSectionHead } from "@/app/pages/portal/PortalShell";
import { emphasis, landing as c } from "@/app/content";
import LandingLab from "./LandingLab";
import { labItems } from "./labItems";
import { Feature, Hero, Shelves } from "./Showcase";
import { skyPhase } from "./Sky";

/** The featured row, top to bottom: the one app the page is about, then the games. */
export const FEED = ['codesplitter', 'git-recon', 'skate-tech-park', 'park-hide-seek'] as const;

/** What we do, in order: each one's title and line are services.items.<key> in content/landing.json. */
const SERVICES = ['webapps', 'architecture', 'warehouse', 'threepl', 'dropship', 'desktop'] as const;

const byKey = (key: string): PortalEntry => {
  const entry = [...apps, ...games].find((e) => e.key === key);
  if (!entry) throw new Error(`landing: no portal entry "${key}"`);
  return entry;
};

export default function LandingPage({ ctx }: RequestInfo) {
  const isLoggedIn = !!ctx.user;
  const [lead, ...rest] = FEED.map(byKey);

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="home" wide>
      {/* The likely next pages. After hydration rwsdk's client navigation fetches their RSC payload into its
          navigation cache, so a click on one swaps the page in without waiting on the network. */}
      <link rel="x-prefetch" href="/games" />
      {!isLoggedIn && <link rel="x-prefetch" href="/user/login" />}

      {/* ── The hero, on eqosys's sky ── */}
      <Hero
        t0={skyPhase()}
        eyebrow={c.text('hero.eyebrow')}
        line1={c.text('hero.line1')}
        line2={c.text('hero.line2')}
        lede={emphasis(c.text('hero.lede'), 'b')}
        primary={{ label: c.text('hero.primary'), href: '#feed' }}
        secondary={{ label: c.text('hero.secondary'), href: '/games' }}
        facts={c.text('hero.facts').split(' / ')}
      />

      {/* ── Featured: codeSplitter big, then the three games ── */}
      <PortalSection id="feed">
        <PortalSectionHead
          small
          eyebrow={c.text('feed.eyebrow')}
          title={emphasis(c.text('feed.title'))}
          lede={c.text('feed.lede')}
        />
        <div className="q-features">
          <Feature entry={lead!} big />
          <div className="q-spotlight">
            {rest.map((e, i) => <Feature key={e.key} entry={e} n={i + 1} />)}
          </div>
        </div>
      </PortalSection>

      {/* ── The lab ── */}
      <PortalSection id="lab">
        <PortalSectionHead
          small
          eyebrow={c.text('lab.eyebrow')}
          title={emphasis(c.text('lab.title'))}
          lede={c.text('lab.lede')}
        />
        <LandingLab items={labItems()} seed={['verb:draft', 'noun:cards', 'verb:split', 'noun:code']} />
      </PortalSection>

      {/* ── Products: the code host and the runtime it ships on ── */}
      <PortalSection id="products">
        <PortalSectionHead
          small
          eyebrow={c.text('products.eyebrow')}
          title={emphasis(c.text('products.title'))}
          lede={c.text('products.lede')}
        />
        <Shelves entries={apps} groups={appGroups.filter((g) => g.key === 'dev')} />
      </PortalSection>

      {/* ── What we do ── */}
      <PortalSection id="services">
        <PortalSectionHead
          small
          eyebrow={c.text('services.eyebrow')}
          title={emphasis(c.text('services.title'))}
          lede={c.text('services.lede')}
        />
        <ul className="q-services">
          {SERVICES.map((key) => (
            <li key={key}>
              <h3>{c.text(`services.items.${key}.title`)}</h3>
              <p>{emphasis(c.text(`services.items.${key}.text`), 'b')}</p>
            </li>
          ))}
        </ul>
      </PortalSection>

      {/* ── Game Center ── */}
      <PortalSection id="games">
        <PortalSectionHead
          small
          eyebrow={c.text('games.eyebrow')}
          title={emphasis(c.text('games.title'))}
          lede={c.text('games.lede')}
          linkHref="/games"
          linkLabel={c.text('games.link')}
        />
        <Shelves entries={games} groups={gameGroups} />
      </PortalSection>

      {/* ── App Center ── */}
      <PortalSection id="apps">
        <PortalSectionHead
          small
          eyebrow={c.text('apps.eyebrow')}
          title={emphasis(c.text('apps.title'))}
          lede={c.text('apps.lede')}
          linkHref="/apps"
          linkLabel={c.text('apps.link')}
        />
        <Shelves entries={apps} groups={appGroups.filter((g) => g.key !== 'dev')} />
      </PortalSection>

      {/* ── About ── */}
      <PortalSection>
        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">{c.text('about.label')}</span>
          <p className="q-prose" style={{ marginTop: 12 }}>{emphasis(c.text('about.text'), 'b')}</p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
