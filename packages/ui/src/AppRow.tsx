import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';

export interface AppTag {
  label: string;
  /** A small icon element (e.g. a lucide icon), drawn in `color`. */
  icon: ReactNode;
  color: string;
}

export interface AppRowProps {
  name: string;
  line: string;
  icon: ReactNode;
  accent?: string;
  tags?: AppTag[];
  /** Links on the right: Play, Download, Source. */
  actions?: ReactNode;
  /** Shown in place of the first action when there is nothing to open in the browser, e.g. "Coming soon". */
  note?: string;
  nameAs?: 'h3' | 'h4';
}

/** A full-width card for one app: icon window, name and line, what it is as small colored tags, and its links. */
export function AppRow({ name, line, icon, accent, tags, actions, note, nameAs: Name = 'h3' }: AppRowProps) {
  const style = accent ? ({ '--q-tile-accent': accent } as CSSProperties) : undefined;
  return (
    <article className="q-row" style={style}>
      <div className="q-tile-preview q-row-preview"><span className="q-tile-icon" aria-hidden="true">{icon}</span></div>
      <div className="q-row-body">
        <Name className="q-row-name">{name}</Name>
        <p className="q-row-line">{line}</p>
        {tags && tags.length > 0 && (
          <ul className="q-tags">
            {tags.map((t) => (
              <li key={t.label} className="q-tag" style={{ '--q-tag': t.color } as CSSProperties}>
                <span aria-hidden="true">{t.icon}</span>{t.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cx('q-row-actions')}>
        {note && <span className="q-row-note">{note}</span>}
        {actions}
      </div>
    </article>
  );
}
