// @/app/pages/landing/lab.ts
// The landing lab: every game and app is a verb and a noun. Drop the verb on the noun
// and the app appears; drop anything else on anything and some other app does. Pure data and rules, so `bun test` can check the table without React. Free of content/*.json: LandingLab (client) imports this; the bag itself is built in labItems.ts.
import type { CraftResult, WorkspaceGroup, WorkspaceItem } from '@qntbr/ui';
import { apps, gameShells, playgroundApps } from '@/app/pages/portal/portalData';

export const labGroups: WorkspaceGroup[] = [
  { id: 'verb', label: 'Verbs' },
  { id: 'noun', label: 'Nouns' },
  { id: 'game', label: 'Games · click to open' },
  { id: 'app', label: 'Apps · click to open' },
];

export const wordId = (kind: 'verb' | 'noun', word: string) => `${kind}:${word.toLowerCase()}`;

/** Verb + noun → the key of the thing it makes. Each pair is unique across games, apps and the playground. */
export const recipes: ReadonlyMap<string, string> = new Map(
  [...gameShells, ...apps, ...playgroundApps].map((e): [string, string] => [`${wordId('verb', e.verb)}+${wordId('noun', e.noun)}`, e.key]),
);

const kindOf = (item: WorkspaceItem) => (item.group === 'verb' || item.group === 'noun' ? item.group : 'thing');

/** Each thing's own two words, by key: what it was made from. */
const wordsOf: ReadonlyMap<string, readonly [string, string]> = new Map(
  [...recipes].map(([pair, key]): [string, readonly [string, string]] => {
    const [verb = '', noun = ''] = pair.split('+');
    return [key, [verb, noun]];
  }),
);

/** What the control room says when a drop lands somewhere off the table. */
export const DETOUR_LINES = [
  'Life, uh, finds a way',
  'Hold on to your butts',
  'It’s a UNIX system. I know this',
  'Clever girl',
  'Spared no expense',
  'Must go faster',
  'Objects in the bag are closer than they appear',
  'Ah ah ah, close enough',
] as const;

/** A stable small number for a pair of ids, so the same two words always make the same app. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The rules. Everything makes an app:
 * - the right verb + noun makes its app;
 * - any other pair of words always makes the same app (a word on itself makes one of the apps it is in);
 * - an app on a word makes another app that word is in;
 * - two apps (or one on itself) make a random other app.
 * `rand` is there so tests can pin the dice.
 */
export function combineLab(a: WorkspaceItem, b: WorkspaceItem, bag: WorkspaceItem[], rand: () => number = Math.random): CraftResult | null {
  const things = bag.filter((i) => kindOf(i) === 'thing');
  if (things.length === 0) return null;
  const [ka, kb] = [kindOf(a), kindOf(b)];
  const pick = (from: WorkspaceItem[], n: number) => from[n % from.length]!;
  const withWord = (id: string) => things.filter((t) => wordsOf.get(t.id)?.includes(id));
  const made = (item: WorkspaceItem, how: string, detour = true): CraftResult => ({
    item,
    message: detour
      ? `${how}. ${DETOUR_LINES[hash(how) % DETOUR_LINES.length]} → ${item.label}. Click it to open.`
      : `${how} → ${item.label}. Access granted: click it to open.`,
  });
  const how = `${a.label.toUpperCase()} + ${b.label.toUpperCase()}`;

  if (ka === 'thing' && kb === 'thing') {
    const others = things.filter((t) => t.id !== a.id && t.id !== b.id);
    const pool = others.length ? others : things;
    return made(pick(pool, Math.floor(rand() * pool.length)), how);
  }

  if (ka === 'thing' || kb === 'thing') {
    const [app, w] = ka === 'thing' ? [a, b] : [b, a];
    const kin = withWord(w.id).filter((t) => t.id !== app.id);
    const pool = kin.length ? kin : things.filter((t) => t.id !== app.id);
    return made(pick(pool, Math.floor(rand() * pool.length)), how);
  }

  if (ka !== kb) {
    const [verb, noun] = ka === 'verb' ? [a, b] : [b, a];
    const key = recipes.get(`${verb.id}+${noun.id}`);
    const exact = key && things.find((i) => i.id === key);
    if (exact) return made(exact, `${verb.label.toUpperCase()} + ${noun.label.toUpperCase()}`, false);
  }

  const pair = [a.id, b.id].sort().join('+');
  const kin = a.id === b.id ? withWord(a.id) : [];
  return made(pick(kin.length ? kin : things, hash(pair)), how);
}
