// @/app/pages/portal/PortalShell.tsx
// Shared chrome for the QNTBR portal, built on @qntbr/ui: page surface, top bar,
// footer, and the group cards of tiles used by the Game Center / App Center sections and hubs.
// Server components only (the theme toggle is a client component inside the package).

import type { ReactNode } from 'react';
import { Footer, Page, SectionHead, ThemeScript, ThemeToggle, TopBar, Tile, TileGroup, Wrap, type NavItem } from '@qntbr/ui';
import { GITHUB_ORG_URL, RUSTY_BUNS_URL, isExternal, groupEntries, resolveHref, type PortalEntry, type PortalGroup } from './portalData';
import { toneOf } from './tones';

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

interface GroupsProps {
  entries: PortalEntry[];
  groups: PortalGroup[];
  request: Request;
  /** Preview and name only, smaller tiles. */
  compact?: boolean;
  /** One wide bar per entry, groups stacked full width: the landing page shelves. */
  bars?: boolean;
}

/** One group card per group, each holding the tiles of its entries. */
export function PortalGroups({ entries, groups, request, compact, bars }: GroupsProps) {
  return (
    <div className={compact ? 'q-groups q-dense' : 'q-groups'}>
      {groupEntries(entries, groups).map(({ group, entries }) => (
        <TileGroup
          key={group.key}
          as={compact ? 'h3' : 'h2'}
          title={group.title}
          meta={`${entries.length} ${group.noun}${entries.length === 1 ? '' : 's'}`}
          lede={compact ? undefined : group.lede}
          dense={compact}
          bars={bars}
        >
          {entries.map((e) => <PortalTile key={e.key} entry={e} request={request} compact={compact} wide={bars} />)}
        </TileGroup>
      ))}
    </div>
  );
}

export function PortalTile({ entry: e, request, compact, wide }: { entry: PortalEntry; request: Request; compact?: boolean; wide?: boolean }) {
  const href = resolveHref(e, request);
  const Icon = e.icon;
  // Auth-gated routes already redirect logged-out visitors to /user/login
  // via middleware, so link straight through; the "Q auth" badge sets expectations.
  return (
    <Tile
      name={e.name}
      nameAs={compact ? 'h4' : 'h3'}
      tag={e.tag}
      tagline={e.tagline}
      description={e.description}
      icon={<Icon strokeWidth={1.5} />}
      image={e.image}
      tone={toneOf(e.key, e.group)}
      status={e.status}
      badges={e.requiresAuth ? ['Q auth'] : undefined}
      href={href}
      cta={e.cta}
      external={isExternal(href)}
      compact={compact}
      wide={wide}
    />
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
