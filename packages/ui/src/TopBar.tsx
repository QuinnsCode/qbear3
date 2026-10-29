import type { ReactNode } from 'react';
import { BrandMark } from './Brand';
import { cx } from './cx';

export interface NavItem {
  href: string;
  label: string;
  /** Marks the current page. */
  active?: boolean;
  external?: boolean;
}

export interface TopBarProps {
  /** Wordmark text next to the mark. */
  brand?: string;
  brandHref?: string;
  links?: NavItem[];
  /** Right-hand slot: a sign-in button, theme toggle, etc. */
  actions?: ReactNode;
}

/** Sticky top bar: brand on the left, hairline nav, actions on the right. */
export function TopBar({ brand = 'QNTBR', brandHref = '/', links = [], actions }: TopBarProps) {
  return (
    <header className="q-top">
      <a className="q-brand" href={brandHref}>
        <BrandMark />
        {brand}
      </a>
      <nav className="q-nav" aria-label="Primary">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={cx('q-nav-link', l.active && 'q-active')}
            aria-current={l.active ? 'page' : undefined}
            target={l.external ? '_blank' : undefined}
            rel={l.external ? 'noreferrer' : undefined}
          >
            {l.label}
          </a>
        ))}
      </nav>
      {actions}
    </header>
  );
}
