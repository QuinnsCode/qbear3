// @/app/pages/portal/GameCenterPage.tsx
// /games — the Game Center hub: everything playable on QNTBR in one place.
import { type RequestInfo } from "rwsdk/worker";
import { games, gameGroups } from './portalData';
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from './PortalShell';

export default function GameCenterPage({ ctx }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="games">
      <PortalSection>
        <PortalSectionHead
          as="h1"
          eyebrow="Game Center"
          title={<>Pick a table. <em>Play.</em></>}
          lede="The games shipped on Rusty Buns, and a draft of the cube where QNTBR started."
          linkHref="/draft/new"
          linkLabel="Draft the cube"
        />
        <PortalGroups bars entries={games} groups={gameGroups} />

        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">How it works</span>
          <p className="q-prose" style={{ marginTop: 12 }}>
            Every table is a <b>Durable Object</b> at the edge. Actions go over a WebSocket, the room applies them,
            and everyone at the table sees the same board at the same time. Accounts are moving to
            <b>eqosys</b>, one login for every Q app.
          </p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
