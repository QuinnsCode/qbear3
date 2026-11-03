// @/app/pages/portal/PortalShell.tsx
// Shared chrome for the QNTBR portal, built on @qntbr/ui: page surface, top bar,
// footer, and the group cards of tiles used by the Game Center / App Center sections and hubs.
// Server components only (the theme toggle is a client component inside the package).

import type { ReactNode } from 'react';
import { ArrowUpRight, Code, Download, Play } from 'lucide-react';
import { Footer, Page, PlayCard, SectionHead, ThemeScript, ThemeToggle, TopBar, Tile, TileGroup, Wrap, type NavItem, type PlayCardLink } from '@qntbr/ui';
import { DEVICES, GITHUB_ORG_URL, RUSTY_BUNS_URL, STAGES, downloadUrl, isExternal, platformOf, groupEntries, sourceUrl, type PortalEntry, type PortalGroup } from './portalData';
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
              ? <a href="/" className="q-btn q-primary">Games →</a>
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
  /** Preview and name only, smaller tiles. */
  compact?: boolean;
  /** One wide bar per entry, groups stacked full width: the landing page shelves. */
  bars?: boolean;
}

/** One group card per group, each holding the tiles of its entries. */
export function PortalGroups({ entries, groups, compact, bars }: GroupsProps) {
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
          {entries.map((e) => <PortalTile key={e.key} entry={e} compact={compact} wide={bars} />)}
        </TileGroup>
      ))}
    </div>
  );
}

const hint = (e: PortalEntry) => {
  const p = platformOf(e);
  if (!p) return undefined;
  const Icon = p.icon;
  return { icon: <Icon strokeWidth={1.75} />, label: p.label };
};

export function PortalTile({ entry: e, compact, wide }: { entry: PortalEntry; compact?: boolean; wide?: boolean }) {
  const href = e.href;
  const Icon = e.icon;
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
      platform={hint(e)}
      status={e.status}
      href={href}
      cta={e.cta}
      external={isExternal(href)}
      compact={compact}
      wide={wide}
    />
  );
}

/** The hubs: one heading per group over a grid of Playground cards. */
export function PortalCards({ entries, groups }: { entries: PortalEntry[]; groups: PortalGroup[] }) {
  let n = 0;
  return (
    <div className="q-groups">
      {groupEntries(entries, groups).map(({ group, entries }) => (
        <section key={group.key} className="q-group q-bars">
          <header className="q-group-head">
            <h2 className="q-group-title">{group.title}</h2>
            <span className="q-label">{`${entries.length} ${group.noun}${entries.length === 1 ? '' : 's'}`}</span>
            <p className="q-group-lede">{group.lede}</p>
          </header>
          <div className="q-cards">
            {entries.map((e) => <PortalCard key={e.key} entry={e} index={n++} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

const icon = { strokeWidth: 2.2, 'aria-hidden': true } as const;

/** One entry as a Playground card: its own link first (Play, or whatever its button says), then Download and Source. */
export function PortalCard({ entry: e, index }: { entry: PortalEntry; index: number }) {
  const Icon = e.icon;
  const soon = e.status === 'soon';
  const download = downloadUrl(e);
  const source = sourceUrl(e);
  // Play, and the corner flag, only on the Playground's apps (the ones with a stage); the rest just open.
  const playable = !!e.stage;
  const own: PlayCardLink[] = soon || e.href === download || e.href === source
    ? []
    : [{ label: e.cta, href: e.href, icon: playable ? <Play {...icon} /> : <ArrowUpRight {...icon} />, external: isExternal(e.href), primary: true }];
  const links: PlayCardLink[] = [
    ...own,
    ...(download ? [{ label: 'Download', href: download, icon: <Download {...icon} />, external: true, primary: !own.length }] : []),
    ...(source ? [{ label: 'Source', href: source, icon: <Code {...icon} />, external: true }] : []),
  ];
  return (
    <PlayCard
      index={index}
      name={e.name}
      tag={e.tag}
      tagline={e.tagline}
      description={e.description}
      shot={e.shot ?? e.image}
      icon={<Icon strokeWidth={1.75} />}
      tone={toneOf(e.key, e.group)}
      stage={e.stage && { n: e.stage, label: STAGES[e.stage] }}
      best={e.best?.map((d) => { const D = DEVICES[d]; return { icon: <D.icon strokeWidth={2} />, label: D.label }; })}
      links={links}
      note={soon ? e.cta : undefined}
      live={playable && own.length > 0}
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
