// @/app/pages/portal/AppCenterPage.tsx
// /apps — the App Center hub: the business tools and open-source projects.
import { type RequestInfo } from "rwsdk/worker";
import { apps, RUSTY_BUNS_URL } from './portalData';
import { PORTAL_BG, PortalFooter, PortalGrid, PortalNav, PortalSectionHead, PortalStyles } from './PortalShell';

export default function AppCenterPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <div style={{ minHeight: '100vh', background: PORTAL_BG, color: '#e4e4e7', fontFamily: "'Syne', sans-serif" }}>
      <PortalStyles />
      <PortalNav isLoggedIn={isLoggedIn} current="apps" />

      <PortalSectionHead
        eyebrow="App Center"
        title={<>Tools that<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#27272a' }}>ship.</em></>}
        lede="Calls, cost monitoring, hosting, fulfillment, and the open-source runtime that packages a web app as a native binary. The business side of QNTBR."
        linkHref={RUSTY_BUNS_URL}
        linkLabel="RustyBuns on GitHub"
      />

      <PortalGrid entries={apps} request={request} />

      <section style={{ padding: 'clamp(3rem, 8vw, 5.5rem) clamp(1.5rem, 4vw, 3rem)' }}>
        <p className="eyebrow" style={{ marginBottom: '1.5rem' }}>One login</p>
        <p className="about-body">
          Apps marked <span>Q auth</span> use the shared QNTBR account: email and password, organizations, and API keys
          from one place. Standalone products like Qlave and Flareup keep their own sign-in for now and will join the
          shared login as it rolls out.
        </p>
      </section>

      <PortalFooter />
    </div>
  );
}
