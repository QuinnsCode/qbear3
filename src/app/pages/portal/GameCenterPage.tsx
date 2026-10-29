// @/app/pages/portal/GameCenterPage.tsx
// /games — the Game Center hub: everything playable on QNTBR in one place.
import { type RequestInfo } from "rwsdk/worker";
import { games } from './portalData';
import { PORTAL_BG, PortalFooter, PortalGrid, PortalNav, PortalSectionHead, PortalStyles } from './PortalShell';

export default function GameCenterPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <div style={{ minHeight: '100vh', background: PORTAL_BG, color: '#e4e4e7', fontFamily: "'Syne', sans-serif" }}>
      <PortalStyles />
      <PortalNav isLoggedIn={isLoggedIn} current="games" />

      <PortalSectionHead
        eyebrow="Game Center"
        title={<>Pick a table.<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#27272a' }}>Play.</em></>}
        lede="Commander tables, drafts, a sandbox that never closes, and a strategy map for when you want to conquer something. One account, every game."
        linkHref={isLoggedIn ? '/sanctum' : '/user/signup'}
        linkLabel={isLoggedIn ? 'Go to Sanctum' : 'Create an account'}
      />

      <PortalGrid entries={games} request={request} />

      <section style={{ padding: 'clamp(3rem, 8vw, 5.5rem) clamp(1.5rem, 4vw, 3rem)' }}>
        <p className="eyebrow" style={{ marginBottom: '1.5rem' }}>How it works</p>
        <p className="about-body">
          Every table is a <span>Durable Object</span> at the edge. Actions go over a WebSocket, the room applies them,
          and everyone at the table sees the same board at the same time. Sign in once with <span>Q auth</span> and
          your decks, friends, and invites follow you between games.
        </p>
      </section>

      <PortalFooter />
    </div>
  );
}
