// @/app/pages/portal/tones.ts
// The colour world behind each app's art: a sky, a sunset, a forest. Every tile preview and
// capsule gets one, so the shelves read like a game library rather than a spreadsheet.
// Keyed by portal entry key, with a fallback per group; all dark enough for white marks on top.

const byKey: Record<string, string> = {
  // games on Rusty Buns
  'park-hide-seek': 'linear-gradient(180deg, #4fa86c 0%, #1f6a3f 55%, #0b2e1c 100%)',
  'skate-tech-park': 'linear-gradient(180deg, #5a3f8f 0%, #c86a4a 48%, #e9a25b 68%, #1d2b3d 100%)',
  'git-recon': 'linear-gradient(180deg, #16211a 0%, #3b5222 70%, #121a10 100%)',
  'two-fronts': 'linear-gradient(135deg, #8a2a2a 0%, #8a2a2a 49%, #2a3f8a 51%, #2a3f8a 100%)',
  'druids-curse': 'linear-gradient(180deg, #2b1d4a 0%, #3f6b3a 100%)',
  'splat-spray': 'linear-gradient(180deg, #1c1030 0%, #a03a7a 65%, #e07a3a 100%)',
  'excalibrawl': 'linear-gradient(180deg, #7a1f2a 0%, #c98a2a 100%)',
  // MTG tables and the social side
  sanctum: 'linear-gradient(180deg, #2a1d5a 0%, #5a2d8a 100%)',
  sandbox: 'linear-gradient(180deg, #3aa5b8 0%, #e3c48a 100%)',
  pvp: 'linear-gradient(180deg, #5a1a1a 0%, #c43a2a 100%)',
  draft: 'linear-gradient(180deg, #1d2a6a 0%, #3b5fd0 100%)',
  deckbuilder: 'linear-gradient(180deg, #0f4a4a 0%, #1f8a7a 100%)',
  // apps
  codesplitter: 'linear-gradient(180deg, #0c1f3d 0%, #1b5f9a 100%)',
  qlave: 'linear-gradient(180deg, #0a3a4a 0%, #1fa0b8 100%)',
  flareup: 'linear-gradient(180deg, #4a1a0a 0%, #e8590c 100%)',
  rustybuns: 'linear-gradient(180deg, #4a2a14 0%, #a8623a 100%)',
  staticflare: 'linear-gradient(180deg, #3a3a0a 0%, #b8a21f 100%)',
  shippycloud: 'linear-gradient(180deg, #2a3a4a 0%, #5a7a9a 100%)',
  qauth: 'linear-gradient(180deg, #1a1f2a 0%, #4a5568 100%)',
  // playground-only apps
  'fm-daw': 'linear-gradient(180deg, #1a0f2a 0%, #6a2a8a 100%)',
  'auto-rig': 'linear-gradient(180deg, #1f2a2a 0%, #4a7a6a 100%)',
  'hello-world': 'linear-gradient(180deg, #2a4a8a 0%, #6aa0d8 100%)',
  'hippo-tycoon': 'linear-gradient(180deg, #3a7ab0 0%, #d8d08a 100%)',
};

const byGroup: Record<string, string> = {
  rustybuns: 'linear-gradient(180deg, #2a2a3a 0%, #5a4a7a 100%)',
  mtg: 'linear-gradient(180deg, #2a1d5a 0%, #5a2d8a 100%)',
  tables: 'linear-gradient(180deg, #0e1f3a 0%, #2a4a7a 100%)',
  dev: 'linear-gradient(180deg, #0c1f3d 0%, #1b5f9a 100%)',
  products: 'linear-gradient(180deg, #0a3a4a 0%, #1fa0b8 100%)',
  account: 'linear-gradient(180deg, #1a1f2a 0%, #4a5568 100%)',
  backburner: 'linear-gradient(180deg, #2a2a2a 0%, #555 100%)',
};

const FALLBACK = 'linear-gradient(180deg, #1a1a1a 0%, #444 100%)';

/** The CSS background for an entry's art, by key, then by group. */
export function toneOf(key: string, group?: string): string {
  return byKey[key] ?? (group ? byGroup[group] : undefined) ?? FALLBACK;
}
