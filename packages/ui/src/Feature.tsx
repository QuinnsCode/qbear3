import type { CSSProperties, ReactNode } from 'react';
import { StatusPill, type Status } from './Badge';
import { cx } from './cx';

export interface FeatureProps {
  name: string;
  /** Short mono line above the name. */
  tag?: string;
  tagline?: string;
  description?: string;
  bullets?: string[];
  /** Icon element for the preview window. Ignored when `image` is set. */
  icon?: ReactNode;
  image?: string;
  accent?: string;
  status?: Status;
  /** Buttons under the copy. */
  actions?: ReactNode;
  /** The biggest card on the page: taller preview, larger name. */
  hero?: boolean;
  /** A drawer under the card that opens to show more tiles. */
  drawer?: {
    label: string;
    /** Shown beside the label while closed, e.g. a row of small icons. */
    peek?: ReactNode;
    /** Stack the children full width (AppRow) instead of laying them out as a tile grid. */
    rows?: boolean;
    children: ReactNode;
  };
  nameAs?: 'h2' | 'h3';
  id?: string;
}

/** A full-width card for the thing that matters most on a page, optionally with a drawer of tiles inside it. */
export function Feature({
  name, tag, tagline, description, bullets, icon, image, accent, status, actions, hero, drawer, nameAs: Name = 'h2', id,
}: FeatureProps) {
  const style = accent ? ({ '--q-tile-accent': accent } as CSSProperties) : undefined;
  return (
    <article id={id} className={cx('q-feature', hero && 'q-hero')} style={style}>
      <div className="q-feature-main">
        <div className="q-tile-preview q-feature-preview">
          {image
            ? <img src={image} alt="" loading="lazy" />
            : <span className="q-tile-icon" aria-hidden="true">{icon ?? name.charAt(0)}</span>}
          {status && <div className="q-tile-pills"><StatusPill status={status} /></div>}
        </div>
        <div className="q-feature-body">
          {tag && <span className="q-tile-tag">{tag}</span>}
          <Name className="q-feature-name">{name}</Name>
          {tagline && <span className="q-feature-tagline">{tagline}</span>}
          {description && <p className="q-feature-desc">{description}</p>}
          {bullets && bullets.length > 0 && <ul className="q-list">{bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          {actions && <div className="q-feature-actions">{actions}</div>}
        </div>
      </div>
      {drawer && (
        <details className="q-feature-drawer">
          <summary>
            <span className="q-feature-drawer-label">{drawer.label}</span>
            {drawer.peek && <span className="q-feature-peek" aria-hidden="true">{drawer.peek}</span>}
          </summary>
          <div className={drawer.rows ? 'q-rows' : 'q-group-grid'}>{drawer.children}</div>
        </details>
      )}
    </article>
  );
}
