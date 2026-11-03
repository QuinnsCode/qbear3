// @/app/pages/landing/labItems.ts
// The lab's bag, with the games' words from content/games.json. Server side only (see lab.ts).
import type { WorkspaceItem } from '@qntbr/ui';
import { apps, isExternal } from '@/app/pages/portal/portalData';
import { games } from '@/app/pages/portal/portalGames';
import { wordId } from './lab';

/** The bag: words first, then every app link, in the order they loop. */
export function labItems(): WorkspaceItem[] {
  const things: WorkspaceItem[] = [
    ...games.map((e) => ({ id: e.key, group: 'game', glyph: e.glyph, label: e.name, verb: e.verb, noun: e.noun, href: e.href, hint: e.tagline })),
    ...apps.map((e) => ({ id: e.key, group: 'app', glyph: e.glyph, label: e.name, verb: e.verb, noun: e.noun, href: e.status === 'soon' ? undefined : e.href, hint: e.tagline })),
  ].map(({ verb, noun, ...item }) => ({ ...item, hint: `${verb} + ${noun}. ${item.hint ?? ''}`.trim(), external: !!item.href && isExternal(item.href) }));

  const verbs = unique([...games, ...apps].map((e) => e.verb));
  const nouns = unique([...games, ...apps].map((e) => e.noun));
  return [
    ...verbs.map((w) => ({ id: wordId('verb', w), group: 'verb', label: w })),
    ...nouns.map((w) => ({ id: wordId('noun', w), group: 'noun', label: w })),
    ...things,
  ];
}

function unique(words: string[]): string[] {
  return [...new Set(words)];
}
