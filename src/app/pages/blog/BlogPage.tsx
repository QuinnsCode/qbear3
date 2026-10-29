// @/app/pages/blog/BlogPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { BlogServer } from "@/app/components/Blog/BlogServer";

export default function BlogPage({ ctx }: RequestInfo) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0f', fontFamily: "'Syne', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&family=Geist+Mono:wght@400;500&family=Roboto+Slab:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nav-link {
          font-family: 'Geist Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          color: #a1a1aa;
          text-decoration: none;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .nav-link:hover { color: #fafafa; }

        /* Business card masthead */
        .masthead {
          position: relative;
          overflow: hidden;
          background: #0a0a0c;
          border-bottom: 1px solid #1c1c1f;
        }

        /* Spotlight — single cone of light from top center */
        .masthead-spotlight {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 500px;
          background: radial-gradient(ellipse at 50% 0%,
            rgba(255, 245, 220, 0.06) 0%,
            rgba(255, 235, 180, 0.03) 30%,
            transparent 70%
          );
          pointer-events: none;
        }

        /* Side vignette shadows — noir curtain feel */
        .masthead-vignette {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg,
              rgba(0,0,0,0.7) 0%,
              transparent 25%,
              transparent 75%,
              rgba(0,0,0,0.7) 100%
            );
          pointer-events: none;
        }

        .masthead-inner {
          position: relative;
          padding: clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 4vw, 3rem);
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 2rem;
        }

        /* Business card left side */
        .card-left {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .card-name {
          font-family: 'Roboto Slab', Georgia, serif;
          font-size: clamp(3.5rem, 10vw, 8rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 0.9;
          color: #ffffff;
          /* Slight text shadow for depth under the spotlight */
          text-shadow:
            0 2px 40px rgba(255, 245, 200, 0.08),
            0 0 80px rgba(0,0,0,0.8);
        }

        .card-role {
          font-family: 'Geist Mono', monospace;
          font-size: clamp(0.62rem, 1.2vw, 0.75rem);
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #71717a;
          margin-top: 0.25rem;
        }

        /* Business card right — contact block */
        .card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.35rem;
          padding-bottom: 0.5rem;
        }

        .card-meta {
          font-family: 'Geist Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          color: #52525b;
          text-align: right;
        }
        .card-meta a {
          color: #71717a;
          text-decoration: none;
          transition: color 0.15s;
        }
        .card-meta a:hover { color: #d4d4d8; }

        /* Divider rule under masthead */
        .masthead-rule {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem clamp(1.5rem, 4vw, 3rem);
          border-top: 1px solid #1c1c1f;
          background: #0a0a0c;
        }
        .rule-line { flex: 1; height: 1px; background: #1c1c1f; }
        .rule-text {
          font-family: 'Geist Mono', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #3f3f46;
          white-space: nowrap;
        }

        /* Feed area — slightly lighter than header, with noise */
        .feed-area {
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 32px,
              rgba(255,255,255,0.012) 32px,
              rgba(255,255,255,0.012) 33px
            ),
            #0d0d0f;
          padding: clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3rem);
        }

        .feed-inner {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Footer */
        .footer-link {
          font-family: 'Geist Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          color: #52525b;
          text-decoration: none;
          transition: color 0.15s;
        }
        .footer-link:hover { color: #a1a1aa; }

        @media (max-width: 640px) {
          .masthead-inner { grid-template-columns: 1fr; }
          .card-right { align-items: flex-start; }
          .card-meta { text-align: left; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        padding: '1rem clamp(1.5rem, 4vw, 3rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #161618',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,12,0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 50,
      }}>
        <a href="/" style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '0.85rem',
          letterSpacing: '0.22em',
          color: '#fafafa',
          textDecoration: 'none',
          fontWeight: 500,
        }}>QNTBR</a>
        <a href="/blog" className="nav-link">Devlog</a>
      </nav>

      {/* ── Business Card Masthead ── */}
      <header className="masthead">
        <div className="masthead-spotlight" />
        <div className="masthead-vignette" />

        <div className="masthead-inner">
          {/* Left — name + role */}
          <div className="card-left">
            <div style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#3f3f46',
              marginBottom: '0.5rem',
            }}>{today}</div>
            <h1 className="card-name">The Devlog</h1>
            <p className="card-role">QNTBR · Solutions Architect · Web Apps &amp; Web Solutions</p>
          </div>

          {/* Right — business card contact block */}
          <div className="card-right">
            <div className="card-meta">
              <a href="/">qntbr.com</a>
            </div>
            <div className="card-meta">
              <a href="https://qlave.dev">qlave.dev</a>
            </div>
            <div className="card-meta">
              <a href="https://flareup.dev">flareup.dev</a>
            </div>
            <div className="card-meta">
              <a href="https://staticflare.dev">staticflare.dev</a>
            </div>
            <div className="card-meta" style={{ marginTop: '0.5rem', color: '#3f3f46' }}>
              Build in public
            </div>
          </div>
        </div>

        {/* Bottom rule with tagline */}
        <div className="masthead-rule">
          <div className="rule-line" />
          <span className="rule-text">Ship in public · Build in public</span>
          <div className="rule-line" />
        </div>
      </header>

      {/* ── Feed ── */}
      <main className="feed-area">
        <div className="feed-inner">
          <BlogServer />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        padding: '1.5rem clamp(1.5rem, 4vw, 3rem)',
        borderTop: '1px solid #161618',
        background: '#0a0a0c',
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
          © {new Date().getFullYear()} QNTBR
        </span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {([['/', 'Home'], ['/privacy', 'Privacy'], ['/terms', 'Terms']] as [string, string][]).map(([href, label]) => (
            <a key={href} href={href} className="footer-link">{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}