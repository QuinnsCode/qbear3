import type { ReactNode } from 'react';
import { Button } from './Button';

export interface SectionHeadProps {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  /** Smaller title for sections below the hero. */
  small?: boolean;
  linkHref?: string;
  linkLabel?: string;
  as?: 'h1' | 'h2';
}

export function SectionHead({ eyebrow, title, lede, small, linkHref, linkLabel, as: Heading = 'h2' }: SectionHeadProps) {
  return (
    <div className="q-section-head">
      <div>
        <span className="q-label">{eyebrow}</span>
        <Heading className={small ? 'q-title q-sm' : 'q-title'}>{title}</Heading>
        {lede && <p className="q-lede">{lede}</p>}
      </div>
      {linkHref && linkLabel && (
        <Button href={linkHref} className="q-section-link">{linkLabel} →</Button>
      )}
    </div>
  );
}
