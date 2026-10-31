// @/app/pages/portal/GameCenterPage.tsx
// /games — the Game Center hub: everything playable on QNTBR in one place.
import { type RequestInfo } from "rwsdk/worker";
import { games, gameGroups } from './portalData';
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from './PortalShell';

export default function GameCenterPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="games">
      <PortalSection>
        <PortalSectionHead
          as="h1"
          eyebrow="Game Center"
          title={<>Pick a table. <em>Play.</em></>}
          lede="Commander tables, drafts, a sandbox that never closes, and a strategy map for when you want to conquer something. One account, every game."
          linkHref={isLoggedIn ? '/sanctum' : '/user/signup'}
          linkLabel={isLoggedIn ? 'Go to Sanctum' : 'Create an account'}
        />
        <PortalGroups entries={games} groups={gameGroups} request={request} />

        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">How it works</span>
          <p className="q-prose" style={{ marginTop: 12 }}>
            Every table is a <b>Durable Object</b> at the edge. Actions go over a WebSocket, the room applies them,
            and everyone at the table sees the same board at the same time. Sign in once with <b>Q auth</b> and
            your decks, friends, and invites follow you between games.
          </p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
