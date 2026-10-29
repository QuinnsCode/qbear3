// @/app/pages/portal/PortalShell.tsx
// Shared chrome for the QNTBR portal: nav, footer, base styles, and the
// card grid used by the Game Center / App Center sections and hub pages.
// Server components only (no "use client") — everything here is static markup.

import { GITHUB_ORG_URL, RUSTY_BUNS_URL, isExternal, resolveHref, type PortalEntry } from './portalData';

export const PORTAL_BG = '#09090b';

export function PortalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      .mono { font-family: 'Geist Mono', monospace; }

      .eyebrow {
        font-family: 'Geist Mono', monospace;
        font-size: 0.62rem;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: #3f3f46;
      }

      .nav-link {
        font-family: 'Geist Mono', monospace;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        color: #52525b;
        text-decoration: none;
        transition: color 0.15s;
        white-space: nowrap;
      }
      .nav-link:hover { color: #a1a1aa; }
      .nav-link.active { color: #fafafa; }

      .nav-cta {
        font-family: 'Geist Mono', monospace;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        padding: 0.4rem 1rem;
        border-radius: 4px;
        background: #fafafa;
        color: #09090b;
        text-decoration: none;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        white-space: nowrap;
      }

      .hero-title {
        font-size: clamp(2.8rem, 7vw, 5.5rem);
        font-weight: 800;
        letter-spacing: -0.035em;
        line-height: 1.0;
        color: #fafafa;
      }
      .hero-title em {
        font-style: italic;
        font-weight: 400;
        color: #27272a;
      }

      .section-title {
        font-size: clamp(2rem, 4.5vw, 3.2rem);
        font-weight: 800;
        letter-spacing: -0.035em;
        line-height: 1.0;
        color: #fafafa;
      }
      .section-lede {
        font-family: 'Syne', sans-serif;
        font-size: clamp(0.9rem, 1.6vw, 1rem);
        color: #3f3f46;
        line-height: 1.8;
        max-width: 480px;
      }

      .section-link {
        font-family: 'Geist Mono', monospace;
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #a1a1aa;
        text-decoration: none;
        padding: 0.6rem 1.1rem;
        border: 1px solid rgba(255,255,255,0.1);
        border-bottom: 2px solid rgba(0,0,0,0.5);
        border-radius: 4px;
        background: rgba(255,255,255,0.04);
        transition: all 0.12s ease;
        white-space: nowrap;
      }
      .section-link:hover { color: #fafafa; background: rgba(255,255,255,0.08); transform: translateY(-1px); }

      /* ── Portal grid ── */
      .portal-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1px;
        background: #0f0f12;
        border-top: 1px solid #0f0f12;
        border-bottom: 1px solid #0f0f12;
      }
      .portal-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: clamp(1.5rem, 3vw, 2.2rem);
        min-height: 260px;
        background: #09090b;
        text-decoration: none;
        color: inherit;
        overflow: hidden;
        transition: background 0.2s, box-shadow 0.2s;
      }
      .portal-card:not(.soon):hover {
        background: #0e0e11;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
      }
      .portal-card.soon { filter: saturate(0.2) brightness(0.55); pointer-events: none; }
      .portal-card .glow {
        position: absolute;
        right: -20%; top: -20%;
        width: 60%; height: 60%;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
      }
      .portal-card:not(.soon):hover .glow { opacity: 1; }
      .portal-card .bevel {
        position: absolute; left: 0; top: 0; bottom: 0; width: 3px; opacity: 0.7;
      }
      .portal-tag {
        font-family: 'Geist Mono', monospace;
        font-size: 0.58rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
      }
      .portal-name {
        font-size: clamp(1.5rem, 2.6vw, 2rem);
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1;
        color: #fafafa;
      }
      .portal-tagline {
        font-family: 'Geist Mono', monospace;
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        color: rgba(255,255,255,0.5);
      }
      .portal-desc {
        font-size: 0.88rem;
        line-height: 1.7;
        color: rgba(255,255,255,0.45);
        flex: 1;
      }
      .portal-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
      .portal-status, .portal-auth {
        font-family: 'Geist Mono', monospace;
        font-size: 0.56rem;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding: 0.18rem 0.55rem;
        border-radius: 3px;
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.35);
        background: rgba(0,0,0,0.2);
      }
      .portal-auth { color: rgba(250,250,250,0.55); border-color: rgba(250,250,250,0.18); }
      .portal-cta {
        font-family: 'Geist Mono', monospace;
        font-size: 0.68rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.7);
        margin-top: auto;
      }
      .portal-card:not(.soon):hover .portal-cta { color: #fafafa; }

      .sep {
        height: 2px;
        background: linear-gradient(90deg, #09090b 0%, rgba(255,255,255,0.03) 50%, #09090b 100%);
      }

      .about-body {
        font-size: clamp(0.95rem, 1.6vw, 1.05rem);
        font-weight: 400;
        color: #3f3f46;
        line-height: 1.9;
        max-width: 600px;
      }
      .about-body span { color: #71717a; }

      .footer-link {
        font-family: 'Geist Mono', monospace;
        font-size: 0.68rem;
        letter-spacing: 0.1em;
        color: #52525b;
        text-decoration: none;
        transition: color 0.15s;
      }
      .footer-link:hover { color: #a1a1aa; }

      @media (max-width: 768px) {
        .portal-nav-links { gap: 0.9rem !important; overflow-x: auto; }
        .section-head { flex-direction: column; align-items: flex-start !important; }
      }
    `}</style>
  );
}

interface NavProps {
  isLoggedIn: boolean;
  /** Which top-level portal section this page is, for the active state. */
  current?: 'home' | 'games' | 'apps';
}

export function PortalNav({ isLoggedIn, current = 'home' }: NavProps) {
  const link = (href: string, label: string, key?: NavProps['current'], external = false) => (
    <a
      href={href}
      className={`nav-link${key && key === current ? ' active' : ''}`}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >{label}</a>
  );

  return (
    <header style={{
      padding: '1.2rem clamp(1.5rem, 4vw, 3rem)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      borderBottom: '1px solid #0f0f12',
      position: 'sticky',
      top: 0,
      background: 'rgba(9,9,11,0.93)',
      backdropFilter: 'blur(16px)',
      zIndex: 50,
    }}>
      <a href="/" style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '0.88rem',
        letterSpacing: '0.22em',
        color: '#fafafa',
        textDecoration: 'none',
        fontWeight: 500,
      }}>QNTBR</a>

      <nav className="portal-nav-links" style={{ display: 'flex', gap: 'clamp(1rem, 3vw, 2rem)', alignItems: 'center' }}>
        {link('/games', 'Games', 'games')}
        {link('/apps', 'Apps', 'apps')}
        {link('/blog', 'Blog')}
        {link(RUSTY_BUNS_URL, 'GitHub', undefined, true)}
        {isLoggedIn
          ? <a href="/sanctum" className="nav-cta">Sanctum →</a>
          : <a href="/user/login" className="nav-cta">Sign in</a>}
      </nav>
    </header>
  );
}

export function PortalFooter() {
  return (
    <footer style={{
      padding: '1.5rem clamp(1.5rem, 4vw, 3rem)',
      borderTop: '1px solid #0f0f12',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <span style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '0.62rem',
        color: '#3f3f46',
        letterSpacing: '0.15em',
      }}>
        © {new Date().getFullYear()} QNTBR LLC
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        <a href="/games" className="footer-link">Games</a>
        <a href="/apps" className="footer-link">Apps</a>
        <a href="/blog" className="footer-link">Blog</a>
        <a href={RUSTY_BUNS_URL} className="footer-link" target="_blank" rel="noreferrer">RustyBuns</a>
        <a href={GITHUB_ORG_URL} className="footer-link" target="_blank" rel="noreferrer">GitHub</a>
        <a href="/privacy" className="footer-link">Privacy</a>
        <a href="/terms" className="footer-link">Terms</a>
      </div>
    </footer>
  );
}

function statusLabel(status: PortalEntry['status']) {
  return status === 'live' ? '● live' : status === 'beta' ? '◐ beta' : '○ soon';
}

interface GridProps {
  entries: PortalEntry[];
  request: Request;
}

export function PortalGrid({ entries, request }: GridProps) {
  return (
    <div className="portal-grid">
      {entries.map((e) => {
        const href = resolveHref(e, request);
        const external = isExternal(href);
        const soon = e.status === 'soon';
        // Auth-gated routes already redirect logged-out visitors to /user/login
        // via middleware, so link straight through; the "Q auth" badge sets expectations.
        const target = href;
        return (
          <a
            key={e.key}
            href={soon ? undefined : target}
            target={!soon && external ? '_blank' : undefined}
            rel={!soon && external ? 'noreferrer' : undefined}
            className={`portal-card${soon ? ' soon' : ''}`}
          >
            <div className="bevel" style={{ background: e.accent }} />
            <div className="glow" style={{ background: `radial-gradient(circle, ${e.accent}33 0%, transparent 70%)` }} />
            <div className="portal-meta">
              {e.tag && <span className="portal-tag">{e.tag}</span>}
              <span className="portal-status">{statusLabel(e.status)}</span>
              {e.requiresAuth && <span className="portal-auth">Q auth</span>}
            </div>
            <h3 className="portal-name">{e.name}</h3>
            <span className="portal-tagline">{e.tagline}</span>
            <p className="portal-desc">{e.description}</p>
            <span className="portal-cta">{e.cta}{soon ? '' : external ? ' ↗' : ' →'}</span>
          </a>
        );
      })}
    </div>
  );
}

interface SectionHeadProps {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  linkHref?: string;
  linkLabel?: string;
}

export function PortalSectionHead({ eyebrow, title, lede, linkHref, linkLabel }: SectionHeadProps) {
  return (
    <div className="section-head" style={{
      padding: 'clamp(3rem, 7vw, 5rem) clamp(1.5rem, 4vw, 3rem) clamp(2rem, 4vw, 3rem)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '1.5rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-title">{title}</h2>
        <p className="section-lede">{lede}</p>
      </div>
      {linkHref && linkLabel && (
        <a href={linkHref} className="section-link">{linkLabel} →</a>
      )}
    </div>
  );
}
