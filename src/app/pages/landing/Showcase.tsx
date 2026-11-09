// @/app/pages/landing/Showcase.tsx
// The landing page's top half, borrowed from the two Rusty Buns front doors:
//  - Hero: eqosys's day-and-night sky behind a big centred headline (white over the sky, the second line in the
//    accent, the Playground's orange drop under the type), a lede, two buttons and a one-line row of facts.
//  - Feature: eqosys's "the big one" panel (screenshot beside its words, Home in apps/eqosys/src/app/pages.tsx).
//  - Spotlight: the next few, as smaller feature panels three across.
//  - Shelf: eqosys's shelves, a group's entries as screenshot tiles, as many across as the width holds, each
//    with the Playground's four-pip stage meter.
// Server components; the whole panel is the link (the title's ::after covers it), as on eqosys.
import type { CSSProperties, ReactNode } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { DEVICES, STAGES, groupEntries, isExternal, type PortalEntry, type PortalGroup } from '@/app/pages/portal/portalData';
import { toneOf } from '@/app/pages/portal/tones';
import { KeyArt } from './KeyArt';
import { Sky } from './Sky';

interface HeroProps {
  t0: number;
  eyebrow: string;
  line1: string;
  line2: string;
  lede: ReactNode;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  facts: string[];
}

export function Hero({ t0, eyebrow, line1, line2, lede, primary, secondary, facts }: HeroProps) {
  return (
    <section className="q-hero q-sky-host" aria-labelledby="q-hero-title">
      <Sky t0={t0} />
      <div className="q-hero-in">
        <span className="q-hero-eyebrow">{eyebrow}</span>
        <h1 id="q-hero-title" className="q-hero-title">
          <span>{line1}</span>
          <span className="q-hero-accent">{line2}</span>
        </h1>
        <p className="q-hero-lede">{lede}</p>
        <div className="q-hero-cta">
          <a className="q-btn q-hero-go" href={primary.href}>{primary.label}<ArrowDown aria-hidden="true" /></a>
          <a className="q-btn q-hero-alt" href={secondary.href}>{secondary.label}<ArrowRight aria-hidden="true" /></a>
        </div>
        <ul className="q-hero-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>
    </section>
  );
}

/** Stage pips and best-on chips, as on the Playground cards. */
function Facts({ entry: e, n = 0 }: { entry: PortalEntry; n?: number }) {
  if (!e.stage && !e.best?.length) return null;
  return (
    <span className="q-feature-facts">
      {e.stage && (
        <span className="q-stage" title={`${STAGES[e.stage]}: stage ${e.stage} of 4`}>
          <span className="q-pips" aria-hidden="true">{[1, 2, 3, 4].map((k) => <b key={k} className={k <= e.stage! ? 'q-on' : undefined} />)}</span>
          {STAGES[e.stage]}
        </span>
      )}
      {!!e.best?.length && (
        <span className="q-best">
          {e.best.map((d, k) => {
            const D = DEVICES[d];
            return <span key={d} role="img" title={D.label} aria-label={D.label} style={{ '--k': n * 3 + k } as CSSProperties}><D.icon strokeWidth={2} /></span>;
          })}
        </span>
      )}
    </span>
  );
}

/** The capture of the running app, or its drawn key art, or its icon on its tone. */
function Shot({ entry: e, eager, prefer = 'image' }: { entry: PortalEntry; eager?: boolean; prefer?: 'image' | 'shot' }) {
  const src = prefer === 'image' ? e.image ?? e.shot : e.shot ?? e.image;
  if (src) return <span className="q-shot"><img src={src} alt="" loading={eager ? undefined : 'lazy'} decoding="async" draggable={false} /></span>;
  const Icon = e.icon;
  return (
    <span className="q-shot q-shot-art" style={{ background: toneOf(e.key, e.group) }}>
      {prefer === 'image' ? <KeyArt entryKey={e.key} glyph={e.glyph} /> : <Icon className="q-shot-icon" strokeWidth={1.5} aria-hidden="true" />}
    </span>
  );
}

const Go = ({ entry: e }: { entry: PortalEntry }) => (
  <span className="q-feature-go">{e.cta}{isExternal(e.href) ? <ArrowUpRight aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</span>
);

/** eqosys's featured panel: the screenshot big on the left, kicker, name, tagline, pitch, facts and the button. */
export function Feature({ entry: e, big, n = 0 }: { entry: PortalEntry; big?: boolean; n?: number }) {
  const external = isExternal(e.href);
  const Name = big ? 'h2' : 'h3';
  const lines = e.pitch ? (big ? e.pitch : [e.pitch[0]]) : [e.description];
  return (
    <article className={big ? 'q-feature q-big' : 'q-feature'}>
      <Shot entry={e} eager={big} />
      <div className="q-feature-cap">
        {e.tag && <span className="q-feature-kick">{e.tag}</span>}
        <Name className="q-feature-name">
          <a className="q-feature-link" href={e.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{e.name}</a>
        </Name>
        <p className="q-feature-tagline">{e.tagline}</p>
        <div className="q-feature-pitch">{lines.map((l) => <p key={l}>{l}</p>)}</div>
        <div className="q-feature-foot">
          <Facts entry={e} n={n} />
          <Go entry={e} />
        </div>
      </div>
    </article>
  );
}

/** One entry on a shelf: its screenshot, name, stage, tagline. The tile opens it. */
function ShelfTile({ entry: e }: { entry: PortalEntry }) {
  const external = isExternal(e.href);
  const soon = e.status === 'soon';
  return (
    <article className={soon ? 'q-shelf-tile q-off' : 'q-shelf-tile'}>
      <Shot entry={e} prefer="shot" />
      <div className="q-shelf-cap">
        <div className="q-shelf-name">
          <h4><a className="q-feature-link" href={e.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{e.name}</a></h4>
          {e.stage
            ? <span className="q-pips" title={`${STAGES[e.stage]}: stage ${e.stage} of 4`}>{[1, 2, 3, 4].map((k) => <b key={k} className={k <= e.stage! ? 'q-on' : undefined} />)}</span>
            : soon && <span className="q-label">{e.cta}</span>}
        </div>
        <small>{e.tagline}</small>
      </div>
    </article>
  );
}

/** eqosys's shelves: a small uppercase heading with its count, then the tiles. */
export function Shelves({ entries, groups }: { entries: PortalEntry[]; groups: PortalGroup[] }) {
  return (
    <div className="q-shelves">
      {groupEntries(entries, groups).map(({ group, entries }) => (
        <section key={group.key} className="q-shelf" aria-label={group.title}>
          <h3 className="q-shelf-head">{group.title}<em>{entries.length}</em></h3>
          <div className="q-shelf-grid">{entries.map((e) => <ShelfTile key={e.key} entry={e} />)}</div>
        </section>
      ))}
    </div>
  );
}
