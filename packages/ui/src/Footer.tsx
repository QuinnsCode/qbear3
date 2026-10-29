import type { NavItem } from './TopBar';

export function Footer({ copyright, links = [] }: { copyright: string; links?: NavItem[] }) {
  return (
    <footer className="q-footer">
      <div className="q-wrap">
        <span className="q-label">{copyright}</span>
        <nav className="q-footer-links" aria-label="Footer">
          {links.map((l) => (
            <a key={l.href} href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noreferrer' : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
