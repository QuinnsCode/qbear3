// @/app/pages/portal/portalData.ts
// Single source of truth for the QNTBR portal: the three sections on the
// landing page (Products, Game Center, App Center) and the /games + /apps hubs.

import { AudioWaveform, Bot, Box, Brush, Cog, Crosshair, Droplet, Earth, FileText, Flame, GitBranch, Globe, Hand, KeyRound, Landmark, Layers, MessagesSquare, MonitorDown, Music, Package, PersonStanding, Rocket, Sandwich, Sparkles, SprayCan, Sprout, Swords, TreePalm, Trees, Truck, Users, Video, Wifi, Wind, Zap, type LucideIcon } from 'lucide-react';

export type PortalStatus = 'live' | 'beta' | 'soon';

export interface PortalEntry {
  key: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  cta: string;
  status: PortalStatus;
  /** Requires a QNTBR account (Q auth) to use. */
  requiresAuth?: boolean;
  /** Which group card this entry sits in on its hub (see gameGroups / appGroups). */
  group: string;
  /** Icon shown in the card's preview window. */
  icon: LucideIcon;
  /** Screenshot that replaces the icon in the preview window, when there is one. */
  image?: string;
  /** Tints the card's preview window. */
  accent: string;
  /** Emoji shown on the craft canvas tile. */
  glyph?: string;
  /** Short mono tag shown above the name, e.g. "MTG" or "GitHub". */
  tag?: string;
}

export const GITHUB_ORG_URL = 'https://github.com/QuinnsCode';
export const RUSTY_BUNS_URL = 'https://github.com/QuinnsCode/RustyBuns';
export const SANDBOX_HOST = 'sandbox.qntbr.com';

/**
 * Sandbox lives on its own subdomain. On localhost the Playwright/dev setup
 * reaches it through nip.io, so build the URL from the request host.
 */
export function getSandboxUrl(request: Request): string {
  const url = new URL(request.url);
  if (url.hostname.includes('localhost') || url.hostname.includes('nip.io')) {
    return `${url.protocol}//sandbox.127.0.0.1.nip.io:${url.port || '5173'}/`;
  }
  return `https://${SANDBOX_HOST}/`;
}

// ──────────────────────────────────────────────────────────────
// Game Center — everything you can play
// ──────────────────────────────────────────────────────────────
export const games: PortalEntry[] = [
  {
    key: 'sanctum',
    group: 'mtg',
    icon: Landmark,
    glyph: '🏛️',
    name: 'Sanctum',
    tag: 'MTG · Commander',
    tagline: 'Your game hub',
    description: 'Create card games, manage your pod, track decks, and jump into live tables. The home base for everything QVTT.',
    href: '/sanctum',
    cta: 'Enter the Sanctum',
    status: 'live',
    requiresAuth: true,
    accent: '#22c55e',
  },
  {
    key: 'sandbox',
    group: 'mtg',
    icon: TreePalm,
    glyph: '🏖️',
    name: 'Sandbox',
    tag: 'MTG · No account',
    tagline: 'Play instantly',
    description: 'A shared, always-on table. No login, no setup. Pick a starter deck and start slinging spells in seconds.',
    href: '__SANDBOX__',
    cta: 'Jump in',
    status: 'live',
    accent: '#f59e0b',
  },
  {
    key: 'pvp',
    group: 'mtg',
    icon: Swords,
    glyph: '⚔️',
    name: 'PVP Draft Arena',
    tag: 'MTG · Draft',
    tagline: 'Draft, then duel',
    description: 'Draft against AI opponents, then get matched into PVP with your freshly drafted deck. Regional matchmaking keeps it snappy.',
    href: '/pvp',
    cta: 'Enter the Arena',
    status: 'beta',
    requiresAuth: true,
    accent: '#ef4444',
  },
  {
    key: 'draft',
    group: 'mtg',
    icon: Package,
    glyph: '📦',
    name: 'Draft Lobby',
    tag: 'MTG · Draft',
    tagline: 'Booster draft with friends',
    description: 'Spin up a draft room, share the link, and pick packs together in real time. Drafted decks save straight to your deck list.',
    href: '/draft/new',
    cta: 'Start a draft',
    status: 'live',
    requiresAuth: true,
    accent: '#a855f7',
  },
  {
    key: 'deckbuilder',
    group: 'mtg',
    icon: Layers,
    glyph: '🃏',
    name: 'Deck Builder',
    tag: 'MTG · Tools',
    tagline: 'Build and import decks',
    description: 'Paste a list, pull cards from Scryfall, and keep every deck ready for the table. Works with Commander, 60-card, and drafted decks.',
    href: '/deckbuilder',
    cta: 'Open the builder',
    status: 'live',
    requiresAuth: true,
    accent: '#3b82f6',
  },
  {
    key: 'strategy',
    group: 'tables',
    icon: Earth,
    glyph: '🌍',
    name: 'World Conquest',
    tag: 'Strategy · Multiplayer',
    tagline: 'Territory strategy game',
    description: 'A Risk-style map game with real-time turns, powered by the same Durable Object engine as the card tables.',
    href: '/game',
    cta: 'New game',
    status: 'beta',
    requiresAuth: true,
    accent: '#c2410c',
  },
  {
    key: 'community',
    group: 'tables',
    icon: MessagesSquare,
    glyph: '💬',
    name: 'Community',
    tag: 'Social',
    tagline: 'Find a pod',
    description: 'Friends, game invites, and Discord. Meet other players and get a seat at a table.',
    href: '/community',
    cta: 'Say hello',
    status: 'live',
    accent: '#14b8a6',
  },
  {
    key: 'park-hide-seek',
    group: 'rustybuns',
    icon: Trees,
    glyph: '🌲',
    name: 'Park Hide & Seek',
    tag: 'Rusty Buns · 3D',
    tagline: 'Hide and seek on real terrain',
    description: '3D hide and seek on real Yosemite terrain. Each player is sent only what they can see.',
    href: 'https://park-hide-seek.notryanquinn.workers.dev',
    cta: 'Play now',
    status: 'live',
    accent: '#16a34a',
  },
  {
    key: 'skate-tech-park',
    group: 'rustybuns',
    icon: Wind,
    glyph: '🛹',
    name: 'Skate Tech Park',
    tag: 'Rusty Buns · Multiplayer',
    tagline: 'Giant fingerboard park',
    description: 'A giant riderless fingerboard on park terrain, up to four riders.',
    href: 'https://skatetechpark.notryanquinn.workers.dev',
    cta: 'Play now',
    status: 'live',
    accent: '#eab308',
  },
  {
    key: 'druids-curse',
    group: 'rustybuns',
    icon: Sprout,
    glyph: '🌿',
    name: 'Druids Curse',
    tag: 'Rusty Buns · Multiplayer',
    tagline: 'The game Rusty Buns was built for',
    description: 'The live multiplayer game Rusty Buns was first built for.',
    href: 'https://druids-curse-votv.notryanquinn.workers.dev',
    cta: 'Play now',
    status: 'live',
    accent: '#15803d',
  },
  {
    key: 'splat-spray',
    group: 'rustybuns',
    icon: SprayCan,
    glyph: '🎨',
    name: 'Splat Spray',
    tag: 'Rusty Buns · Puzzle',
    tagline: 'I-spy in the dark',
    description: 'Scan a Gaussian-splat room and find 100 things in the fewest shots.',
    href: 'https://splat-spray.notryanquinn.workers.dev',
    cta: 'Play now',
    status: 'live',
    accent: '#ec4899',
  },
  {
    key: 'two-fronts',
    group: 'rustybuns',
    icon: Rocket,
    glyph: '🚀',
    name: 'Two Fronts',
    tag: 'Rusty Buns · Strategy',
    tagline: 'War on a forest moon',
    description: 'Turn-based strategy on a forest moon, with three.js battles on the ground and in orbit.',
    href: 'https://two-fronts.notryanquinn.workers.dev',
    cta: 'Play now',
    status: 'live',
    accent: '#2563eb',
  },
  {
    key: 'git-recon',
    group: 'rustybuns',
    icon: Crosshair,
    glyph: '🔫',
    name: 'git-recon',
    tag: 'Rusty Buns · Shooter',
    tagline: 'Your repo is the level',
    description: 'A toy-soldier shooter fought in a codebase: folders become compounds and files become buildings.',
    href: 'https://git-recon.notryanquinn.workers.dev',
    cta: 'Play now',
    status: 'live',
    accent: '#78716c',
  },
  {
    key: 'excalibrawl',
    group: 'rustybuns',
    icon: Brush,
    glyph: '🖍️',
    name: 'Excalibrawl',
    tag: 'Rusty Buns · AI',
    tagline: 'Models draw, a third judges',
    description: 'An hourly drawing fight between two models, refereed by a third.',
    href: 'https://excalibrawl.notryanquinn.workers.dev',
    cta: 'Watch a fight',
    status: 'live',
    accent: '#8b5cf6',
  },
];

// ──────────────────────────────────────────────────────────────
// App Center — the businessy stuff
// ──────────────────────────────────────────────────────────────
export const apps: PortalEntry[] = [
  {
    key: 'codesplitter',
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
    accent: '#0891b2',
  },
  {
    key: 'qlave',
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
    accent: '#7c3aed',
  },
  {
    key: 'flareup',
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
    accent: '#dc2626',
  },
  {
    key: 'rustybuns',
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
    accent: '#f97316',
  },
  {
    key: 'staticflare',
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
    accent: '#52525b',
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
    cta: 'View on GitHub',
    status: 'beta',
    accent: '#0ea5e9',
  },
  {
    key: 'qauth',
    group: 'account',
    icon: KeyRound,
    glyph: '🔑',
    name: 'Q Auth',
    tag: 'Account · SSO',
    tagline: 'One account for everything',
    description: 'Email + password, organizations, and API keys. One QNTBR login is the plan for every game and app in the portal.',
    href: '/user/login',
    cta: 'Sign in',
    status: 'beta',
    accent: '#71717a',
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

export const gameGroups: PortalGroup[] = [
  { key: 'rustybuns', title: 'Built with Rusty Buns', lede: 'Games shipped on Rusty Buns, each running on its own Worker.', noun: 'game' },
  { key: 'mtg', title: 'Magic: The Gathering', lede: 'The original QNTBR tables: Commander, drafts, decks, and a sandbox that never closes.', noun: 'table' },
  { key: 'tables', title: 'Strategy & social', lede: 'A territory map on the same engine, and a place to find your pod.', noun: 'space' },
];

export const appGroups: PortalGroup[] = [
  { key: 'dev', title: 'Developer tools', lede: 'The code host for agents, and the open-source runtime it ships on.', noun: 'tool' },
  { key: 'products', title: 'Products', lede: 'Calls and fulfillment.', noun: 'product' },
  { key: 'account', title: 'Account', lede: 'One login for every game and app.', noun: 'service' },
  { key: 'backburner', title: 'Back burner', lede: 'Rusty Buns now covers most of what these set out to do.', noun: 'project' },
];

// ──────────────────────────────────────────────────────────────
// Rusty Buns Playground — every app in the RustyBuns repo's apps/playground/public/apps.json,
// one full-width row each in the Rusty Buns drawer. Keep it in step with that file.
// ──────────────────────────────────────────────────────────────
export const PLAYGROUND_URL = 'https://rustybuns-playground.notryanquinn.workers.dev';

export type AppTagKey = 'eqosys' | 'browser' | 'desktop' | 'multiplayer' | 'lan' | '3d' | 'ai' | 'agents' | 'rust' | 'audio' | 'static';

/** What an app is, shown as a small colored icon and a word. */
export const appTags: Record<AppTagKey, { label: string; icon: LucideIcon; color: string }> = {
  eqosys: { label: 'eqosys account', icon: KeyRound, color: '#e8590c' },
  browser: { label: 'Plays in the browser', icon: Globe, color: '#2563eb' },
  desktop: { label: 'Desktop download', icon: MonitorDown, color: '#64748b' },
  multiplayer: { label: 'Multiplayer', icon: Users, color: '#16a34a' },
  lan: { label: 'LAN', icon: Wifi, color: '#0891b2' },
  '3d': { label: '3D', icon: Box, color: '#a855f7' },
  ai: { label: 'AI models', icon: Sparkles, color: '#ec4899' },
  agents: { label: 'For agents', icon: Bot, color: '#0ea5e9' },
  rust: { label: 'Rust inside', icon: Cog, color: '#c2410c' },
  audio: { label: 'Audio', icon: Music, color: '#eab308' },
  static: { label: 'Static only', icon: FileText, color: '#78716c' },
};

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
  accent: string;
  /** Each one read off the app's README ("What it proves") or apps.json, plus eqosys's apps.ts. */
  tags: AppTagKey[];
}

export const playgroundApps: PlaygroundApp[] = [
  { key: 'park-hide-seek', name: 'Park Hide & Seek', line: '3D hide and seek on real Yosemite terrain; each player is sent only what they can see.', play: 'https://park-hide-seek.notryanquinn.workers.dev', download: 'park-hide-seek-v', source: 'park-hide-seek', icon: Trees, accent: '#16a34a', tags: ['eqosys', 'browser', 'desktop', 'multiplayer', 'lan', '3d'] },
  { key: 'skate-tech-park', name: 'Skate Tech Park', line: 'A giant riderless fingerboard on park terrain, up to four riders.', play: 'https://skatetechpark.notryanquinn.workers.dev', source: 'skate-tech-park', icon: Wind, accent: '#eab308', tags: ['browser', 'multiplayer', '3d'] },
  { key: 'druids-curse', name: 'Druids Curse', line: 'The live multiplayer game Rusty Buns was first built for.', play: 'https://druids-curse-votv.notryanquinn.workers.dev', icon: Sprout, accent: '#15803d', tags: ['browser', 'multiplayer'] },
  { key: 'codesplitter', name: 'codeSplitter', line: 'A code host for agents: every line a record, real git on Cloudflare Artifacts.', play: 'https://codesplitter.notryanquinn.workers.dev', source: 'codesplitter', icon: GitBranch, accent: '#0891b2', tags: ['browser', 'agents'] },
  { key: 'excalibrawl', name: 'Excalibrawl', line: 'An hourly drawing fight between two models, refereed by a third.', play: 'https://excalibrawl.notryanquinn.workers.dev', source: 'excalibrawl', icon: Brush, accent: '#8b5cf6', tags: ['browser', 'ai'] },
  { key: 'hippo-tycoon', name: 'Hippo Tycoon', line: 'Four greedy oil-baron hippos race to chomp the most oil from a jungle geyser; solo, couch, LAN or online.', download: 'hippo-tycoon-v', source: 'hippo-tycoon', icon: Droplet, accent: '#a16207', tags: ['desktop', 'multiplayer', 'lan'] },
  { key: 'fm-daw', name: 'FM Groovebox', line: 'A twelve-track FM groovebox with a drum machine, step sequencer, piano roll and reverb.', download: 'fm-daw-v', source: 'fm-daw', icon: AudioWaveform, accent: '#d946ef', tags: ['desktop', 'audio', 'rust'] },
  { key: 'splat-spray', name: 'Splat Spray', line: 'An I-spy game in the dark: scan a Gaussian-splat room and find 100 things in the fewest shots.', play: 'https://splat-spray.notryanquinn.workers.dev', download: 'splat-spray-v', source: 'splat-spray', icon: SprayCan, accent: '#ec4899', tags: ['browser', 'desktop', '3d'] },
  { key: 'two-fronts', name: 'Two Fronts', line: 'Turn-based strategy on a forest moon, with three.js battles on the ground and in orbit.', play: 'https://two-fronts.notryanquinn.workers.dev', source: 'two-fronts', icon: Rocket, accent: '#2563eb', tags: ['browser', 'multiplayer', '3d'] },
  { key: 'git-recon', name: 'git-recon', line: 'A toy-soldier shooter fought in a codebase: the repo is the level.', play: 'https://git-recon.notryanquinn.workers.dev', source: 'git-recon', icon: Crosshair, accent: '#78716c', tags: ['browser', 'multiplayer', 'lan', '3d'] },
  { key: 'auto-rig', name: 'Auto Rig', line: 'Drop in a 3D model, get a skeleton, skin weights and inverse kinematics you can drag around.', source: 'auto-rig', icon: PersonStanding, accent: '#64748b', tags: ['3d', 'rust'] },
  { key: 'hello-world', name: 'Hello World', line: 'The smallest Rusty Buns app: one page, static assets only.', play: 'https://hello-world.notryanquinn.workers.dev', source: 'hello-world', icon: Hand, accent: '#f97316', tags: ['browser', 'static'] },
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

/** Resolve placeholder hrefs (currently just the sandbox) against the request. */
export function resolveHref(entry: PortalEntry, request: Request): string {
  if (entry.href === '__SANDBOX__') return getSandboxUrl(request);
  return entry.href;
}

export function isExternal(href: string): boolean {
  return href.startsWith('http');
}
