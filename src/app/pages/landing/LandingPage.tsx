// @/app/pages/landing/LandingPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { apps, games, RUSTY_BUNS_URL } from "@/app/pages/portal/portalData";
import { PORTAL_BG, PortalFooter, PortalGrid, PortalNav, PortalSectionHead, PortalStyles } from "@/app/pages/portal/PortalShell";

const products = [
  {
    key: 'qlave',
    name: 'Qlave',
    tagline: 'Web Calls & Collaboration',
    description: 'Audio, video, and real-time collaboration — browser native, no installs. Built for teams who want calls that disappear into the workflow instead of interrupting it.',
    bullets: ['WebRTC audio & video', 'Live collaboration tools', 'One link, any device', 'Integrated into QVTT'],
    href: 'https://qlave.dev',
    cta: 'Open Qlave',
    gradient: 'linear-gradient(112deg, #09090b 0%, #0e0818 22%, #2d0a5e 50%, #c2410c 82%, #ea580c 100%)',
    accentBevel: '#4c1d95',
    glowColor: 'rgba(124, 58, 237, 0.2)',
    tendrilColor: 'rgba(167, 139, 250, 0.12)',
    status: 'live',
  },
  {
    key: 'qvtt',
    name: 'QVTT',
    tagline: 'Virtual Tabletop',
    description: 'Play Magic: The Gathering Commander online with your pod. Real-time board sync, life tracking, and in-game calls — share one link and play.',
    bullets: ['MTG Commander online', 'Real-time multiplayer sync', 'In-game calls via Qlave', 'No installs for players'],
    href: '/qvtt',
    cta: 'Enter the Sanctum',
    // green → deep purple
    gradient: 'linear-gradient(112deg, #09090b 0%, #0a1a0e 22%, #14532d 48%, #3b0764 75%, #5b21b6 100%)',
    accentBevel: '#15803d',
    glowColor: 'rgba(34, 197, 94, 0.15)',
    tendrilColor: 'rgba(134, 239, 172, 0.1)',
    status: 'live',
  },
  {
    key: 'flareup',
    name: 'Flareup',
    tagline: 'Infrastructure Cost Monitor',
    description: "Visibility into your infrastructure spend without digging through dashboards. Know what you're burning before your bill surprises you.",
    bullets: ['Real-time spend alerts', 'Usage breakdowns', 'Cost trend tracking', 'At-a-glance dashboard'],
    href: 'https://flareup.dev',
    cta: 'Check the Burn',
    gradient: 'linear-gradient(112deg, #09090b 0%, #0f1114 22%, #1c2128 48%, #9a3412 75%, #dc2626 100%)',
    accentBevel: '#374151',
    glowColor: 'rgba(220, 38, 38, 0.15)',
    tendrilColor: 'rgba(252, 165, 165, 0.08)',
    status: 'live',
  },
  {
    key: 'staticflare',
    name: 'Staticflare',
    tagline: 'Static Hosting',
    description: 'Deploy static sites to the edge in one command. Any TypeScript app with a build step can ship — infrastructure wiring handled for you.',
    bullets: ['Edge-native deployment', 'Any TS/SSG framework', 'One command to ship', 'Your infrastructure'],
    href: 'https://staticflare.dev',
    cta: 'Coming Soon',
    gradient: 'linear-gradient(112deg, #09090b 0%, #0e0e10 50%, #1c1a16 100%)',
    accentBevel: '#27272a',
    glowColor: 'rgba(0,0,0,0)',
    tendrilColor: 'rgba(255,255,255,0.03)',
    status: 'soon',
  },
];

export default function LandingPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;

  return (
    <div style={{ minHeight: '100vh', background: PORTAL_BG, color: '#e4e4e7', fontFamily: "'Syne', sans-serif" }}>
      <PortalStyles />
      <style>{`
        /* ── Product card ── */
        .product-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 400px;
          text-decoration: none;
          color: inherit;
          overflow: hidden;
          position: relative;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 2px 0 rgba(0,0,0,0.6);
          transition: filter 0.3s, box-shadow 0.3s;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .product-card:not(.soon):hover {
          filter: brightness(1.12);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 4px 24px rgba(0,0,0,0.5);
        }
        .product-card.soon {
          filter: saturate(0.2) brightness(0.5);
          pointer-events: none;
        }

        /* ── Tendril wind layer ── */
        /* Multiple pseudo-horizontal streaks that drift on hover */
        .card-tendrils {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .product-card:not(.soon):hover .card-tendrils {
          opacity: 1;
        }

        /* Each tendril is a thin horizontal smear */
        .tendril {
          position: absolute;
          left: -60%;
          height: 1px;
          border-radius: 100px;
          transform-origin: left center;
          animation: none;
        }
        .product-card:not(.soon):hover .tendril {
          animation: tendrilDrift var(--dur, 2.4s) var(--delay, 0s) ease-in-out infinite alternate;
        }

        @keyframes tendrilDrift {
          0% {
            transform: translateX(0) scaleX(0.6) skewX(-8deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            transform: translateX(var(--travel, 55%)) scaleX(1) skewX(-4deg);
            opacity: 0.7;
          }
          100% {
            transform: translateX(var(--travel, 80%)) scaleX(1.3) skewX(-2deg);
            opacity: 0;
          }
        }

        /* Tattered flag rip layer — wider wavering bands */
        .card-flags {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .product-card:not(.soon):hover .card-flags {
          opacity: 1;
        }

        .flag-strip {
          position: absolute;
          left: 0;
          width: 100%;
          border-radius: 0;
          transform-origin: left center;
          animation: none;
        }
        .product-card:not(.soon):hover .flag-strip {
          animation: flagWave var(--fdur, 3s) var(--fdelay, 0s) ease-in-out infinite alternate;
        }

        @keyframes flagWave {
          0% {
            clip-path: polygon(0 0, 100% 8%, 100% 92%, 0 100%);
            transform: translateX(-2%) skewX(-1deg);
          }
          25% {
            clip-path: polygon(0 4%, 100% 0, 100% 100%, 0 96%);
          }
          50% {
            clip-path: polygon(0 0, 100% 5%, 100% 95%, 0 100%);
            transform: translateX(1%) skewX(1deg);
          }
          75% {
            clip-path: polygon(0 6%, 100% 2%, 100% 98%, 0 94%);
          }
          100% {
            clip-path: polygon(0 2%, 100% 0, 100% 100%, 0 98%);
            transform: translateX(-1%) skewX(-0.5deg);
          }
        }

        .card-bevel {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          opacity: 0.6;
          z-index: 2;
        }

        .card-noise {
          position: absolute;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .card-left {
          padding: clamp(2.5rem, 5vw, 4rem) clamp(2rem, 5vw, 3.5rem);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.25rem;
          position: relative;
          z-index: 3;
        }
        .card-right {
          padding: clamp(2.5rem, 5vw, 4rem) clamp(2rem, 5vw, 3.5rem);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.25rem;
          position: relative;
          z-index: 3;
        }

        .card-name {
          font-size: clamp(3.5rem, 9vw, 6.5rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 0.9;
          color: #ffffff;
          text-shadow: 0 2px 20px rgba(0,0,0,0.6);
        }
        .card-tagline {
          font-family: 'Geist Mono', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }
        .card-status {
          font-family: 'Geist Mono', monospace;
          font-size: 0.56rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 0.18rem 0.55rem;
          border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3);
          width: fit-content;
          background: rgba(0,0,0,0.2);
        }

        .card-cta {
          font-family: 'Geist Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.7rem 1.4rem;
          border-radius: 4px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-bottom: 2px solid rgba(0,0,0,0.4);
          color: rgba(255,255,255,0.75);
          width: fit-content;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.12s ease;
        }
        .product-card:not(.soon):hover .card-cta {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,255,255,0.18);
          border-bottom-color: rgba(0,0,0,0.5);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 3px 8px rgba(0,0,0,0.4);
          transform: translateY(-1px);
        }
        .product-card:not(.soon):active .card-cta {
          transform: translateY(1px);
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.4),
            0 1px 2px rgba(0,0,0,0.3);
          border-bottom-width: 1px;
        }

        .card-desc {
          font-size: clamp(0.88rem, 1.4vw, 0.96rem);
          font-weight: 400;
          line-height: 1.78;
          color: rgba(255,255,255,0.5);
          max-width: 440px;
        }
        .card-bullets {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .card-bullets li {
          font-family: 'Geist Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.03em;
          color: rgba(255,255,255,0.32);
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .card-bullets li::before {
          content: '›';
          font-size: 0.9rem;
          opacity: 0.35;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .product-card { grid-template-columns: 1fr; min-height: unset; }
          .card-right { padding-top: 0; }
        }
      `}</style>

      <PortalNav isLoggedIn={isLoggedIn} current="home" />

      {/* ── Hero ── */}
      <section style={{
        padding: 'clamp(4.5rem, 11vw, 9rem) clamp(1.5rem, 4vw, 3rem) clamp(3rem, 7vw, 5.5rem)',
        borderBottom: '1px solid #0f0f12',
      }}>
        <p className="eyebrow" style={{ marginBottom: '2rem' }}>Solutions Architect · Web Apps &amp; Web Solutions</p>
        <h1 className="hero-title" style={{ marginBottom: '1.75rem' }}>
          Software that<br />makes things<br /><em>work.</em>
        </h1>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 'clamp(0.9rem, 1.6vw, 1rem)',
          fontWeight: 400,
          color: '#3f3f46',
          lineHeight: 1.8,
          maxWidth: '440px',
        }}>
          A suite of web tools built to solve real problems — calls, games, deployments, visibility. Each one ships, each one runs.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2.25rem' }}>
          <a href="#products" className="section-link">Products</a>
          <a href="#games" className="section-link">Game Center</a>
          <a href="#apps" className="section-link">App Center</a>
          <a href={RUSTY_BUNS_URL} className="section-link" target="_blank" rel="noreferrer">RustyBuns ↗</a>
        </div>
      </section>

      {/* ── Section 1: Products (the original portal) ── */}
      <section id="products" style={{ position: 'relative' }}>
        {products.map((p, i) => {
          // Generate tendril configs per card
          const tendrils = [
            { top: '18%',  width: '45%', opacity: 0.9, dur: '2.2s', delay: '0s',    travel: '70%' },
            { top: '31%',  width: '32%', opacity: 0.6, dur: '3.1s', delay: '0.3s',  travel: '85%' },
            { top: '44%',  width: '58%', opacity: 1.0, dur: '2.6s', delay: '0.1s',  travel: '60%' },
            { top: '57%',  width: '28%', opacity: 0.5, dur: '3.4s', delay: '0.5s',  travel: '90%' },
            { top: '70%',  width: '40%', opacity: 0.7, dur: '2.9s', delay: '0.2s',  travel: '75%' },
            { top: '23%',  width: '18%', opacity: 0.4, dur: '4.1s', delay: '0.7s',  travel: '95%' },
            { top: '63%',  width: '22%', opacity: 0.3, dur: '3.7s', delay: '0.9s',  travel: '80%' },
            { top: '38%',  width: '12%', opacity: 0.5, dur: '4.5s', delay: '1.1s',  travel: '100%'},
          ];

          const flags = [
            { top: '12%',  height: '6px',  opacity: 0.06, fdur: '3.2s', fdelay: '0s'   },
            { top: '35%',  height: '4px',  opacity: 0.04, fdur: '4.1s', fdelay: '0.4s' },
            { top: '58%',  height: '8px',  opacity: 0.05, fdur: '2.8s', fdelay: '0.2s' },
            { top: '78%',  height: '5px',  opacity: 0.04, fdur: '3.6s', fdelay: '0.6s' },
          ];

          return (
            <div key={p.key}>
              <a
                href={p.status !== 'soon' ? p.href : undefined}
                target={p.status !== 'soon' && p.href.startsWith('http') ? '_blank' : undefined}
                rel={p.status !== 'soon' && p.href.startsWith('http') ? 'noreferrer' : undefined}
                className={`product-card${p.status === 'soon' ? ' soon' : ''}`}
                style={{ background: p.gradient }}
              >
                {/* Bevel */}
                <div className="card-bevel" style={{ background: p.accentBevel }} />

                {/* Noise */}
                <div className="card-noise" />

                {/* Glow blob */}
                <div style={{
                  position: 'absolute',
                  right: 0, top: 0, bottom: 0,
                  width: '50%',
                  background: `radial-gradient(ellipse at 80% 50%, ${p.glowColor} 0%, transparent 70%)`,
                  pointerEvents: 'none',
                  zIndex: 0,
                }} />

                {/* ── Tendril wind layer ── */}
                <div className="card-tendrils">
                  {tendrils.map((t, ti) => (
                    <div
                      key={ti}
                      className="tendril"
                      style={{
                        top: t.top,
                        width: t.width,
                        background: `linear-gradient(90deg, transparent 0%, ${p.tendrilColor.replace('0.', `${t.opacity * 0.8 * 0}.`)} 20%, ${p.tendrilColor} 60%, transparent 100%)`,
                        ['--dur' as any]: t.dur,
                        ['--delay' as any]: t.delay,
                        ['--travel' as any]: t.travel,
                      }}
                    />
                  ))}
                </div>

                {/* ── Tattered flag strips ── */}
                <div className="card-flags">
                  {flags.map((f, fi) => (
                    <div
                      key={fi}
                      className="flag-strip"
                      style={{
                        top: f.top,
                        height: f.height,
                        background: `linear-gradient(90deg, transparent 0%, ${p.tendrilColor} 30%, ${p.glowColor} 70%, transparent 100%)`,
                        opacity: f.opacity,
                        ['--fdur' as any]: f.fdur,
                        ['--fdelay' as any]: f.fdelay,
                      }}
                    />
                  ))}
                </div>

                {/* Left — name, meta, CTA */}
                <div className="card-left">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="card-tagline">{p.tagline}</span>
                    <span className="card-status">
                      {p.status === 'live' ? '● live' : p.status === 'beta' ? '◐ beta' : '○ soon'}
                    </span>
                  </div>
                  <h2 className="card-name">{p.name}</h2>
                  <span className="card-cta">{p.cta}{p.status !== 'soon' ? ' →' : ''}</span>
                </div>

                {/* Right — description + bullets */}
                <div className="card-right">
                  <p className="card-desc">{p.description}</p>
                  <ul className="card-bullets">
                    {p.bullets.map(b => <li key={b}>{b}</li>)}
                  </ul>
                </div>
              </a>
              {i < products.length - 1 && <div className="sep" />}
            </div>
          );
        })}
      </section>

      {/* ── Section 2: Game Center ── */}
      <section id="games" style={{ borderTop: '1px solid #0f0f12' }}>
        <PortalSectionHead
          eyebrow="Game Center"
          title={<>Pick a table.<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#27272a' }}>Play.</em></>}
          lede="Commander tables, drafts, a sandbox that never closes, and a strategy map. One Q auth account, every game."
          linkHref="/games"
          linkLabel="Open Game Center"
        />
        <PortalGrid entries={games.slice(0, 4)} request={request} />
      </section>

      {/* ── Section 3: App Center ── */}
      <section id="apps" style={{ borderTop: '1px solid #0f0f12' }}>
        <PortalSectionHead
          eyebrow="App Center"
          title={<>Tools that<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#27272a' }}>ship.</em></>}
          lede="Calls, cost monitoring, hosting, fulfillment, and RustyBuns, the open-source runtime that ships a web app as a native binary."
          linkHref="/apps"
          linkLabel="Open App Center"
        />
        <PortalGrid entries={apps.slice(0, 4)} request={request} />
      </section>

      {/* ── About ── */}
      <section style={{
        padding: 'clamp(3rem, 8vw, 5.5rem) clamp(1.5rem, 4vw, 3rem)',
        borderTop: '1px solid #0f0f12',
      }}>
        <p className="eyebrow" style={{ marginBottom: '1.5rem' }}>About</p>
        <p className="about-body">
          QNTBR is a <span>solutions architecture studio</span> focused on web apps and web solutions.
          We build tools we actually use — each product in the suite is tested against the others in production.
          The goal is software that works, ships fast, and stays out of your way.
        </p>
      </section>

      <PortalFooter />
    </div>
  );
}