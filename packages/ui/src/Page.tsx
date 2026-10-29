import type { HTMLAttributes } from 'react';
import { cx } from './cx';

/** Full-height page surface. Put it at the root of a page so the tokens apply. */
export function Page({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('q-page', className)} {...rest} />;
}

/** Centered content column. */
export function Wrap({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('q-wrap', className)} {...rest} />;
}
