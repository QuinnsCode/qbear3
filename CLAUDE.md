# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QNTBR is a Magic: The Gathering (MTG) virtual tabletop for Commander format multiplayer gameplay, built on Cloudflare Workers with Durable Objects for real-time serverless multiplayer.

**Stack**: RedwoodSDK (rwsdk), React 19, TypeScript, Cloudflare Workers, Durable Objects, Prisma with D1 (SQLite), Vite 7, Tailwind CSS 4, better-auth

**Domain**: qntbr.com with subdomain-based multi-tenancy (`{org}.qntbr.com`)

## Common Commands

```bash
pnpm install              # Install dependencies
npm run dev               # Local dev server (localhost:5173)
npm run build             # Production build (Vite)
npm run check             # Generate Prisma client + wrangler types + tsc
npm run types             # TypeScript type checking only
npm run generate          # Generate Prisma client + wrangler types
npm run migrate:dev       # Apply migrations locally
npm run migrate:prd       # Apply migrations to production D1
npm run migrate:new       # Create new migration
npm run seed              # Run seed script
npm run release           # Full production deploy (generate + build + wrangler deploy)
```

## Architecture

### RedwoodSDK Framework

This uses RedwoodSDK (`rwsdk`), a full-stack framework for Cloudflare Workers. Key patterns:

- **Entry point**: `src/worker.tsx` — uses `defineApp()` with middleware chain, then `render(Document, [...routes])`
- **Routing**: `route()`, `prefix()`, `render()` from `rwsdk/router`. Routes are co-located in `src/app/pages/<section>/routes.ts`
- **Server Components**: Default. All components are RSC unless marked `"use client"`
- **Server Functions**: Files marked `"use server"` — callable from client components, access context via `requestInfo` from `rwsdk/worker`
- **Interruptors**: Middleware functions in route arrays that can short-circuit with a Response or augment `ctx`

### Durable Objects — One Per Game Room

Each game instance lives in its own Durable Object. The DO is the single source of truth for game state and broadcasts updates via WebSocket to all connected players.

| DO | Binding | File | Purpose |
|----|---------|------|---------|
| `CardGameDO` | `CARD_GAME_STATE_DO` | `src/cardGameDurableObject.ts` | MTG card game state |
| `GameStateDO` | `GAME_STATE_DO` | `src/gameDurableObject.ts` | Risk-style strategy game |
| `DraftDO` | `DRAFT_DO` | `src/draftDurableObject.ts` | MTG draft system |
| `CardCacheDO` | `CARD_CACHE_DO` | `src/cardCacheDO.ts` | Scryfall card data cache |
| `SyncedStateServer` | `SYNCED_STATE_SERVER` | rwsdk built-in | General state sync |
| `SessionDurableObject` | `SESSION_DURABLE_OBJECT` | `src/session/durableObject.ts` | Session management |
| `PresenceDurableObject` | `REALTIME_DURABLE_OBJECT` | `src/durableObjects/presenceDurableObject.ts` | User presence |

### Real-time Flow

```
Browser (React + WebSocket)
    ↕ WebSocket via /__cgsync, /__gsync, /__draftsync
Durable Object (game state + broadcasting)
    ↕ HTTP fetch for initial state / server actions
Worker (src/worker.tsx — routing + middleware)
```

1. **SSR**: Server component fetches initial state from DO, renders HTML
2. **Hydration**: Client connects WebSocket via `useCardGameSync` hook
3. **Sync**: Actions sent over WebSocket → DO applies → broadcasts to all clients
4. **Reconnect**: Auto-retry with exponential backoff (10 attempts)

### WebSocket Routes

- `/__cgsync` — Card game sync (rate limited)
- `/__gsync` — Strategy game sync (rate limited)
- `/__draftsync` — Draft system sync (rate limited, with guest auth middleware)
- `/__realtime` — Presence/realtime features

### Server Actions Pattern

Thin wrappers that call Durable Objects via `env.CARD_GAME_STATE_DO.idFromName(gameId)`:

- `src/app/serverActions/cardGame/` — Card game CRUD + registry
- `src/app/serverActions/game/` — Strategy game actions
- `src/app/serverActions/draft/` — Draft actions
- `src/app/serverActions/scryfall/` — MTG card data lookups

### Service Layer (Business Logic)

Card game logic is organized into managers in `src/app/services/cardGame/managers/`:
- `CardManager.ts` — Card operations (move, tap, flip)
- `ZoneManager.ts` — Zone transfers (hand, battlefield, graveyard, etc.)
- `DeckImportManager.ts` — Deck list parsing and import
- `TokenManager.ts` — Token creation
- `SandboxManager.ts` — Sandbox mode logic

Game state types are defined in `src/app/services/cardGame/CardGameState.ts`.

### Authentication & Multi-Tenancy

- **better-auth** for email/password login, organizations, API keys
- **Subdomains**: `{org}.qntbr.com` mapped to organizations via middleware
- **Sandbox mode**: Unauthenticated play on `sandbox.qntbr.com` with a hardcoded game ID
- **Context** populated by middleware: `ctx.session`, `ctx.user`, `ctx.organization`, `ctx.userRole`, `ctx.orgError`

### Database

- **Prisma** with D1 adapter (SQLite on Cloudflare)
- Schema at `prisma/schema.prisma`, generated output at `generated/prisma/`
- Migrations in `migrations/` directory (SQL files)
- `setupDb(env)` must be called before DB access (done in middleware)
- Path alias: `@generated/*` → `./generated/*`

### Cloudflare Bindings (wrangler.jsonc)

- **D1**: `DB` — Main database
- **KV**: `GAME_REGISTRY_KV`, `CARD_GAME_REGISTRY_KV`, `DECKS_KV`, `RATELIMIT_KV`
- **Durable Objects**: See table above
- **Assets**: `ASSETS` (public directory)

## Key Conventions

- **Path aliases**: `@/*` → `src/*`, `@generated/*` → `generated/*`
- **Package manager**: pnpm (10.11.0)
- **TypeScript strict mode** enabled
- **React 19** with Server Components — components are server by default
- **Client components** must have `"use client"` directive
- **Server functions** must have `"use server"` directive
- Server function context: `import { requestInfo } from "rwsdk/worker"` then `const { ctx } = requestInfo`
- DO communication: `env.{BINDING}.idFromName(id)` → `.get(id)` → `.fetch(new Request('https://fake-host/', ...))`
- Prefer Web APIs over external dependencies (fetch over axios, native WebSocket over ws)
