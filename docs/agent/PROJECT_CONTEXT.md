# Lobby Matchmaking System - Project Context

## Overview
Implementing a 1v1 cube draft lobby system where players:
1. Create/join lobbies (UUID-based, unguessable URLs)
2. Draft independently vs 3 AI opponents
3. Battle each other with drafted decks (Best-of-1)
4. Optionally rematch with sideboarding

## Tech Stack
- **Framework**: RWSDK (RedwoodJS SDK for Cloudflare) + Vite
- **Database**: Prisma + D1 (Cloudflare's SQLite)
- **Real-time**: Cloudflare Durable Objects + WebSockets
- **Styling**: Tailwind CSS (minimal for Phase 1)
- **Runtime**: Cloudflare Workers
- **Routing**: rwsdk/router (`route()`, `prefix()`, `render()`)

### RWSDK Commands Reference
```bash
pnpm dev          # Local development with Vite
pnpm build        # Build for production
pnpm release      # Build + Deploy to Cloudflare
pnpm migrate:dev  # Apply migrations to local D1
pnpm migrate:prd  # Apply migrations to production D1
pnpm migrate:new  # Create new migration
pnpm generate     # Generate Prisma client + types
pnpm check        # Type check everything
pnpm worker:run   # Run worker scripts
pnpm types        # TypeScript type checking
```

## Project Structure
```
ROOT/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── lobby/
│   │   │   │   ├── LobbyPage.tsx           # Individual lobby view
│   │   │   │   └── routes.ts               # Lobby routes config
│   │   │   └── lobbies/
│   │   │       └── LobbiesPage.tsx         # Lobby browser/creator
│   │   ├── components/
│   │   │   └── Lobby/
│   │   │       ├── LobbyWaitingRoom.tsx    # Lobby UI component
│   │   │       ├── CreateLobbyButton.tsx   # Create lobby button
│   │   │       └── PlayerReadyStatus.tsx   # Ready indicators
│   │   ├── serverActions/
│   │   │   └── lobby/
│   │   │       ├── createLobby.ts          # Create lobby logic
│   │   │       ├── joinLobby.ts            # Join lobby logic
│   │   │       └── toggleReady.ts          # Ready state toggle
│   │   ├── services/
│   │   │   └── lobby/
│   │   │       └── LobbyManager.ts         # Lobby business logic
│   │   └── types/
│   │       └── Lobby.ts                    # Lobby type definitions
│   ├── durableObjects/
│   │   └── (future DO placement - optional)
│   ├── lib/
│   │   └── lobby/
│   │       └── lobbyHelpers.ts             # Lobby utilities
│   ├── draftDurableObject.ts               # EXISTING - Draft DO (reuse)
│   ├── cardGameDurableObject.ts            # EXISTING - Game DO (enhance)
│   ├── lobbyDurableObject.ts               # NEW - Lobby coordination DO
│   └── worker.tsx                          # MAIN ROUTER - add lobby routes
├── prisma/
│   └── schema.prisma
└── wrangler.toml
```

## Existing Components to Reuse

### DraftDO (src/draftDurableObject.ts)
- Already handles 4-player draft (1 human + 3 AI)
- Pick count: 2 per turn
- Timer: 45 seconds per pick
- Deck building phase
- **DO NOT MODIFY** - Use as-is via RPC

### CardGameDO (src/cardGameDurableObject.ts)
- Handles 1v1 matches
- Deck import/management
- Game state management
- **MINOR ENHANCEMENT NEEDED**: Add battle context tracking

## Architecture Principles

### 1. Subdomain-Agnostic Routing
```typescript
// Both URLs work identically:
// https://qntbr.com/lobby/550e8400-...
// https://acme.qntbr.com/lobby/550e8400-...

// In worker.tsx middleware:
const url = new URL(request.url)
const orgSlug = extractOrgFromSubdomain(request)

// Skip org logic for lobby paths
if (url.pathname.startsWith('/lobby') || url.pathname.startsWith('/lobbies')) {
  // Process as global resource
}
```

### 2. One Active Lobby Per User
```typescript
// Enforce at creation:
const existingLobby = await db.lobby.findFirst({
  where: { 
    hostId: userId,
    status: { in: ['waiting', 'drafting', 'playing'] }
  }
})
if (existingLobby) {
  return Response.json({ 
    error: 'Already in lobby',
    lobbyId: existingLobby.id 
  })
}
```

### 3. 1-Hour Inactivity Expiration
```typescript
// LobbyDO uses alarm for cleanup
async alarm() {
  const inactive = Date.now() - lastActivity > 60 * 60 * 1000
  if (inactive) await this.expireLobby()
  // Reschedule
  await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
}
```

### 4. Host Disconnection Doesn't Kill Lobby
- Lobby persists if host disconnects
- Other players can continue
- Host can reconnect to same URL

## RWSDK Routing Patterns

### Client vs Server Components

**Server Components (Default)**
- All components are server components by default
- NO 'use client' directive needed
- Can fetch data with async/await
- Rendered on server, sent as HTML
- Can pass props to client components
- Examples: Pages, layouts, static UI

**Client Components (When Using React Hooks)**
- Add `'use client'` at top of file
- Required when using:
  - `useState`, `useEffect`, `useContext`
  - WebSocket connections
  - Browser APIs (localStorage, window, etc.)
  - Event handlers that use state
- Examples: Interactive forms, real-time components

**Rule**: Only add 'use client' when you need React hooks or browser-only APIs.

**Example - Server Component:**
```typescript
// src/app/pages/lobby/LobbyPage.tsx
// NO 'use client' - this is a server component
import { type RequestInfo } from "rwsdk/worker"

export default async function LobbyPage({ params, ctx }: RequestInfo) {
  const data = await fetchData() // Can async fetch on server
  return <LobbyContent data={data} />
}
```

**Example - Client Component:**
```typescript
// src/app/components/Lobby/LobbyWaitingRoom.tsx
'use client' // ← REQUIRED because uses useState and useEffect

import { useState, useEffect } from 'react'

export function LobbyWaitingRoom({ lobbyId }) {
  const [players, setPlayers] = useState([])
  
  useEffect(() => {
    // WebSocket connection, timers, etc.
  }, [])
  
  return <div>{players.length} players</div>
}
```

### Worker Routes (src/worker.tsx)
```typescript
// src/worker.tsx
import { defineApp, route, prefix, render } from "rwsdk/router"
import { Document } from "@/app/Document"
import LobbyPage from "@/app/pages/lobby/LobbyPage"
import LobbiesPage from "@/app/pages/lobbies/LobbiesPage"
import { lobbyWebSocketRoutes } from "@/app/pages/lobby/routes"

export default defineApp([
  // Middleware runs first
  async ({ ctx, request }) => {
    // Check if should skip org logic
    const url = new URL(request.url)
    if (url.pathname.startsWith('/lobby') || url.pathname.startsWith('/lobbies')) {
      // Skip org middleware for lobbies
      return
    }
    // Normal org logic...
  },

  // WebSocket routes for lobby sync
  prefix("/__lobbysync", lobbyWebSocketRoutes),

  // Frontend routes
  render(Document, [
    // Lobby browser/creator
    route("/lobbies", LobbiesPage),
    
    // Individual lobby
    route("/lobby/:lobbyId", LobbyPage),
    
    // Existing routes...
  ])
])
```

### Page Component Pattern
```typescript
// src/app/pages/lobby/LobbyPage.tsx
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
import LobbyContent from '@/app/components/Lobby/LobbyContent'

export default async function LobbyPage({ params, ctx, request }: RequestInfo) {
  const lobbyId = params.lobbyId
  
  // Get user identity
  let userId: string
  let userName: string
  
  if (ctx.user?.id) {
    userId = ctx.user.id
    userName = ctx.user.name || ctx.user.email || 'Player'
  } else {
    userId = `guest-${crypto.randomUUID()}`
    userName = 'Guest'
  }
  
  // Fetch lobby state
  const doId = env.LOBBY_DO.idFromName(`lobby:${lobbyId}`)
  const stub = env.LOBBY_DO.get(doId)
  const response = await stub.fetch('https://fake/', { method: 'GET' })
  const lobbyState = await response.json()
  
  return (
    <LobbyContent 
      lobbyId={lobbyId}
      userId={userId}
      userName={userName}
      initialState={lobbyState}
    />
  )
}
```

### WebSocket Route Pattern
```typescript
// src/app/pages/lobby/routes.ts
import { route } from "rwsdk/router"
import { env } from "cloudflare:workers"

export const lobbyWebSocketRoutes = [
  route("/:lobbyId", async ({ params, request, ctx }) => {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }
    
    // Get LobbyDO
    const lobbyId = params.lobbyId
    const doId = env.LOBBY_DO.idFromName(`lobby:${lobbyId}`)
    const stub = env.LOBBY_DO.get(doId)
    
    // Add user identity headers
    const headers = new Headers(request.headers)
    if (ctx.user?.id) {
      headers.set('X-Auth-User-Id', ctx.user.id)
      headers.set('X-Auth-User-Name', ctx.user.name || ctx.user.email || 'Player')
    }
    
    // Forward to DO
    return stub.fetch(request.url, {
      method: request.method,
      headers
    })
  })
]
```

### Server Action Pattern
```typescript
// src/app/serverActions/lobby/createLobby.ts
'use server'  // ← REQUIRED at top of file

import { db } from '@/db'
import { env } from "cloudflare:workers"

// Export each action individually
export async function createLobby(userId: string, userName: string) {
  // Check for existing active lobby
  const existing = await db.lobby.findFirst({
    where: {
      hostId: userId,
      status: { in: ['waiting', 'drafting', 'playing'] }
    }
  })
  
  if (existing) {
    return { 
      success: false, 
      error: 'Already in lobby',
      lobbyId: existing.id 
    }
  }
  
  // Create lobby
  const lobbyId = crypto.randomUUID()
  const now = new Date()
  
  await db.lobby.create({
    data: {
      id: lobbyId,
      hostId: userId,
      status: 'waiting',
      phase: 'waiting',
      playerCount: 1,
      maxPlayers: 2,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
    }
  })
  
  // Initialize LobbyDO
  const doId = env.LOBBY_DO.idFromName(`lobby:${lobbyId}`)
  const stub = env.LOBBY_DO.get(doId)
  
  await stub.fetch('https://fake/init', {
    method: 'POST',
    body: JSON.stringify({ lobbyId, hostId: userId, hostName: userName })
  })
  
  return { success: true, lobbyId }
}

// Export other actions individually
export async function joinLobby(lobbyId: string, userId: string) {
  // ...
}
```

## Database Schema (Prisma)

```prisma
// NEW MODELS

model Lobby {
  id          String  @id @default(uuid())
  hostId      String
  host        User @relation("HostedLobbies", fields: [hostId], references: [id])
  
  name        String?
  status      String @default("waiting")
  phase       String @default("waiting")
  playerCount Int @default(1)
  maxPlayers  Int @default(2)
  
  createdAt    DateTime @default(now())
  lastActivity DateTime @default(now())
  expiresAt    DateTime
  
  currentDraftIds String?
  currentGameId   String?
  matchNumber     Int @default(0)
  
  participants LobbyParticipant[]
  matches      LobbyMatch[]
  
  @@index([hostId, status])
  @@index([status, lastActivity])
  @@map("lobbies")
}

model LobbyParticipant {
  id       String @id @default(uuid())
  lobbyId  String
  lobby    Lobby @relation(fields: [lobbyId], references: [id], onDelete: Cascade)
  userId   String
  user     User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  role     String @default("player")
  currentDeckId String?
  
  joinedAt DateTime @default(now())
  leftAt   DateTime?
  
  @@unique([lobbyId, userId])
  @@index([userId])
  @@map("lobby_participants")
}

model LobbyMatch {
  id        String @id @default(uuid())
  lobbyId   String
  lobby     Lobby @relation(fields: [lobbyId], references: [id], onDelete: Cascade)
  
  matchNumber Int
  player1Id String
  player2Id String
  player1DeckId String
  player2DeckId String
  
  gameId    String
  winnerId  String?
  
  createdAt  DateTime @default(now())
  completedAt DateTime?
  
  @@index([lobbyId, matchNumber])
  @@map("lobby_matches")
}

// MODIFICATIONS TO EXISTING MODELS

model User {
  // Add these relations
  hostedLobbies       Lobby[] @relation("HostedLobbies")
  lobbyParticipations LobbyParticipant[]
}
```

## LobbyDO State Machine

```
States (phase):
- waiting      → Players joining, readying up
- drafting     → Both players in separate DraftDOs
- post_draft   → Draft complete, deck building/ready check
- playing      → Match in progress (CardGameDO)
- post_game    → Match complete, rematch options
- expired      → Lobby cleaned up

Transitions:
waiting → drafting         (host starts draft)
drafting → post_draft      (both drafts complete)
post_draft → playing       (both ready, game starts)
playing → post_game        (match ends)
post_game → post_draft     (rematch with same/edited decks)
post_game → drafting       (new draft)
any → expired              (1hr inactivity)
```

## File Organization Rules

### DO Files (root level)
```
src/
├── lobbyDurableObject.ts     # NEW
├── draftDurableObject.ts     # EXISTING - don't touch
└── cardGameDurableObject.ts  # EXISTING - minor edits
```

### Type Definitions
```
src/lib/types/
└── Lobby.ts                  # NEW - all lobby types
```

### Server Actions
```
src/app/serverActions/lobby/
├── createLobby.ts
├── joinLobby.ts
├── leaveLobby.ts
├── toggleReady.ts
├── startDraft.ts
├── completeDraft.ts
├── startMatch.ts
└── reportMatchResult.ts
```

### API Routes (WebSocket handling)
```
src/app/api/lobby/
└── [id]/
    └── ws/
        └── route.ts          # WebSocket upgrade handler
```

### Pages
```
src/app/
├── lobbies/
│   └── page.tsx             # Lobby browser/creator
└── lobby/
    └── [id]/
        ├── page.tsx         # Lobby waiting room
        └── results/
            └── page.tsx     # Post-game results
```

### Components (Minimal for Phase 1)
```
src/app/components/Lobby/
├── LobbyList.tsx            # Browse open lobbies
├── CreateLobbyButton.tsx    # Create new lobby
├── LobbyWaitingRoom.tsx     # Main lobby UI
├── PlayerReadyStatus.tsx    # Ready indicators
└── PostGameOptions.tsx      # Rematch/redraft buttons
```

## Critical Integration Points

### 1. Draft Completion Flow
```typescript
// When player finishes draft in DraftDO:
Client: completeDraft(lobbyId, deckId)
    ↓
Server Action: Updates LobbyDO
    ↓
LobbyDO: Checks if both players done
    ↓
If yes: Broadcast "redirect to lobby"
```

### 2. Match Initialization
```typescript
// When both players ready:
LobbyDO creates CardGameDO
    ↓
Calls CardGameDO.initializeBattle({
  matchId,
  player1: { id, name, deckId },
  player2: { id, name, deckId }
})
    ↓
CardGameDO loads decks from DB
    ↓
Auto-shuffles and draws 7
```

### 3. Match Result Reporting
```typescript
// When match ends:
Client: reportMatchResult(lobbyId, winnerId)
    ↓
Update LobbyMatch in DB
    ↓
Update deck stats
    ↓
Increment lobby.matchNumber
    ↓
Transition to post_game phase
```

## Environment Variables
```bash
# wrangler.toml additions needed
[durable_objects]
bindings = [
  { name = "LOBBY_DO", class_name = "LobbyDO", script_name = "worker" },
  # ... existing bindings
]
```

## Testing Strategy (Phase 1)

### Manual Testing Flow
1. Create lobby → Verify DB record created
2. Join lobby → Verify WebSocket connection
3. Ready up → Verify state sync
4. Start draft → Verify DraftDO creation
5. Complete draft → Verify deck saved
6. Start match → Verify CardGameDO creation
7. End match → Verify results saved
8. Rematch → Verify new game created

### Minimal UI Requirements
- Buttons must work
- State must display
- No styling needed (use default Tailwind)
- Focus on functionality verification

## Common Pitfalls to Avoid

1. **Don't create new DraftDO logic** - Reuse existing
2. **Don't modify DraftDO internals** - Only call via RPC
3. **Don't add complex UI** - Plain HTML/Tailwind is fine for Phase 1
4. **Don't skip DB updates** - LobbyDO must sync to DB for queries
5. **Don't forget activity tracking** - Update on every action
6. **Don't hardcode user IDs** - Always use session

## Success Criteria

### Phase 1 Complete When:
- [ ] Can create lobby via UI
- [ ] Can join lobby via URL
- [ ] Can see other player in lobby
- [ ] Can toggle ready status
- [ ] Can start draft (host only)
- [ ] Draft completes and returns to lobby
- [ ] Can start match when both ready
- [ ] Match plays and determines winner
- [ ] Can rematch or redraft
- [ ] Lobby expires after 1hr inactivity

## Code Style Requirements

### TypeScript
- Strict types, no `any` unless absolutely necessary
- Explicit return types on functions
- Use `interface` over `type` for objects

### Error Handling
- Always wrap DO calls in try/catch
- Return structured errors: `{ success: false, error: string }`
- Log errors with context

### Comments
- Explain WHY, not WHAT
- Document state transitions
- Mark integration points clearly

### File Size
- Max 500 lines per file
- Break into smaller modules if needed
- Prefer composition over monoliths

## Dependencies (Already Installed)
- `@prisma/client` - Database ORM
- `cloudflare:workers` - DO runtime
- `rwsdk` - RedwoodJS SDK for Cloudflare
- All necessary packages already in package.json

**Package Manager**: This project uses **pnpm** exclusively
- Use `pnpm` for all package management commands
- Use `npx` only for Prisma commands (e.g., `npx prisma migrate dev`)
- Use `npx` for Wrangler if `pnpm wrangler` has issues

## DO NOT Install
- No new npm packages needed
- Use existing infrastructure
- Reuse existing patterns from CardGameDO/DraftDO