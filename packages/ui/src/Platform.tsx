import type { ReactNode } from 'react';

export interface PlatformHint {
  /** A lucide icon: phone, desktop or both. */
  icon: ReactNode;
  /** Short label, e.g. "Best on desktop". */
  label: string;
}

/** Where a game plays best: one small icon and a label. */
export function Platform({ icon, label }: PlatformHint) {
  return <span className="q-plat" title={label}><span aria-hidden="true">{icon}</span>{label}</span>;
}
