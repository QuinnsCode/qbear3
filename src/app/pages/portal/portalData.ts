// @/app/pages/portal/portalData.ts
// Single source of truth for the QNTBR portal: the three sections on the
// landing page (Products, Game Center, App Center) and the /games + /apps hubs.

import { AudioWaveform, Box, Brush, Crosshair, Disc3, Droplet, Flame, Gamepad2, GitBranch, Hand, KeyRound, Monitor, MonitorSmartphone, Music, Package, PersonStanding, Rocket, Sandwich, Skull, Smartphone, SprayCan, Sprout, Tablet, Trees, Truck, Users, Video, Wind, Zap, type LucideIcon } from 'lucide-react';

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
  /** How far along it is, as on the Rusty Buns Playground: 1 Sketch, 2 Alpha, 3 Beta, 4 Solid. */
  stage?: Stage;
  /** The systems it plays best on, as on the Playground. */
  best?: readonly Device[];
  /** Release tag prefix of its desktop download on the RustyBuns repo, e.g. "fm-daw-v". */
  download?: string;
  /** Its folder under apps/ in the RustyBuns repo. */
  source?: string;
  /** eqosys's screenshot of it (RustyBuns apps/eqosys/public/cards, copied to public/shots/), shown on the hub cards. */
  shot?: string;
}

export type Stage = 1 | 2 | 3 | 4;
export const STAGES: Record<Stage, string> = { 1: 'Sketch', 2: 'Alpha', 3: 'Beta', 4: 'Solid' };

export type Device = 'phone' | 'tablet' | 'desktop' | 'gamepad';
export const DEVICES: Record<Device, { icon: LucideIcon; label: string }> = {
  phone: { icon: Smartphone, label: 'Best on phone' },
  tablet: { icon: Tablet, label: 'Best on tablet' },
  desktop: { icon: Monitor, label: 'Best on desktop' },
  gamepad: { icon: Gamepad2, label: 'Best with a controller' },
};

/** One hint for the landing feed, from what it plays best on: undefined when it names nothing. */
export function platformOf(e: Pick<PortalEntry, 'best'>): { icon: LucideIcon; label: string } | undefined {
  const phone = e.best?.includes('phone');
  const desktop = e.best?.includes('desktop');
  if (phone && desktop) return { icon: MonitorSmartphone, label: 'Phone & desktop' };
  if (phone) return DEVICES.phone;
  if (desktop) return DEVICES.desktop;
  return undefined;
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
    stage: 3,
    best: ['phone', 'tablet', 'desktop'],
    download: 'park-hide-seek-v',
    source: 'park-hide-seek',
    shot: '/shots/park-hide-seek.jpg',
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
    stage: 2,
    best: ['desktop'],
    source: 'skate-tech-park',
    shot: '/shots/skate-tech-park.jpg',
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
    stage: 2,
    best: ['desktop', 'gamepad'],
    source: 'git-recon',
    shot: '/shots/git-recon.jpg',
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
    stage: 2,
    best: ['desktop'],
    source: 'two-fronts',
    shot: '/shots/two-fronts.jpg',
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
    stage: 3,
    best: ['desktop'],
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
    stage: 2,
    best: ['phone', 'desktop'],
    download: 'splat-spray-v',
    source: 'splat-spray',
    shot: '/shots/splat-spray.jpg',
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
    stage: 2,
    best: ['phone', 'tablet', 'desktop'],
    source: 'excalibrawl',
  },
  {
    key: 'alien-disc-golf',
    group: 'rustybuns',
    icon: Disc3,
    glyph: '🥏',
    name: 'Alien Disc Golf',
    tag: 'Rusty Buns · Sports',
    href: 'https://alien-disc-golf.notryanquinn.workers.dev',
    status: 'live',
    verb: 'Throw',
    noun: 'Globe',
    stage: 2,
    best: ['desktop', 'gamepad'],
    source: 'alien-disc-golf',
    shot: '/shots/alien-disc-golf.jpg',
  },
  {
    key: 'hippo-tycoon',
    group: 'rustybuns',
    icon: Droplet,
    glyph: '🦛',
    name: 'Hippo Tycoon',
    tag: 'Rusty Buns · Party',
    href: `${RUSTY_BUNS_URL}/releases?q=hippo-tycoon-v&expanded=true`,
    status: 'live',
    verb: 'Chomp',
    noun: 'Oil',
    stage: 2,
    best: ['phone', 'tablet', 'desktop', 'gamepad'],
    download: 'hippo-tycoon-v',
    source: 'hippo-tycoon',
    shot: '/shots/hippo-tycoon.jpg',
  },
  {
    key: 'mythic-masters',
    group: 'rustybuns',
    icon: Skull,
    glyph: '🐉',
    name: 'Mythic Masters',
    tag: 'Rusty Buns · Brawler',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/mythic-masters`,
    status: 'soon',
    verb: 'Brawl',
    noun: 'Beast',
    stage: 1,
    best: ['desktop', 'gamepad'],
    source: 'mythic-masters',
    shot: '/shots/mythic-masters.jpg',
  },
  {
    key: 'delayed-reaction',
    group: 'rustybuns',
    icon: Music,
    glyph: '🎶',
    name: 'Delayed Reaction',
    tag: 'Rusty Buns · Rhythm',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/delayed-reaction`,
    status: 'soon',
    verb: 'Answer',
    noun: 'Beat',
    stage: 1,
    best: ['phone'],
    source: 'delayed-reaction',
    shot: '/shots/delayed-reaction.jpg',
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
    stage: 3,
    best: ['desktop'],
    source: 'codesplitter',
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
    stage: 3,
    best: ['desktop', 'tablet'],
    source: 'geoboxq',
    shot: '/shots/geoboxq.jpg',
  },
  {
    key: 'qcrm',
    group: 'products',
    icon: Users,
    glyph: '📇',
    name: 'qCRM',
    tag: 'CRM · qcrm.qntbr.com',
    tagline: 'The CRM your agents can use',
    description: 'Contacts, companies, deals and activities for a real place of business, with an MCP server built in. One Worker, one database, every row yours.',
    href: 'https://qcrm.qntbr.com',
    cta: 'Coming soon',
    status: 'soon',
    verb: 'Track',
    noun: 'Deals',
    shot: '/shots/qcrm.jpg',
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
  {
    key: 'fm-daw',
    group: 'workshop',
    icon: AudioWaveform,
    glyph: '🎛️',
    name: 'FM Groovebox',
    tag: 'Rusty Buns · Desktop',
    tagline: 'A twelve-track FM groovebox',
    description: 'A twelve-track FM groovebox with a drum machine, step sequencer, piano roll and reverb.',
    href: `${RUSTY_BUNS_URL}/releases?q=fm-daw-v&expanded=true`,
    cta: 'Download',
    status: 'live',
    verb: 'Jam',
    noun: 'Beats',
    stage: 2,
    best: ['desktop'],
    download: 'fm-daw-v',
    source: 'fm-daw',
  },
  {
    key: 'auto-rig',
    group: 'workshop',
    icon: PersonStanding,
    glyph: '🦴',
    name: 'Auto Rig',
    tag: 'Rusty Buns · 3D',
    tagline: 'The IK engine',
    description: 'Drop in a 3D model, get a skeleton, skin weights and inverse kinematics you can drag around, in Rust and TypeScript.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/auto-rig`,
    cta: 'Coming soon',
    status: 'soon',
    verb: 'Rig',
    noun: 'Model',
    stage: 2,
    best: ['desktop'],
    source: 'auto-rig',
  },
  {
    key: 'hello-world',
    group: 'workshop',
    icon: Hand,
    glyph: '👋',
    name: 'Hello World',
    tag: 'Rusty Buns · Starter',
    tagline: 'The smallest Rusty Buns app',
    description: 'One page, static assets only. Start here.',
    href: 'https://hello-world.notryanquinn.workers.dev',
    cta: 'Say hello',
    status: 'live',
    verb: 'Say',
    noun: 'Hello',
    stage: 4,
    best: ['phone', 'tablet', 'desktop'],
    source: 'hello-world',
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
  { key: 'products', title: 'Products', lede: 'Calls, a CRM, fulfillment and box puzzles.', noun: 'product' },
  { key: 'workshop', title: 'From the workshop', lede: 'Smaller Rusty Buns apps: a groovebox, a rigger, and the starter.', noun: 'app' },
  { key: 'account', title: 'Account', lede: 'One login for every game and app.', noun: 'service' },
  { key: 'backburner', title: 'Back burner', lede: 'Rusty Buns now covers most of what these set out to do.', noun: 'project' },
];

// The Game and App Center cards are QNTBR's copy of the Rusty Buns Playground (RustyBuns apps/playground/public/apps.json):
// keep stage, best and the links in step with that file.
export const PLAYGROUND_URL = 'https://rustybuns-playground.notryanquinn.workers.dev';

/** An entry's desktop release and source folder on the RustyBuns repo. */
export const downloadUrl = (e: Pick<PortalEntry, 'download'>) => e.download && `${RUSTY_BUNS_URL}/releases?q=${e.download}&expanded=true`;
export const sourceUrl = (e: Pick<PortalEntry, 'source'>) => e.source && `${RUSTY_BUNS_URL}/tree/main/apps/${e.source}`;

/** Each group with its entries, in group order; empty groups are dropped. */
export function groupEntries(entries: PortalEntry[], groups: PortalGroup[]) {
  return groups
    .map((group) => ({ group, entries: entries.filter((e) => e.group === group.key) }))
    .filter((g) => g.entries.length > 0);
}

export function isExternal(href: string): boolean {
  return href.startsWith('http');
}
