// @/app/pages/landing/lab.ts
// The landing lab: every game and app is a verb and a noun. Drop the verb on the noun
// and the app appears. Pure data and rules, so `bun test` can check the table without React.
import type { CraftResult, WorkspaceGroup, WorkspaceItem } from '@qntbr/ui';
import { apps, games, playgroundApps, playgroundDownloadUrl, playgroundSourceUrl, PLAYGROUND_URL, isExternal, resolveHref } from '@/app/pages/portal/portalData';

export const labGroups: WorkspaceGroup[] = [
  { id: 'verb', label: 'Verbs' },
  { id: 'noun', label: 'Nouns' },
  { id: 'game', label: 'Games' },
  { id: 'app', label: 'Apps' },
];

const wordId = (kind: 'verb' | 'noun', word: string) => `${kind}:${word.toLowerCase()}`;

/** The bag: words first, then every app link, in the order they loop. */
export function labItems(request: Request): WorkspaceItem[] {
  const known = new Set([...games, ...apps].map((e) => e.key));
  const things: WorkspaceItem[] = [
    ...games.map((e) => ({ id: e.key, group: 'game', glyph: e.glyph, label: e.name, verb: e.verb, noun: e.noun, href: resolveHref(e, request), hint: e.tagline })),
    ...apps.map((e) => ({ id: e.key, group: 'app', glyph: e.glyph, label: e.name, verb: e.verb, noun: e.noun, href: e.href, hint: e.tagline })),
    ...playgroundApps.filter((a) => !known.has(a.key)).map((a) => ({
      id: a.key, group: 'app', glyph: a.glyph, label: a.name, verb: a.verb, noun: a.noun,
      href: a.play ?? playgroundDownloadUrl(a) ?? playgroundSourceUrl(a) ?? PLAYGROUND_URL, hint: a.line,
    })),
  ].map(({ verb, noun, ...item }) => ({ ...item, hint: `${verb} + ${noun}. ${item.hint ?? ''}`.trim(), external: !!item.href && isExternal(item.href) }));

  const verbs = unique([...games, ...apps, ...playgroundApps].map((e) => e.verb));
  const nouns = unique([...games, ...apps, ...playgroundApps].map((e) => e.noun));
  return [
    ...verbs.map((w) => ({ id: wordId('verb', w), group: 'verb', label: w })),
    ...nouns.map((w) => ({ id: wordId('noun', w), group: 'noun', label: w })),
    ...things,
  ];
}

function unique(words: string[]): string[] {
  return [...new Set(words)];
}

/** Verb + noun → the key of the thing it makes. Each pair is unique across games, apps and the playground. */
export const recipes: ReadonlyMap<string, string> = new Map(
  [...games, ...apps, ...playgroundApps].map((e): [string, string] => [`${wordId('verb', e.verb)}+${wordId('noun', e.noun)}`, e.key]),
);

const kindOf = (item: WorkspaceItem) => (item.group === 'verb' || item.group === 'noun' ? item.group : 'thing');

/** What the control room says when a combination does nothing. */
export const NOTHING_LINES = [
  'Ah ah ah. You didn’t say the magic word.',
  'Hold on to your butts. …Nothing.',
  'It’s a UNIX system. I know this. That isn’t a recipe.',
  'Life, uh, finds a way. This didn’t.',
  'Clever girl. Still nothing.',
  'Spared no expense. Got no app.',
  'Must go faster. Try a verb on a noun.',
  'Objects in the bag are closer than they appear.',
] as const;

/**
 * The rules. Verb + noun makes the app (if the table has it). A thing dropped on itself
 * becomes the next thing in the bag, round and round. Anything else is nothing, with a line.
 */
export function combineLab(a: WorkspaceItem, b: WorkspaceItem, bag: WorkspaceItem[]): CraftResult | null {
  const [ka, kb] = [kindOf(a), kindOf(b)];

  if (ka !== kb && ka !== 'thing' && kb !== 'thing') {
    const [verb, noun] = ka === 'verb' ? [a, b] : [b, a];
    const key = recipes.get(`${verb.id}+${noun.id}`);
    const made = key && bag.find((i) => i.id === key);
    if (!made) return null;
    return { item: made, message: `${verb.label.toUpperCase()} + ${noun.label.toUpperCase()} → ${made.label}. Access granted: click it.` };
  }

  if (a.id !== b.id) return null;

  if (ka === 'thing') {
    const things = bag.filter((i) => kindOf(i) === 'thing');
    const next = things[(things.findIndex((i) => i.id === a.id) + 1) % things.length];
    if (!next) return null;
    return { item: next, message: `${a.label} × 2 → ${next.label}. Keep stacking to loop the whole shelf.` };
  }

  const w = a.label.toLowerCase();
  return ka === 'verb'
    ? { message: `${a.label} + ${a.label}: ${w}ing harder. Still ${w}. Needs a noun.` }
    : { message: `Two ${w}. Nobody is doing anything to them yet. Needs a verb.` };
}

/** The line for a dud, rotating through the control room's repertoire. */
export function nothingLine(n: number): string {
  return NOTHING_LINES[n % NOTHING_LINES.length]!;
}
