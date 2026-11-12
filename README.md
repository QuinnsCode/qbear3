# QNTBR

A Magic: The Gathering virtual tabletop for Commander multiplayer, at [qntbr.com](https://qntbr.com).
It runs on Cloudflare Workers, with one Durable Object per game room holding the state and
broadcasting it to every player over WebSocket.

**Stack**: RedwoodSDK (rwsdk), React 19, TypeScript, Cloudflare Workers and Durable Objects,
Prisma on D1, Vite 7, Tailwind CSS 4, better-auth.

## Run it

```bash
pnpm install
pnpm run generate     # Prisma client, wrangler types, env files
pnpm run migrate:dev  # apply migrations to the local D1
pnpm run dev          # http://localhost:5173
```

Before pushing: `pnpm run check` (generate + typecheck). Tests are `bun test` over HTTP, no browser:
`bun test tests/e2e/portal.test.ts` runs one file, and CI runs the whole suite.

## Where things are

| Path | What lives there |
|------|------------------|
| `src/worker.tsx` | Worker entry: middleware chain, routes, Durable Object exports |
| `src/app/pages/` | Pages and their routes, one folder per section |
| `src/app/components/` | React components (server by default, `"use client"` where marked) |
| `src/app/serverActions/` | Server functions that call the Durable Objects |
| `src/app/services/` | Game logic (card game managers, strategy game, draft) |
| `src/app/data/` | Static data bundled with the Worker (starter deck, vintage cube) |
| `src/durableObjects/` | Every Durable Object except the session one (`src/session/`) |
| `src/lib/` | Auth, middleware, subdomains, email and other shared plumbing |
| `content/` | Landing page and Game Center copy, edited with `pnpm run cms` |
| `packages/ui/` | `@qntbr/ui`, the shared component package |
| `prisma/`, `migrations/` | Schema and D1 migrations |
| `tests/e2e/` | End-to-end suite |
| `scripts/` | Dev scripts run with Bun |
| `docs/` | Reference notes; `docs/archive/` holds old plans and status logs |

## More

- [CLAUDE.md](CLAUDE.md): architecture, commands and conventions.
- [AGENTS.md](AGENTS.md): how to change this repo (tests, secrets, pull requests).
- [docs/](docs/): reference notes and the archive.
