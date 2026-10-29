// @/app/pages/portal/portalData.ts
// Single source of truth for the QNTBR portal: the three sections on the
// landing page (Products, Game Center, App Center) and the /games + /apps hubs.

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
  /** Accent used for the card bevel / glow. */
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
];

// ──────────────────────────────────────────────────────────────
// App Center — the businessy stuff
// ──────────────────────────────────────────────────────────────
export const apps: PortalEntry[] = [
  {
    key: 'qlave',
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
    glyph: '⚡',
    name: 'Staticflare',
    tag: 'Hosting · Edge',
    tagline: 'Static hosting',
    description: 'Deploy static sites to the edge in one command. Any TypeScript app with a build step can ship.',
    href: 'https://staticflare.dev',
    cta: 'Coming soon',
    status: 'soon',
    accent: '#52525b',
  },
  {
    key: 'shippycloud',
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
    glyph: '🔑',
    name: 'Q Auth',
    tag: 'Account · SSO',
    tagline: 'One account for everything',
    description: 'Email + password, organizations, and API keys. One QNTBR login is the plan for every game and app in the portal.',
    href: '/user/login',
    cta: 'Sign in',
    status: 'beta',
    accent: '#fafafa',
  },
];

/** Resolve placeholder hrefs (currently just the sandbox) against the request. */
export function resolveHref(entry: PortalEntry, request: Request): string {
  if (entry.href === '__SANDBOX__') return getSandboxUrl(request);
  return entry.href;
}

export function isExternal(href: string): boolean {
  return href.startsWith('http');
}
