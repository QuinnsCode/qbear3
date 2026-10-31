// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door, newest first: codeSplitter, then Rusty Buns and the apps built on it,
// then the original QNTBR tables, then Qlave, with the back-burner projects in one muted line.
import { type RequestInfo } from "rwsdk/worker";
import { Button, CraftCanvas, Feature, Tile, type CraftItem } from "@qntbr/ui";
import { apps, gameGroups, games, isExternal, PLAYGROUND_URL, playgroundApps, resolveHref } from "@/app/pages/portal/portalData";
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead, PlaygroundRow } from "@/app/pages/portal/PortalShell";

const byKey = (key: string) => [...apps, ...games].find((e) => e.key === key)!;

export default function LandingPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;
  const codeSplitter = byKey('codesplitter');
  const rustyBuns = byKey('rustybuns');
  const qlave = byKey('qlave');
  const CodeSplitterIcon = codeSplitter.icon;
  const RustyBunsIcon = rustyBuns.icon;
  const QlaveIcon = qlave.icon;

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
          lede="A code host for agents, the runtime it ships on, and everything we've built with them."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 28 }}>
          <Button href="#products">codeSplitter</Button>
          <Button href="#rustybuns">Rusty Buns</Button>
          <Button href="#games">Game Center</Button>
          <Button href="#apps">App Center</Button>
        </div>
      </PortalSection>

      {/* ── Products: codeSplitter first, then Rusty Buns and everything shipped on it ── */}
      <PortalSection id="products">
        <div style={{ display: 'grid', gap: 18 }}>
          <Feature
            hero
            name={codeSplitter.name}
            tag={codeSplitter.tag}
            tagline={codeSplitter.tagline}
            description={codeSplitter.description}
            bullets={['Every line a record', 'Real git on Cloudflare Artifacts', 'Built for agents to read and write', 'Ships on Rusty Buns']}
            icon={<CodeSplitterIcon strokeWidth={1.25} />}
            image={codeSplitter.image}
            accent={codeSplitter.accent}
            status={codeSplitter.status}
            actions={
              <>
                <Button variant="primary" href={codeSplitter.href} target="_blank">{codeSplitter.cta} ↗</Button>
                <Button href="#rustybuns">Built on Rusty Buns ↓</Button>
              </>
            }
          />

          <Feature
            id="rustybuns"
            name={rustyBuns.name}
            tag={rustyBuns.tag}
            tagline={rustyBuns.tagline}
            description={rustyBuns.description}
            bullets={['One double-clickable desktop binary', 'Local Bun host behind D1, KV, R2 and Durable Objects', 'Typed Cloudflare deploy', 'Never touches your src/']}
            icon={<RustyBunsIcon strokeWidth={1.25} />}
            image={rustyBuns.image}
            accent={rustyBuns.accent}
            status={rustyBuns.status}
            actions={
              <>
                <Button variant="primary" href={PLAYGROUND_URL} target="_blank">Open the Playground ↗</Button>
                <Button href={rustyBuns.href} target="_blank">{rustyBuns.cta} ↗</Button>
              </>
            }
            drawer={{
              label: `All ${playgroundApps.length} apps in the Rusty Buns Playground`,
              peek: playgroundApps.map((a) => <a.icon key={a.key} strokeWidth={1.5} />),
              rows: true,
              children: playgroundApps.map((a) => <PlaygroundRow key={a.key} app={a} />),
            }}
          />

          <CraftCanvas items={craftItems} seed={['codesplitter', 'rustybuns', 'park-hide-seek', 'excalibrawl']} title="Everything" />
        </div>
      </PortalSection>

      {/* ── Game Center: the original QNTBR tables ── */}
      <PortalSection id="games">
        <PortalSectionHead
          small
          eyebrow="Game Center"
          title={<>The original <em>tables.</em></>}
          lede="Where QNTBR started: Commander tables, drafts, a sandbox that never closes, and a strategy map. One Q auth account, every game."
          linkHref="/games"
          linkLabel="Open Game Center"
        />
        <PortalGroups compact entries={games} groups={gameGroups.filter((g) => g.key !== 'rustybuns')} request={request} />
      </PortalSection>

      {/* ── App Center: Qlave, and the rest in a line ── */}
      <PortalSection id="apps">
        <PortalSectionHead
          small
          eyebrow="App Center"
          title={<>Calls, and the <em>rest.</em></>}
          linkHref="/apps"
          linkLabel="Open App Center"
        />
        <Tile
          wide
          name={qlave.name}
          tag={qlave.tag}
          tagline={qlave.tagline}
          description={qlave.description}
          icon={<QlaveIcon strokeWidth={1.5} />}
          accent={qlave.accent}
          status={qlave.status}
          href={qlave.href}
          cta={qlave.cta}
          external
          aside={<ul className="q-list">{['WebRTC audio & video', 'Live collaboration tools', 'One link, any device', 'Integrated into QVTT'].map((b) => <li key={b}>{b}</li>)}</ul>}
        />
        <p className="q-aside-line">
          On the back burner, now that Rusty Buns covers most of it:{' '}
          <a href={byKey('flareup').href} target="_blank" rel="noreferrer">Flareup</a>, and{' '}
          <a href={byKey('staticflare').href} target="_blank" rel="noreferrer">Staticflare</a>, which we're rebuilding
          as a shaved-down EmDash on Rusty Buns.
        </p>
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
