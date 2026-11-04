import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';

/** One thing it plays best on: a lucide icon and its label. */
export interface PlayCardDevice {
  icon: ReactNode;
  label: string;
}

/** A link on the card: Play (the primary), Download or Source. */
export interface PlayCardLink {
  label: string;
  href: string;
  icon: ReactNode;
  external?: boolean;
  primary?: boolean;
}

export interface PlayCardProps {
  name: string;
  tag?: string;
  tagline?: string;
  description?: string;
  /** A screenshot across the top. Without one, `icon` sits on `tone`. */
  shot?: string;
  icon: ReactNode;
  /** A CSS background for the art when there is no shot. */
  tone?: string;
  /** How far along it is: 1 to 4, and its name ("Alpha"). */
  stage?: { n: number; label: string };
  best?: PlayCardDevice[];
  links: PlayCardLink[];
  /** Shown in place of a Play link, e.g. "Coming soon". */
  note?: string;
  /** "Play now" on the corner. */
  live?: boolean;
  /** Greyed out: not open yet. */
  off?: boolean;
  /** Its place in the grid: staggers the pop-in, the tilt and the lava. */
  index?: number;
  nameAs?: 'h2' | 'h3' | 'h4';
}

/** The Rusty Buns Playground card: shot, name, line, a four-pip stage meter, best-on chips and its links. */
export function PlayCard({
  name, tag, tagline, description, shot, icon, tone, stage, best, links, note, live, off, index = 0, nameAs: Name = 'h3',
}: PlayCardProps) {
  const style = { '--n': index, '--tilt': `${(((index * 7) % 5) - 2) * 0.5}deg` } as CSSProperties;
  return (
    <div className={cx('q-card', off && 'q-off')} style={style}>
      {live && <span className="q-card-flag">Play now</span>}
      <div className={cx('q-card-art', !shot && 'q-toned')} style={!shot && tone ? { background: tone } : undefined}>
        {shot ? <img src={shot} alt="" loading="lazy" /> : <span className="q-card-art-icon" aria-hidden="true">{icon}</span>}
      </div>
      {tag && <span className="q-tile-tag">{tag}</span>}
      <Name className="q-card-name">
        <i aria-hidden="true">{icon}</i>
        {name}
      </Name>
      {tagline && <span className="q-card-tagline">{tagline}</span>}
      {description && <p className="q-card-line">{description}</p>}
      {(stage || !!best?.length) && (
        <div className="q-card-meta">
          {stage && (
            <span className="q-stage" title={`${stage.label}: stage ${stage.n} of 4`}>
              <span className="q-pips" aria-hidden="true">
                {[1, 2, 3, 4].map((k) => <b key={k} className={k <= stage.n ? 'q-on' : undefined} />)}
              </span>
              {stage.label}
            </span>
          )}
          {!!best?.length && (
            <span className="q-best">
              {best.map((d, k) => (
                <span key={d.label} role="img" title={d.label} aria-label={d.label} style={{ '--k': index * 3 + k } as CSSProperties}>
                  {d.icon}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
      <div className="q-card-links">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={cx('q-btn', l.primary && 'q-card-play')}
            target={l.external ? '_blank' : undefined}
            rel={l.external ? 'noreferrer' : undefined}
          >
            {l.icon}
            {l.label}
          </a>
        ))}
        {note && <span className="q-card-note">{note}</span>}
      </div>
    </div>
  );
}
