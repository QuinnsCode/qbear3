// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door. A feed first: one full-width post per featured app, each a message with a
// capture of the app running, its pitch and one button (codeSplitter, then the three games we are
// proudest of). Then the lab (every game and app is a verb and a noun; drop one on the other and the
// app appears), then the same compact shelves the hubs use.
import { type RequestInfo } from "rwsdk/worker";
import { FeedPost } from "@qntbr/ui";
import { games, gameGroups } from "@/app/pages/portal/portalGames";
import { apps, appGroups, isExternal, platformOf, type PortalEntry } from "@/app/pages/portal/portalData";
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from "@/app/pages/portal/PortalShell";
import { toneOf } from "@/app/pages/portal/tones";
import { emphasis, landing as c } from "@/app/content";
import { KeyArt } from "./KeyArt";
import LandingLab from "./LandingLab";
import { labItems } from "./labItems";

/** The feed, top to bottom: the one app the page is about, then the games. */
export const FEED = ['codesplitter', 'git-recon', 'skate-tech-park', 'park-hide-seek'] as const;

const byKey = (key: string): PortalEntry => {
  const entry = [...apps, ...games].find((e) => e.key === key);
  if (!entry) throw new Error(`landing: no portal entry "${key}"`);
  return entry;
};

function EntryPost({ entry, first }: { entry: PortalEntry; first?: boolean }) {
  const href = entry.href;
  const external = isExternal(href);
  const platform = platformOf(entry.key);
  return (
    <FeedPost
      nameAs="h2"
      eager={first}
      name={entry.name}
      tag={entry.tag}
      source={external ? new URL(href).host : undefined}
      avatar={entry.glyph}
      tone={toneOf(entry.key, entry.group)}
      platform={platform && { icon: <platform.icon strokeWidth={1.75} />, label: platform.label }}
      tagline={entry.tagline}
      shot={entry.image ?? <KeyArt entryKey={entry.key} glyph={entry.glyph} />}
      pitch={entry.pitch}
      href={href}
      cta={entry.cta}
      external={external}
    />
  );
}

export default function LandingPage({ ctx }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="home">
      {/* ── The feed: one post per featured app ── */}
      <PortalSection id="feed">
        <PortalSectionHead
          as="h1"
          eyebrow={c.text('feed.eyebrow')}
          title={emphasis(c.text('feed.title'))}
          lede={c.text('feed.lede')}
        />
        <div className="q-feed">
          {FEED.map((key, i) => <EntryPost key={key} entry={byKey(key)} first={i === 0} />)}
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
        <PortalGroups bars entries={apps} groups={appGroups.filter((g) => g.key === 'dev')} />
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
        <PortalGroups bars entries={games} groups={gameGroups} />
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
        <PortalGroups bars entries={apps} groups={appGroups.filter((g) => g.key !== 'dev')} />
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
