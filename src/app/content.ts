// @/app/content.ts
// The words on the landing page and the Game Center live in content/*.json so a person can edit them
// with `pnpm run cms` (scripts/cms.ts) without touching code, and are walked by path. The editor can
// change text, never add, drop or retype a key, but a hand edit can, so a missing or non-string path
// throws with its name. Server-side only: a JSON module in a client component's import graph fails to
// load in rwsdk's SSR bridge (see portalGames.ts).
import { createElement, Fragment, type ReactNode } from 'react';
import landingDoc from '../../content/landing.json';
import gamesDoc from '../../content/games.json';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function lookup(doc: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((at, key) => (isRecord(at) ? at[key] : undefined), doc);
}

function reader(file: string, doc: unknown) {
  const has = (path: string) => typeof lookup(doc, path) === 'string';
  const text = (path: string): string => {
    const v = lookup(doc, path);
    if (typeof v !== 'string') throw new Error(`content/${file}: "${path}" is not a string`);
    return v;
  };
  return { text, has };
}

/** content/landing.json: `landing.text('feed.title')`. */
export const landing = reader('landing.json', landingDoc);
/** content/games.json. */
export const gamesContent = reader('games.json', gamesDoc);

/** Text with `*starred*` parts as nodes: <em> by default, <b> for body copy. */
export function emphasis(text: string, tag: 'em' | 'b' = 'em'): ReactNode {
  return text.split('*').map((part, i) => (i % 2 ? createElement(tag, { key: i }, part) : createElement(Fragment, { key: i }, part)));
}

/** The editable words for one game: tagline, description, button, and the three-line pitch when it has one. */
export function gameCopy(key: string): { tagline: string; description: string; cta: string; pitch?: readonly [string, string, string] } {
  const t = (field: string) => gamesContent.text(`entries.${key}.${field}`);
  return {
    tagline: t('tagline'),
    description: t('description'),
    cta: t('cta'),
    ...(gamesContent.has(`entries.${key}.pitch1`) && { pitch: [t('pitch1'), t('pitch2'), t('pitch3')] as const }),
  };
}
