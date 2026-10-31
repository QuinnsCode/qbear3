import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type Status = 'live' | 'beta' | 'soon';

const STATUS_LABEL: Record<Status, string> = { live: 'Live', beta: 'Beta', soon: 'Soon' };

/** A small paper label. */
export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('q-badge', className)} {...rest} />;
}

/** A rounded status pill with a dot: solid for live, the accent for beta, hollow for soon. */
export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cx('q-pill', className)} data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}
