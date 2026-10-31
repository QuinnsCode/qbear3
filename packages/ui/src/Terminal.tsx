import type { ReactNode } from 'react';
import { cx } from './cx';

export interface TerminalLine {
  key: string | number;
  text: ReactNode;
  /** `ok` lines take the accent, `meh` lines go quiet. */
  tone?: 'ok' | 'meh';
}

export interface TerminalProps {
  /** The strip across the top, e.g. "QNTBR LAB · SYSTEMS". */
  title: string;
  /** Right end of the strip, e.g. a status word. */
  status?: string;
  lines: TerminalLine[];
  className?: string;
}

/**
 * A control-room readout: a dark panel of mono lines with a prompt on each and a
 * blinking cursor on the last. It only shows what it is given; the page decides what
 * is worth saying. Server-safe.
 */
export function Terminal({ title, status, lines, className }: TerminalProps) {
  // Newest first in the DOM, flipped back by column-reverse: the panel starts scrolled to the
  // latest line and stays there as lines arrive, with no script.
  const newestFirst = [...lines].reverse();
  return (
    <div className={cx('q-term', className)} role="log" aria-live="polite" aria-label={title}>
      <div className="q-term-bar">
        <span>{title}</span>
        {status && <span className="q-term-status">{status}</span>}
      </div>
      <ol className="q-term-lines">
        <li className="q-term-cursor" aria-hidden="true" />
        {newestFirst.map((l) => (
          <li key={l.key} data-tone={l.tone}>{l.text}</li>
        ))}
      </ol>
    </div>
  );
}
