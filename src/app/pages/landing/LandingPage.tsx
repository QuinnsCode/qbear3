// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door. A feed first: one full-width post per featured app, each a message with a
// capture of the app running, its pitch and one button (codeSplitter, then the three games we are
// proudest of). Then the lab (every game and app is a verb and a noun; drop one on the other and the
// app appears), then the same compact shelves the hubs use.
import { type RequestInfo } from "rwsdk/worker";
import { FeedPost } from "@qntbr/ui";
import { apps, appGroups, gameGroups, games, isExternal, platformOf, type PortalEntry } from "@/app/pages/portal/portalData";
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from "@/app/pages/portal/PortalShell";
import { toneOf } from "@/app/pages/portal/tones";
import { KeyArt } from "./KeyArt";
import LandingLab from "./LandingLab";
import { labItems } from "./lab";

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
          eyebrow="QNTBR · Solutions architecture · Web apps & web solutions"
          title={<>Built for the <em>fleet.</em> Then we <em>play.</em></>}
          lede="We build tools we actually use and ship them on the runtime we wrote for it. Here is what is running right now: every picture below is the real thing, captured live."
        />
        <div className="q-feed">
          {FEED.map((key, i) => <EntryPost key={key} entry={byKey(key)} first={i === 0} />)}
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
        <LandingLab items={labItems()} seed={['verb:draft', 'noun:cards', 'verb:split', 'noun:code']} />
      </PortalSection>

      {/* ── Products: the code host and the runtime it ships on ── */}
      <PortalSection id="products">
        <PortalSectionHead
          small
          eyebrow="Products"
          title={<>What we <em>build.</em></>}
          lede="A code host for agents, the runtime it ships on, and everything we've built with them."
        />
        <PortalGroups bars entries={apps} groups={appGroups.filter((g) => g.key === 'dev')} />
      </PortalSection>

      {/* ── Game Center ── */}
      <PortalSection id="games">
        <PortalSectionHead
          small
          eyebrow="Game Center"
          title={<>The <em>tables.</em></>}
          lede="The games shipped on Rusty Buns, and a draft of the cube where QNTBR started."
          linkHref="/games"
          linkLabel="Open Game Center"
        />
        <PortalGroups bars entries={games} groups={gameGroups} />
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
        <PortalGroups bars entries={apps} groups={appGroups.filter((g) => g.key !== 'dev')} />
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
