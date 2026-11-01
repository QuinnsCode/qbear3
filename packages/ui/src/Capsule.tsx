import type { ReactNode } from 'react';
import { cx } from './cx';

export interface CapsuleProps {
  name: string;
  /** Short mono line above the name, e.g. "Rusty Buns · Shooter". */
  tag?: string;
  /** The one-line hook under the name. */
  tagline?: string;
  /** The pitch: a few short sentences, each on its own line. */
  pitch?: readonly string[];
  /** The art bar: an image URL, or anything that draws itself (an SVG). */
  art: ReactNode;
  href: string;
  cta: string;
  external?: boolean;
  /** Full width, art bar on top, pitch as big type: the one thing the page is about. */
  hero?: boolean;
  /** Heading level for the name. */
  nameAs?: 'h2' | 'h3';
  className?: string;
}

/**
 * The Steam capsule: a wide art bar with the copy under it, the whole card a link.
 * `hero` makes the full-width feature card; otherwise it is a shelf capsule, three to a row.
 */
export function Capsule({ name, tag, tagline, pitch, art, href, cta, external, hero, nameAs: Name = 'h3', className }: CapsuleProps) {
  return (
    <a
      className={cx('q-capsule', hero && 'q-hero', className)}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <div className="q-capsule-art" aria-hidden="true">
        {typeof art === 'string' ? <img src={art} alt="" loading={hero ? 'eager' : 'lazy'} /> : art}
      </div>
      <div className="q-capsule-body">
        <div className="q-capsule-head">
          {tag && <span className="q-tile-tag">{tag}</span>}
          <Name className="q-capsule-name">{name}</Name>
          {tagline && <p className="q-capsule-tagline">{tagline}</p>}
        </div>
        {pitch && pitch.length > 0 && (
          <ol className="q-capsule-pitch">
            {pitch.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        )}
        <div className="q-capsule-foot">
          <span className="q-btn q-primary">{cta}{external ? ' ↗' : ' →'}</span>
        </div>
      </div>
    </a>
  );
}
