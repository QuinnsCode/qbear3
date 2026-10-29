import type { CSSProperties, ReactNode } from 'react';
import { Badge, StatusPill, type Status } from './Badge';
import { cx } from './cx';

export interface TileProps {
  name: string;
  /** Short mono line above the name, e.g. "MTG · Commander". */
  tag?: string;
  tagline?: string;
  description?: string;
  /** A single character or emoji shown in the glyph square. Defaults to the name's first letter. */
  glyph?: ReactNode;
  /** Per-tile accent for the top stripe and glyph. Defaults to the theme accent. */
  accent?: string;
  status?: Status;
  /** Extra badges, e.g. "Q auth". */
  badges?: ReactNode[];
  href?: string;
  cta?: string;
  external?: boolean;
  /** Two-column layout with `aside` on the right. */
  wide?: boolean;
  aside?: ReactNode;
  className?: string;
}

/** The card: a paper tile with an accent stripe. A link when it has an href and is not "soon". */
export function Tile({
  name, tag, tagline, description, glyph, accent, status, badges, href, cta, external, wide, aside, className,
}: TileProps) {
  const soon = status === 'soon';
  const linked = !!href && !soon;
  const style = accent ? ({ '--q-tile-accent': accent } as CSSProperties) : undefined;
  const cls = cx('q-tile', wide && 'q-wide', soon && 'q-soon', className);

  const body = (
    <>
      <div className="q-col" style={wide ? undefined : { display: 'contents' }}>
        <div className="q-tile-head">
          <div style={{ display: 'grid', gap: 4 }}>
            {tag && <span className="q-tile-tag">{tag}</span>}
            <h3 className="q-tile-name">{name}</h3>
          </div>
          <span className="q-glyph" aria-hidden="true">{glyph ?? name.charAt(0)}</span>
        </div>
        {tagline && <span className="q-tile-tagline">{tagline}</span>}
        {description && <p className="q-tile-desc">{description}</p>}
        {!wide && <TileFoot status={status} badges={badges} cta={cta} linked={linked} external={external} />}
      </div>
      {wide && (
        <div className="q-col">
          {aside}
          <TileFoot status={status} badges={badges} cta={cta} linked={linked} external={external} />
        </div>
      )}
    </>
  );

  return linked ? (
    <a className={cls} style={style} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
      {body}
    </a>
  ) : (
    <div className={cls} style={style}>{body}</div>
  );
}

function TileFoot({ status, badges, cta, linked, external }: Pick<TileProps, 'status' | 'badges' | 'cta' | 'external'> & { linked: boolean }) {
  return (
    <div className="q-tile-foot">
      {status && <StatusPill status={status} />}
      {badges?.map((b, i) => <Badge key={i}>{b}</Badge>)}
      {cta && <span className="q-tile-cta">{cta}{linked ? (external ? ' ↗' : ' →') : ''}</span>}
    </div>
  );
}
