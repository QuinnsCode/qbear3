// @/app/pages/portal/GameCenterPage.tsx
// /games — the Game Center hub: everything playable on QNTBR in one place.
import { type RequestInfo } from "rwsdk/worker";
import { emphasis, gamesContent as c } from '@/app/content';
import { games, gameGroups } from './portalGames';
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from './PortalShell';

export default function GameCenterPage({ ctx }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="games">
      <PortalSection>
        <PortalSectionHead
          as="h1"
          eyebrow={c.text('page.eyebrow')}
          title={emphasis(c.text('page.title'))}
          lede={c.text('page.lede')}
          linkHref="/draft/new"
          linkLabel={c.text('page.link')}
        />
        <PortalGroups bars entries={games} groups={gameGroups} />

        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">{c.text('howItWorks.label')}</span>
          <p className="q-prose" style={{ marginTop: 12 }}>{emphasis(c.text('howItWorks.text'), 'b')}</p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
