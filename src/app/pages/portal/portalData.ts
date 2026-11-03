// @/app/pages/portal/portalData.ts
// Single source of truth for the QNTBR portal: the three sections on the
// landing page (Products, Game Center, App Center) and the /games + /apps hubs.

import { AtSign, AudioWaveform, Box, Brush, Building2, CircuitBoard, Crosshair, Disc3, Droplet, Flame, FlaskConical, Gamepad2, GitBranch, Hand, Handshake, KeyRound, Layers, LayoutGrid, Mic, Monitor, MonitorSmartphone, Music, Package, PersonStanding, Piano, Rocket, Sandwich, ScanSearch, Shapes, ShoppingCart, Skull, Smartphone, Sparkles, SprayCan, Sprout, Tablet, Trees, Truck, Video, Wind, Zap, type LucideIcon } from 'lucide-react';

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
  /** A word on the hub card beside its links, e.g. "Proof of concept". A 'soon' entry shows its cta here instead. */
  note?: string;
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
export const PLAYGROUND_URL = 'https://rustybuns-playground.notryanquinn.workers.dev';
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
  {
    key: 'splat-rooms',
    group: 'rustybuns',
    icon: ScanSearch,
    glyph: '🔦',
    name: 'Splat Rooms',
    tag: 'Rusty Buns · Hunt',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/splat-rooms`,
    status: 'soon',
    verb: 'Hunt',
    noun: 'Room',
    stage: 1,
    best: ['desktop'],
    source: 'splat-rooms',
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
    key: 'qcrm',
    group: 'commerce',
    icon: Handshake,
    glyph: '🤝',
    name: 'qCRM',
    tag: 'Proof of concept · CRM',
    tagline: 'The CRM your agents can use',
    description: 'Contacts, companies, deals and activities, with an MCP server built in, signed webhooks, office sync and every row yours to export. One Worker, one D1 database.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/qcrm`,
    cta: 'Source',
    status: 'beta',
    verb: 'Track',
    noun: 'Deals',
    best: ['desktop'],
    source: 'qcrm',
    shot: '/shots/qcrm.jpg',
    note: 'Proof of concept',
  },
  {
    key: 'geoboxq-shopify',
    group: 'commerce',
    icon: ShoppingCart,
    glyph: '🛒',
    name: 'GeoBoxQ for Shopify',
    tag: 'Shopify · Packing',
    tagline: 'A Shopify cart in, the store’s own box out',
    description: 'Takes a cart or a draft order, looks up each variant’s size and answers with the smallest box from the store’s own set.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/geoboxq-shopify`,
    cta: 'Source',
    status: 'beta',
    verb: 'Pack',
    noun: 'Cart',
    source: 'geoboxq-shopify',
  },
  {
    key: 'playground',
    group: 'dev',
    icon: LayoutGrid,
    glyph: '🛝',
    name: 'Rusty Buns Playground',
    tag: 'Rusty Buns · Showcase',
    tagline: 'Every Rusty Buns app on one page',
    description: 'The shelf this one is copied from: each app’s stage, what it plays best on, and Play, Download or Source.',
    href: PLAYGROUND_URL,
    cta: 'Open the Playground',
    status: 'live',
    verb: 'Try',
    noun: 'Apps',
  },
  {
    key: 'frameworks',
    group: 'dev',
    icon: Layers,
    glyph: '🧱',
    name: 'Framework examples',
    tag: 'Rusty Buns · Examples',
    tagline: 'Your framework, packed',
    description: 'Astro, Next.js, Nuxt, SvelteKit, SolidStart, Qwik, TanStack Start, React Router, Hono, Elysia and plain SPAs, each one running on Rusty Buns.',
    href: `${RUSTY_BUNS_URL}/blob/main/FRAMEWORKS.md`,
    cta: 'See the list',
    status: 'live',
    verb: 'Port',
    noun: 'Framework',
  },
  {
    key: 'borg',
    group: 'dev',
    icon: FlaskConical,
    glyph: '🧪',
    name: 'borg',
    tag: 'Rusty Buns · Test rig',
    tagline: 'The twins behave like Cloudflare',
    description: 'One small Worker that uses every binding once, checked by the same suite on the desktop host and on a deploy. Its Postgres sibling runs on PGlite and Hyperdrive.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/borg`,
    cta: 'Source',
    status: 'live',
    verb: 'Test',
    noun: 'Twins',
    source: 'borg',
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
    group: 'commerce',
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
    key: 'flareup',
    image: '/landing/flareup.jpg',
    group: 'products',
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
    group: 'products',
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
    group: 'commerce',
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
  {
    key: 'motion-midi',
    group: 'workshop',
    icon: Piano,
    glyph: '🎹',
    name: 'Motion MIDI',
    tag: 'Rusty Buns · Rust',
    tagline: 'One synth, written twice',
    description: 'A synth in Rust and in TypeScript inside one downloadable app, checked sample by sample, with the TypeScript one as the fallback.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/motion-midi`,
    cta: 'Source',
    status: 'live',
    verb: 'Render',
    noun: 'Synth',
    best: ['desktop'],
    source: 'motion-midi',
  },
  {
    key: 'meshy-studio',
    group: 'workshop',
    icon: Shapes,
    glyph: '🗿',
    name: 'Meshy Batch Studio',
    tag: 'Rusty Buns · Desktop',
    tagline: 'Concept art in, game-ready models out',
    description: 'A folder of labelled images or prompts goes to Meshy with your own key; scaled, centred .glb files come back, with texturing, rigging and animation a step away.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/meshy-studio`,
    cta: 'Source',
    status: 'live',
    verb: 'Mesh',
    noun: 'Images',
    best: ['desktop'],
    source: 'meshy-studio',
  },
  {
    key: 'splat-desktop',
    group: 'workshop',
    icon: Sparkles,
    glyph: '✨',
    name: 'Splat Desktop',
    tag: 'Rusty Buns · Desktop',
    tagline: 'SuperSplat on your own disk',
    description: 'PlayCanvas’ open-source Gaussian-splat editor as one desktop file that works on a folder of scenes. Next: phone video in, 3D scene out, trained on your GPU.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/splat-desktop`,
    cta: 'Source',
    status: 'live',
    verb: 'Edit',
    noun: 'Splats',
    best: ['desktop'],
    source: 'splat-desktop',
  },
  {
    key: 'tscircuit-desktop',
    group: 'workshop',
    icon: CircuitBoard,
    glyph: '🔌',
    name: 'tscircuit Desktop',
    tag: 'Rusty Buns · Desktop',
    tagline: 'Circuit boards, one file, a Rust engine',
    description: 'tscircuit’s circuit editor as one desktop file, with a Rust engine up to 22x faster. It works; parked until tscircuit updates its own dependencies.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/tscircuit-desktop`,
    cta: 'Parked for now',
    status: 'soon',
    verb: 'Wire',
    noun: 'Circuit',
    stage: 2,
    best: ['desktop'],
    source: 'tscircuit-desktop',
  },
  {
    key: 'agent-office',
    group: 'workshop',
    icon: Building2,
    glyph: '🥐',
    name: 'Agent Office',
    tag: 'Rusty Buns · Desktop',
    tagline: 'The 3D office for coding agents, as one file',
    description: 'Someone else’s Node server, PTYs, WebSockets and a 3D client, turned into one file for Mac and Linux with nothing forked.',
    href: `${RUSTY_BUNS_URL}/releases/tag/agent-office-latest`,
    cta: 'Download',
    status: 'live',
    verb: 'Seat',
    noun: 'Agents',
    best: ['desktop'],
    source: 'agent-office',
  },
  {
    key: 'at-lens',
    group: 'workshop',
    icon: AtSign,
    glyph: '🦋',
    name: 'AT Lens',
    tag: 'Rusty Buns · Bluesky',
    tagline: 'Watch the AT Protocol work',
    description: 'Type a handle and walk it to a DID, a data server and typed records, then watch the account live on the firehose and write a record of your own.',
    href: `${RUSTY_BUNS_URL}/tree/main/apps/at-lens`,
    cta: 'Source',
    status: 'live',
    verb: 'Trace',
    noun: 'Handle',
    best: ['phone', 'desktop'],
    source: 'at-lens',
  },
  {
    key: 'what-would-fantano-say',
    group: 'workshop',
    icon: Mic,
    glyph: '🎤',
    name: 'What Would Fantano Say?',
    tag: 'Rusty Buns · Parody',
    tagline: 'A parody review of your best 15 seconds',
    description: 'Pick a track, drag to your best 15 seconds and get a score and a verdict. The phone does the listening; one Workers AI call does the judging.',
    href: 'https://what-would-fantano-say.notryanquinn.workers.dev',
    cta: 'Get reviewed',
    status: 'live',
    verb: 'Review',
    noun: 'Track',
    best: ['phone'],
    source: 'what-would-fantano-say',
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
  { key: 'dev', title: 'Developer tools', lede: 'The code host for agents, the open-source runtime it ships on, and the shelf of everything built with it.', noun: 'tool' },
  { key: 'commerce', title: 'Commerce & fulfillment', lede: 'A CRM, packing, Shopify and fulfillment: the pieces behind our warehouse, 3PL and drop-shipping work.', noun: 'app' },
  { key: 'products', title: 'Products', lede: 'Qlave for calls, Flareup for Cloudflare spend, Staticflare for hosting.', noun: 'product' },
  { key: 'workshop', title: 'From the workshop', lede: 'Smaller Rusty Buns apps: music, 3D, circuits, protocols and a parody critic.', noun: 'app' },
  { key: 'account', title: 'Account', lede: 'One login for every game and app.', noun: 'service' },
];

// The Game and App Center cards are QNTBR's copy of the Rusty Buns Playground (RustyBuns apps/playground/public/apps.json):
// keep stage, best and the links in step with that file.

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
