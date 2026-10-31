import type { ReactNode } from 'react';
import { Badge, StatusPill, type Status } from './Badge';
import { cx } from './cx';

export interface TileProps {
  name: string;
  /** Short mono line above the name, e.g. "MTG · Commander". */
  tag?: string;
  tagline?: string;
  description?: string;
  /** What the preview window shows: an icon element (e.g. a lucide icon). Ignored when `image` is set. */
  icon?: ReactNode;
  /** A screenshot or app image that fills the preview window. */
  image?: string;
  /** Fallback preview when there is no icon or image: an emoji or character. Defaults to the name's first letter. */
  glyph?: ReactNode;
  status?: Status;
  /** Extra badges, e.g. "Q auth". */
  badges?: ReactNode[];
  href?: string;
  cta?: string;
  external?: boolean;
  /** Preview and name only: for overview grids. */
  compact?: boolean;
  /** Preview on the left, copy in the middle, `aside` on the right. */
  wide?: boolean;
  aside?: ReactNode;
  /** Heading level for the name, so tiles nest under whatever heads them. */
  nameAs?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/** The card: a paper tile around a preview window (status pills ride on it). A link when it has an href and is not "soon". */
export function Tile({
  name, tag, tagline, description, icon, image, glyph, status, badges, href, cta, external,
  compact, wide, aside, nameAs: Name = 'h3', className,
}: TileProps) {
  const soon = status === 'soon';
  const linked = !!href && !soon;
  const cls = cx('q-tile', wide && 'q-wide', compact && 'q-compact', soon && 'q-soon', className);

  const preview = (
    <div className="q-tile-preview">
      {image
        ? <img src={image} alt="" loading="lazy" />
        : <span className="q-tile-icon" aria-hidden="true">{icon ?? glyph ?? name.charAt(0)}</span>}
      {!compact && (!!status || !!badges?.length) && (
        <div className="q-tile-pills">
          {status && <StatusPill status={status} />}
          {badges?.map((b, i) => <Badge key={i}>{b}</Badge>)}
        </div>
      )}
    </div>
  );

  const foot = compact || !cta ? null : (
    <div className="q-tile-foot">
      <span className="q-tile-cta">{cta}{linked ? (external ? ' ↗' : ' →') : ''}</span>
    </div>
  );

  const body = (
    <>
      {preview}
      <div className="q-tile-body">
        {!compact && tag && <span className="q-tile-tag">{tag}</span>}
        <Name className="q-tile-name">{name}</Name>
        {!compact && tagline && <span className="q-tile-tagline">{tagline}</span>}
        {!compact && description && <p className="q-tile-desc">{description}</p>}
        {!wide && foot}
      </div>
      {wide && <div className="q-tile-body">{aside}{foot}</div>}
    </>
  );

  return linked ? (
    <a className={cls} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export interface TileGroupProps {
  title: string;
  /** Short mono line beside the title, e.g. "7 games". */
  meta?: string;
  lede?: string;
  /** Heading level for the title. */
  as?: 'h2' | 'h3';
  /** Smaller tiles in a denser grid, for the compact overview. */
  dense?: boolean;
  children: ReactNode;
}

/** A card that holds cards: rises out of the page and groups the tiles inside it. */
export function TileGroup({ title, meta, lede, as: Heading = 'h2', dense, children }: TileGroupProps) {
  return (
    <section className={cx('q-group', dense && 'q-dense')}>
      <header className="q-group-head">
        <Heading className="q-group-title">{title}</Heading>
        {meta && <span className="q-label">{meta}</span>}
        {lede && <p className="q-group-lede">{lede}</p>}
      </header>
      <div className="q-group-grid">{children}</div>
    </section>
  );
}
