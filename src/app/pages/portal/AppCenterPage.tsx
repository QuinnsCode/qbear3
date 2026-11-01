// @/app/pages/portal/AppCenterPage.tsx
// /apps — the App Center hub: the business tools and open-source projects.
import { type RequestInfo } from "rwsdk/worker";
import { apps, appGroups, RUSTY_BUNS_URL } from './portalData';
import { PortalGroups, PortalPage, PortalSection, PortalSectionHead } from './PortalShell';

export default function AppCenterPage({ ctx }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <PortalPage isLoggedIn={isLoggedIn} current="apps">
      <PortalSection>
        <PortalSectionHead
          as="h1"
          eyebrow="App Center"
          title={<>Tools that <em>ship.</em></>}
          lede="Calls, cost monitoring, hosting, fulfillment, and the open-source runtime that packages a web app as a native binary. The business side of QNTBR."
          linkHref={RUSTY_BUNS_URL}
          linkLabel="RustyBuns on GitHub"
        />
        <PortalGroups bars entries={apps} groups={appGroups} />

        <div style={{ paddingTop: 'clamp(40px, 7vw, 72px)' }}>
          <span className="q-label">One login</span>
          <p className="q-prose" style={{ marginTop: 12 }}>
            One account for every Q app lives on <b>eqosys</b>. Standalone products like Qlave and Flareup keep their
            own sign-in for now and will join it as it rolls out.
          </p>
        </div>
      </PortalSection>
    </PortalPage>
  );
}
