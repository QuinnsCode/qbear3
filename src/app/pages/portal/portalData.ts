// @/app/pages/portal/portalData.ts
// Single source of truth for the QNTBR portal: the three sections on the
// landing page (Products, Game Center, App Center) and the /games + /apps hubs.

import { AudioWaveform, Box, Brush, Crosshair, Droplet, Flame, GitBranch, Hand, KeyRound, Monitor, MonitorSmartphone, Package, PersonStanding, Rocket, Sandwich, Smartphone, SprayCan, Sprout, Trees, Truck, Video, Wind, Zap, type LucideIcon } from 'lucide-react';

export type PortalStatus = 'live' | 'beta' | 'soon';

export interface PortalEntry {
  key: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  cta: string;
  status: PortalStatus;
  /** Which group card this entry sits in on its hub (see gameGroups / appGroups). */
  group: string;
  /** Icon shown in the card's preview window. */
  icon: LucideIcon;
  /** A capture of the running app (under public/), shown on the landing feed and in place of the icon. */
  image?: string;
  /** Emoji shown on the lab tile. */
  glyph?: string;
  /** The two words that make this entry on the landing lab: drop the verb on the noun. */
  verb: string;
  noun: string;
  /** Short mono tag shown above the name, e.g. "MTG" or "GitHub". */
  tag?: string;
  /** The elevator pitch, three sentences, for the landing capsules. One shot; make it count. */
  pitch?: readonly [string, string, string];
}

/** Where a game plays best. */
export type Platform = 'mobile' | 'desktop' | 'both';

/** Games that name a device. git-recon and Druids Curse are not mobile games; Skate Tech Park is better on desktop. */
const PLATFORMS: Record<string, Platform> = {
  'park-hide-seek': 'both',
  'skate-tech-park': 'desktop',
  'git-recon': 'desktop',
  'two-fronts': 'both',
  'druids-curse': 'desktop',
  'splat-spray': 'both',
  excalibrawl: 'both',
};

const PLATFORM_HINTS: Record<Platform, { icon: LucideIcon; label: string }> = {
  mobile: { icon: Smartphone, label: 'Best on phone' },
  desktop: { icon: Monitor, label: 'Best on desktop' },
  both: { icon: MonitorSmartphone, label: 'Phone & desktop' },
};

/** The device hint for an entry: undefined when it names none. */
export function platformOf(key: string): { icon: LucideIcon; label: string } | undefined {
  const p = PLATFORMS[key];
  return p ? PLATFORM_HINTS[p] : undefined;
}

export const GITHUB_ORG_URL = 'https://github.com/QuinnsCode';
export const RUSTY_BUNS_URL = 'https://github.com/QuinnsCode/RustyBuns';
// ──────────────────────────────────────────────────────────────
// Game Center — everything you can play
// ──────────────────────────────────────────────────────────────
/** Everything about a game but its words, which live in content/games.json (edit them with `pnpm run cms`)
 * and are added by portalGames.ts. Kept free of that JSON because the landing lab, a client component,
 * imports this file. */
export const gameShells: Omit<PortalEntry, 'tagline' | 'description' | 'cta' | 'pitch'>[] = [
  {
    key: 'draft',
    group: 'mtg',
    icon: Package,
    glyph: '📦',
    name: 'Draft my cube',
    tag: 'MTG · Vintage cube',
    href: '/draft/new',
    status: 'live',
    verb: 'Draft',
    noun: 'Cards',
  },
  {
    key: 'park-hide-seek',
    image: '/landing/park-hide-seek.jpg',
    group: 'rustybuns',
    icon: Trees,
    glyph: '🌲',
    name: 'Park Hide & Seek',
    tag: 'Rusty Buns · 3D',
    href: 'https://park-hide-seek.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Hide',
    noun: 'Park',
  },
  {
    key: 'skate-tech-park',
    image: '/landing/skate-tech-park.jpg',
    group: 'rustybuns',
    icon: Wind,
    glyph: '🛹',
    name: 'Skate Tech Park',
    tag: 'Rusty Buns · Multiplayer',
    href: 'https://skatetechpark.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Skate',
    noun: 'Park',
  },
  {
    key: 'git-recon',
    image: '/landing/git-recon.jpg',
    group: 'rustybuns',
    icon: Crosshair,
    glyph: '🔫',
    name: 'git-recon',
    tag: 'Rusty Buns · Shooter',
    href: 'https://git-recon.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Shoot',
    noun: 'Repo',
  },
  {
    key: 'two-fronts',
    image: '/landing/two-fronts.jpg',
    group: 'rustybuns',
    icon: Rocket,
    glyph: '🚀',
    name: 'Two Fronts',
    tag: 'Rusty Buns · Strategy',
    href: 'https://two-fronts.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Conquer',
    noun: 'Moon',
  },
  {
    key: 'druids-curse',
    image: '/landing/druids-curse.jpg',
    group: 'rustybuns',
    icon: Sprout,
    glyph: '🌿',
    name: 'Druids Curse',
    tag: 'Rusty Buns · Multiplayer',
    href: 'https://druids-curse-votv.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Curse',
    noun: 'Druid',
  },
  {
    key: 'splat-spray',
    group: 'rustybuns',
    icon: SprayCan,
    glyph: '🎨',
    name: 'Splat Spray',
    tag: 'Rusty Buns · Puzzle',
    href: 'https://splat-spray.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Spray',
    noun: 'Dark',
  },
  {
    key: 'excalibrawl',
    image: '/landing/excalibrawl.jpg',
    group: 'rustybuns',
    icon: Brush,
    glyph: '🖍️',
    name: 'Excalibrawl',
    tag: 'Rusty Buns · AI',
    href: 'https://excalibrawl.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Draw',
    noun: 'Robots',
  },
];

// ──────────────────────────────────────────────────────────────
// App Center — the businessy stuff
// ──────────────────────────────────────────────────────────────
export const apps: PortalEntry[] = [
  {
    key: 'codesplitter',
    image: '/landing/codesplitter.jpg',
    group: 'dev',
    icon: GitBranch,
    glyph: '🧩',
    name: 'codeSplitter',
    tag: 'Rusty Buns · Code host',
    tagline: 'Git for the agentic era',
    description: 'A code host for agents: every line a record, real git on Cloudflare Artifacts.',
    href: 'https://codesplitter.notryanquinn.workers.dev',
    cta: 'Open codeSplitter',
    status: 'live',
    verb: 'Split',
    noun: 'Code',
    pitch: [
      'Your agents write code faster than any human can read a diff. The code host they push to was built for people who type.',
      'codeSplitter makes every line a record you can query, on real git, on Cloudflare Artifacts: no servers, no fleet to babysit, the edge the agents already run on.',
      'Point one agent at it today. When the merge queue is the bottleneck for ten thousand, you will want the host that was built for the fleet.',
    ],
  },
  {
    key: 'qlave',
    image: '/landing/qlave.jpg',
    group: 'products',
    icon: Video,
    glyph: '📞',
    name: 'Qlave',
    tag: 'Calls · WebRTC',
    tagline: 'Web calls & collaboration',
    description: 'Audio, video, and real-time collaboration in the browser. One link, any device, no installs.',
    href: 'https://qlave.dev',
    cta: 'Open Qlave',
    status: 'live',
    verb: 'Call',
    noun: 'Friends',
  },
  {
    key: 'geoboxq',
    group: 'products',
    icon: Box,
    glyph: '📦',
    name: 'GeoBoxQ',
    tag: 'Geometry · Puzzle',
    tagline: 'Will it fit in the box?',
    description: 'Will it fit in the box? Including a box in a box in a box.',
    href: 'https://geoboxq-worker-live-ryanquinn-tjhne4lpmumy6kz5.notryanquinn.workers.dev',
    cta: 'Open GeoBoxQ',
    status: 'live',
    verb: 'Fit',
    noun: 'Box',
  },
  {
    key: 'flareup',
    image: '/landing/flareup.jpg',
    group: 'backburner',
    icon: Flame,
    glyph: '🔥',
    name: 'Flareup',
    tag: 'Cloudflare · Cost',
    tagline: 'Infrastructure cost monitor',
    description: 'Real-time spend alerts and usage breakdowns for your Cloudflare account. Know what you are burning before the bill lands.',
    href: 'https://flareup.dev',
    cta: 'Check the burn',
    status: 'live',
    verb: 'Burn',
    noun: 'Money',
  },
  {
    key: 'rustybuns',
    image: '/landing/rustybuns.svg',
    group: 'dev',
    icon: Sandwich,
    glyph: '🍔',
    name: 'RustyBuns',
    tag: 'GitHub · Open source',
    tagline: 'Ship your web app as a native binary',
    description: 'Your web app, shipped as a native binary, with a server you can move anywhere. Source, issues, and releases live on GitHub.',
    href: RUSTY_BUNS_URL,
    cta: 'View on GitHub',
    status: 'live',
    verb: 'Ship',
    noun: 'Binary',
  },
  {
    key: 'staticflare',
    image: '/landing/staticflare.jpg',
    group: 'backburner',
    icon: Zap,
    glyph: '⚡',
    name: 'Staticflare',
    tag: 'Hosting · Edge',
    tagline: 'Static hosting',
    description: 'Being rebuilt as a shaved-down EmDash on Rusty Buns: a static site in, an edge deploy out.',
    href: 'https://staticflare.dev',
    cta: 'Coming soon',
    status: 'soon',
    verb: 'Host',
    noun: 'Site',
  },
  {
    key: 'shippycloud',
    group: 'products',
    icon: Truck,
    glyph: '🚚',
    name: 'Shippycloud',
    tag: 'GitHub · Fulfillment',
    tagline: 'Business fulfillment software',
    description: 'Orders, shipments, and SKU analytics for small shops. ShipStation-backed, with real-time order notes for the whole team.',
    href: 'https://github.com/QuinnsCode/shippycloud',
    cta: 'On ice',
    status: 'soon',
    verb: 'Ship',
    noun: 'Orders',
  },
  {
    key: 'qauth',
    group: 'account',
    icon: KeyRound,
    glyph: '🔑',
    name: 'eqosys',
    tag: 'Account · eqosys.qntbr.com',
    tagline: 'One account for everything',
    description: 'One account for every Q app, served by eqosys on its own Worker. Sign in there and every game and app knows you.',
    href: 'https://eqosys.qntbr.com',
    cta: 'Go to eqosys',
    status: 'beta',
    verb: 'Unlock',
    noun: 'Account',
  },
];

// ──────────────────────────────────────────────────────────────
// Groups — each one is a card holding the cards of the entries inside it
// ──────────────────────────────────────────────────────────────
export interface PortalGroup {
  key: string;
  title: string;
  lede: string;
  /** What to call one entry in the count, e.g. "game". */
  noun: string;
}


export const appGroups: PortalGroup[] = [
  { key: 'dev', title: 'Developer tools', lede: 'The code host for agents, and the open-source runtime it ships on.', noun: 'tool' },
  { key: 'products', title: 'Products', lede: 'Calls, fulfillment and box puzzles.', noun: 'product' },
  { key: 'account', title: 'Account', lede: 'One login for every game and app.', noun: 'service' },
  { key: 'backburner', title: 'Back burner', lede: 'Rusty Buns now covers most of what these set out to do.', noun: 'project' },
];

// ──────────────────────────────────────────────────────────────
// Rusty Buns Playground — every app in the RustyBuns repo's apps/playground/public/apps.json,
// the ones not already in the Game or App Center join the landing lab. Keep it in step with that file.
// ──────────────────────────────────────────────────────────────
export const PLAYGROUND_URL = 'https://rustybuns-playground.notryanquinn.workers.dev';

export interface PlaygroundApp {
  key: string;
  name: string;
  line: string;
  /** Live browser build. */
  play?: string;
  /** Release tag prefix for the desktop download. */
  download?: string;
  /** Folder under apps/ in the RustyBuns repo. */
  source?: string;
  icon: LucideIcon;
  glyph: string;
  /** The two words that make this app on the landing lab. */
  verb: string;
  noun: string;
}

export const playgroundApps: PlaygroundApp[] = [
  { key: 'park-hide-seek', name: 'Park Hide & Seek', line: '3D hide and seek on real Yosemite terrain; each player is sent only what they can see.', play: 'https://park-hide-seek.notryanquinn.workers.dev', download: 'park-hide-seek-v', source: 'park-hide-seek', icon: Trees, glyph: '🌲', verb: 'Hide', noun: 'Park' },
  { key: 'skate-tech-park', name: 'Skate Tech Park', line: 'A giant riderless fingerboard on park terrain, up to four riders.', play: 'https://skatetechpark.notryanquinn.workers.dev', source: 'skate-tech-park', icon: Wind, glyph: '🛹', verb: 'Skate', noun: 'Park' },
  { key: 'git-recon', name: 'git-recon', line: 'A toy-soldier shooter fought in a codebase: the repo is the level.', play: 'https://git-recon.notryanquinn.workers.dev', source: 'git-recon', icon: Crosshair, glyph: '🔫', verb: 'Shoot', noun: 'Repo' },
  { key: 'two-fronts', name: 'Two Fronts', line: 'Turn-based strategy on a forest moon, with three.js battles on the ground and in orbit.', play: 'https://two-fronts.notryanquinn.workers.dev', source: 'two-fronts', icon: Rocket, glyph: '🚀', verb: 'Conquer', noun: 'Moon' },
  { key: 'druids-curse', name: 'Druids Curse', line: 'The live multiplayer game Rusty Buns was first built for.', play: 'https://druids-curse-votv.notryanquinn.workers.dev', icon: Sprout, glyph: '🌿', verb: 'Curse', noun: 'Druid' },
  { key: 'codesplitter', name: 'codeSplitter', line: 'A code host for agents: every line a record, real git on Cloudflare Artifacts.', play: 'https://codesplitter.notryanquinn.workers.dev', source: 'codesplitter', icon: GitBranch, glyph: '🧩', verb: 'Split', noun: 'Code' },
  { key: 'excalibrawl', name: 'Excalibrawl', line: 'An hourly drawing fight between two models, refereed by a third.', play: 'https://excalibrawl.notryanquinn.workers.dev', source: 'excalibrawl', icon: Brush, glyph: '🖍️', verb: 'Draw', noun: 'Robots' },
  { key: 'fm-daw', name: 'FM Groovebox', line: 'A twelve-track FM groovebox with a drum machine, step sequencer, piano roll and reverb.', download: 'fm-daw-v', source: 'fm-daw', icon: AudioWaveform, glyph: '🎛️', verb: 'Jam', noun: 'Beats' },
  { key: 'splat-spray', name: 'Splat Spray', line: 'An I-spy game in the dark: scan a Gaussian-splat room and find 100 things in the fewest shots.', play: 'https://splat-spray.notryanquinn.workers.dev', download: 'splat-spray-v', source: 'splat-spray', icon: SprayCan, glyph: '🎨', verb: 'Spray', noun: 'Dark' },
  { key: 'auto-rig', name: 'Auto Rig', line: 'Drop in a 3D model, get a skeleton, skin weights and inverse kinematics you can drag around.', source: 'auto-rig', icon: PersonStanding, glyph: '🦴', verb: 'Rig', noun: 'Model' },
  { key: 'hello-world', name: 'Hello World', line: 'The smallest Rusty Buns app: one page, static assets only.', play: 'https://hello-world.notryanquinn.workers.dev', source: 'hello-world', icon: Hand, glyph: '👋', verb: 'Say', noun: 'Hello' },
  { key: 'hippo-tycoon', name: 'Hippo Tycoon', line: 'Four greedy oil-baron hippos race to chomp the most oil from a jungle geyser; solo, couch, LAN or online.', download: 'hippo-tycoon-v', source: 'hippo-tycoon', icon: Droplet, glyph: '🦛', verb: 'Chomp', noun: 'Oil' },
];

/** The playground's own links: live build, desktop release, source folder. */
export const playgroundDownloadUrl = (a: PlaygroundApp) => a.download && `${RUSTY_BUNS_URL}/releases?q=${a.download}&expanded=true`;
export const playgroundSourceUrl = (a: PlaygroundApp) => a.source && `${RUSTY_BUNS_URL}/tree/main/apps/${a.source}`;

/** Each group with its entries, in group order; empty groups are dropped. */
export function groupEntries(entries: PortalEntry[], groups: PortalGroup[]) {
  return groups
    .map((group) => ({ group, entries: entries.filter((e) => e.group === group.key) }))
    .filter((g) => g.entries.length > 0);
}

export function isExternal(href: string): boolean {
  return href.startsWith('http');
}
