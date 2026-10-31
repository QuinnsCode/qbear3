"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from './cx';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Mono line above the title. */
  eyebrow?: string;
  wide?: boolean;
  children: ReactNode;
}

/** A paper panel over the page. Escape or a click on the scrim closes it; focus moves in on open. */
export function Sheet({ open, onClose, title, eyebrow, wide, children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); back?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="q-sheet-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={cx('q-sheet', wide && 'q-wide')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="q-sheet-head">
          <div>
            {eyebrow && <span className="q-label">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button type="button" className="q-btn q-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
