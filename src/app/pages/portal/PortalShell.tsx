// @/app/pages/portal/PortalShell.tsx
// Shared chrome for the QNTBR portal, built on @qntbr/ui: page surface, top bar,
// footer, and the tile grid used by the Game Center / App Center sections and hubs.
// Server components only (the theme toggle and craft canvas are client components inside the package).

import type { ReactNode } from 'react';
import { Footer, Page, SectionHead, ThemeScript, ThemeToggle, TopBar, Tile, Wrap, type NavItem } from '@qntbr/ui';
import { GITHUB_ORG_URL, RUSTY_BUNS_URL, isExternal, resolveHref, type PortalEntry } from './portalData';

interface PageProps {
  isLoggedIn: boolean;
  /** Which top-level portal section this page is, for the active state. */
  current?: 'home' | 'games' | 'apps';
  children: ReactNode;
}

export function PortalPage({ isLoggedIn, current = 'home', children }: PageProps) {
  const links: NavItem[] = [
    { href: '/games', label: 'Games', active: current === 'games' },
    { href: '/apps', label: 'Apps', active: current === 'apps' },
    { href: '/blog', label: 'Blog' },
    { href: RUSTY_BUNS_URL, label: 'GitHub', external: true },
  ];

  const footerLinks: NavItem[] = [
    { href: '/games', label: 'Games' },
    { href: '/apps', label: 'Apps' },
    { href: '/blog', label: 'Blog' },
    { href: RUSTY_BUNS_URL, label: 'RustyBuns', external: true },
    { href: GITHUB_ORG_URL, label: 'GitHub', external: true },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ];

  return (
    <Page>
      <ThemeScript />
      <TopBar
        links={links}
        actions={
          <>
            <ThemeToggle />
            {isLoggedIn
              ? <a href="/sanctum" className="q-btn q-primary">Sanctum →</a>
              : <a href="/user/login" className="q-btn q-primary">Sign in</a>}
          </>
        }
      />
      {children}
      <Footer copyright={`© ${new Date().getFullYear()} QNTBR LLC`} links={footerLinks} />
    </Page>
  );
}

interface GridProps {
  entries: PortalEntry[];
  request: Request;
}

export function PortalGrid({ entries, request }: GridProps) {
  return (
    <div className="q-grid">
      {entries.map((e) => {
        const href = resolveHref(e, request);
        // Auth-gated routes already redirect logged-out visitors to /user/login
        // via middleware, so link straight through; the "Q auth" badge sets expectations.
        return (
          <Tile
            key={e.key}
            name={e.name}
            tag={e.tag}
            tagline={e.tagline}
            description={e.description}
            accent={e.accent}
            status={e.status}
            badges={e.requiresAuth ? ['Q auth'] : undefined}
            href={href}
            cta={e.cta}
            external={isExternal(href)}
          />
        );
      })}
    </div>
  );
}

/** Section head inside the page column, so it lines up with the grid below it. */
export function PortalSection({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

export { SectionHead as PortalSectionHead, Wrap as PortalWrap };
