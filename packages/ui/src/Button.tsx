import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type Variant = 'default' | 'primary' | 'ghost';

type ButtonProps = { variant?: Variant; children: ReactNode } & (
  | ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
);

/** A paper tile you can press. Renders an <a> when given an href, otherwise a <button>. */
export function Button({ variant = 'default', className, children, ...rest }: ButtonProps) {
  const cls = cx('q-btn', variant !== 'default' && `q-${variant}`, className);
  if ('href' in rest && rest.href !== undefined) {
    const { href, target, rel, ...anchor } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <a className={cls} href={href} target={target} rel={target === '_blank' ? rel ?? 'noreferrer' : rel} {...anchor}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
