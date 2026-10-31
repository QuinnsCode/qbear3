// @/app/pages/landing/LandingPage.tsx
// The QNTBR front door, shaped like the Game Center page: a head, the thing itself, then the
// shelves. The thing itself is the lab: every game and app is a verb and a noun, drop one on
// the other and the app appears. The shelves below are the same compact groups the hubs use.
import { type RequestInfo } from "rwsdk/worker";
import { apps, appGroups, gameGroups, games } from "@/app/pages/portal/portalData";
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from "@/app/pages/portal/PortalShell";
import LandingLab from "./LandingLab";
import { labItems } from "./lab";

export default function LandingPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;
  const items = labItems(request);

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="home">
      {/* ── Hero: the lab ── */}
      <PortalSection>
        <PortalSectionHead
          as="h1"
          eyebrow="QNTBR · Solutions architecture · Web apps & web solutions"
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
