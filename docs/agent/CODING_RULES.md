# Coding Rules & Guidelines for This Codebase

## General Principles

### 1. Plan Before Coding
- Read task completely before starting
- Understand the "why" not just the "what"
- Verify you understand integration points
- Ask questions if unclear (comment in code)

### 2. No Code Duplication
- Reuse existing patterns from CardGameDO and DraftDO
- Extract common logic to utilities
- Don't copy-paste - refactor instead

### 3. Explicit Over Implicit
- Prefer verbose clarity over clever brevity
- Name variables descriptively
- Add comments for complex logic

### 4. Package Manager Rules
- **ALWAYS use `pnpm`** for package management
- **Use `npx` for Prisma** commands (e.g., `npx prisma migrate dev`)
- **Use `npx` for Wrangler** if `pnpm wrangler` has issues
- **NEVER use `npm`** - this project exclusively uses pnpm

```bash
# ✅ CORRECT
pnpm install
pnpm dev
pnpm build
npx prisma migrate dev
npx wrangler deploy

# ❌ WRONG
npm install
npm run dev
npm run build
```

---

## TypeScript Rules

### Strict Typing
```typescript
// ✅ GOOD
interface LobbyState {
  id: string
  players: LobbyPlayer[]
}

function getState(): LobbyState {
  return this.state!
}

// ❌ BAD
function getState(): any {
  return this.state
}
```

### No `any` Unless Absolutely Necessary
```typescript
// ✅ GOOD
const data = JSON.parse(message) as LobbyMessage

// ❌ BAD
const data: any = JSON.parse(message)
```

### Use Type Guards
```typescript
// ✅ GOOD
if (!this.state) {
  await this.getState()
}
// Now TypeScript knows state is not null

// ❌ BAD
const state = this.state! // Force unwrap without check
```

### Explicit Return Types
```typescript
// ✅ GOOD
async function createLobby(): Promise<string> {
  // ...
  return lobbyId
}

// ❌ BAD
async function createLobby() {
  return lobbyId
}
```

---

## Durable Objects Patterns

### Constructor Pattern
```typescript
constructor(state: DurableObjectState, env: Env) {
  super(state, env)
  
  // ALWAYS use blockConcurrencyWhile for initialization
  this.ctx.blockConcurrencyWhile(async () => {
    const stored = await this.ctx.storage.get<StateType>('key')
    if (stored) {
      this.state = stored
    }
    
    // Schedule alarms if needed
    await this.scheduleAlarm()
  })
}
```

### State Persistence
```typescript
// ✅ GOOD - No await needed (output gate handles it)
private persist(): void {
  if (this.state) {
    this.ctx.storage.put('state', this.state)
    this.updateDatabase(this.state) // Also no await
  }
}

// ❌ BAD - Unnecessary awaits slow down response
private async persist(): Promise<void> {
  await this.ctx.storage.put('state', this.state)
  await this.updateDatabase(this.state)
}
```

### WebSocket Tagging
```typescript
// ✅ GOOD - Use tags for identity
this.ctx.acceptWebSocket(server, ['type', userId, userName])

// In handler:
const tags = this.ctx.getTags(ws)
const userId = tags[1]

// ❌ BAD - Manual tracking
private connections = new Map<WebSocket, string>()
```

### Broadcast Pattern
```typescript
// ✅ GOOD
private broadcast(message: any): void {
  const json = JSON.stringify(message)
  const sockets = this.ctx.getWebSockets()
  
  for (const ws of sockets) {
    try {
      ws.send(json)
    } catch (error) {
      console.error('Failed to send:', error)
    }
  }
}
```

### Alarm Scheduling
```typescript
// ✅ GOOD - Reschedule in alarm handler
async alarm(): Promise<void> {
  // Do work
  await this.cleanup()
  
  // Reschedule if still active
  if (this.shouldContinue()) {
    await this.ctx.storage.setAlarm(Date.now() + INTERVAL)
  }
}

// ❌ BAD - Alarm fires once and stops
async alarm(): Promise<void> {
  await this.cleanup()
  // Forgot to reschedule!
}
```

---

## Server Actions Pattern

### RWSDK Server Actions (Requires 'use server')
```typescript
// ✅ GOOD - RWSDK server action
// src/app/serverActions/lobby/createLobby.ts
'use server'  // ← REQUIRED at top

import { db } from '@/db'
import { env } from "cloudflare:workers"

export async function createLobby(userId: string, userName: string) {
  const existing = await db.lobby.findFirst({
    where: { hostId: userId, status: { in: ['waiting', 'drafting'] } }
  })
  
  if (existing) {
    return { success: false, error: 'Already in lobby' }
  }
  
  const lobbyId = crypto.randomUUID()
  await db.lobby.create({
    data: { id: lobbyId, hostId: userId }
  })
  
  return { success: true, lobbyId }
}

// ❌ BAD - Missing 'use server' directive
import { db } from '@/db'
export async function createLobby() { }
```

### Verify Authentication in Page/Route
```typescript
// ✅ GOOD - Check auth in page component
// src/app/pages/lobby/LobbyPage.tsx
export default async function LobbyPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <div>Please log in</div>
  }
  // ...
}

// ❌ BAD - No auth check
export default async function LobbyPage() {
  // Assumes user exists - could be null!
}
```

### Error Handling
```typescript
// ✅ GOOD
try {
  const response = await stub.fetch(url, options)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Operation failed')
  }
  return await response.json()
} catch (error) {
  console.error('[createLobby] Failed:', error)
  throw error
}

// ❌ BAD
const response = await stub.fetch(url, options)
return await response.json() // No error handling!
```

---

## RWSDK Component Rules

### Page Components (Server-Side)
```typescript
// ✅ GOOD - RWSDK page pattern
// src/app/pages/lobby/LobbyPage.tsx
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"

export default async function LobbyPage({ params, ctx, request }: RequestInfo) {
  const lobbyId = params.lobbyId
  const userId = ctx.user?.id || `guest-${crypto.randomUUID()}`
  
  // Fetch data server-side
  const doId = env.LOBBY_DO.idFromName(`lobby:${lobbyId}`)
  const stub = env.LOBBY_DO.get(doId)
  const response = await stub.fetch('https://fake/')
  const data = await response.json()
  
  return <LobbyContent data={data} userId={userId} />
}
```

### Client Components Must Declare
```typescript
// ✅ GOOD
'use client'

import { useState } from 'react'

export function LobbyRoom() {
  const [state, setState] = useState(null)
  // ...
}
```

### WebSocket Cleanup
```typescript
// ✅ GOOD
useEffect(() => {
  const ws = new WebSocket(url)
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    setState(data.state)
  }
  
  return () => ws.close() // Cleanup!
}, [url])

// ❌ BAD
useEffect(() => {
  const ws = new WebSocket(url)
  ws.onmessage = (event) => setState(event.data)
  // No cleanup - memory leak!
}, [url])
```

### Server Actions in Components
```typescript
// ✅ GOOD - Call server action from client component
'use client'

import { createLobby } from '@/app/serverActions/lobby/createLobby'

export function CreateLobbyButton({ userId, userName }) {
  const handleClick = async () => {
    try {
      const result = await createLobby(userId, userName)
      if (result.success) {
        window.location.href = `/lobby/${result.lobbyId}`
      }
    } catch (error) {
      console.error('Failed to create lobby:', error)
    }
  }
  
  return <button onClick={handleClick}>Create Lobby</button>
}
```

---

## Database Rules

### Always Use Transactions for Related Writes
```typescript
// ✅ GOOD
await prisma.$transaction([
  prisma.lobby.update({
    where: { id: lobbyId },
    data: { status: 'playing' }
  }),
  prisma.lobbyMatch.create({
    data: { lobbyId, gameId, ... }
  })
])

// ❌ BAD - Race condition possible
await prisma.lobby.update({ ... })
await prisma.lobbyMatch.create({ ... })
```

### Include Relations When Needed
```typescript
// ✅ GOOD
const lobby = await prisma.lobby.findUnique({
  where: { id: lobbyId },
  include: { participants: true }
})

// ❌ BAD - Extra query needed
const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } })
const participants = await prisma.lobbyParticipant.findMany({ where: { lobbyId } })
```

### Index Frequently Queried Fields
```prisma
// ✅ GOOD
model Lobby {
  hostId String
  status String
  
  @@index([hostId, status])
}

// ❌ BAD - No index on filter columns
model Lobby {
  hostId String
  status String
}
```

---

## Error Handling

### Structured Error Returns
```typescript
// ✅ GOOD - DO Response
return Response.json(
  { success: false, error: 'Lobby full' },
  { status: 403 }
)

// ✅ GOOD - Server Action
throw new Error('Lobby full')

// ❌ BAD
return { error: 'Lobby full' } // No HTTP status
```

### Log Context
```typescript
// ✅ GOOD
console.error('[LobbyDO:startDraft] Failed:', error, {
  lobbyId: this.state.id,
  hostId,
  playerCount: this.state.players.length
})

// ❌ BAD
console.error('Error:', error) // No context!
```

---

## Naming Conventions

### Files
```
✅ lobbyDurableObject.ts
✅ LobbyWaitingRoom.tsx
✅ createLobby.ts

❌ lobby_durable_object.ts
❌ lobbyWaitingRoom.tsx
❌ CreateLobby.ts (server actions are lowercase)
```

### Variables
```typescript
// ✅ GOOD
const lobbyId = crypto.randomUUID()
const isHost = player.role === 'host'
const allReady = players.every(p => p.isReady)

// ❌ BAD
const lid = crypto.randomUUID()
const host = player.role === 'host' // Ambiguous
const ready = players.every(p => p.isReady) // What's ready?
```

### Functions
```typescript
// ✅ GOOD - Verb + Noun
async function createLobby()
async function joinLobby()
function updatePlayerReady()

// ❌ BAD
async function lobby() // What does this do?
function ready() // Ambiguous
```

---

## Comment Guidelines

### When to Comment
```typescript
// ✅ GOOD - Explain WHY
// Reschedule alarm because lobby is still active
// Without this, lobby would never expire
await this.ctx.storage.setAlarm(nextCheck)

// ❌ BAD - States the obvious
// Set alarm
await this.ctx.storage.setAlarm(nextCheck)
```

### TODO Comments
```typescript
// ✅ GOOD
// TODO(username): Add rate limiting for lobby creation
// See issue #123

// ❌ BAD
// TODO: fix this
```

### Complex Logic
```typescript
// ✅ GOOD
/**
 * Swiss pairing algorithm
 * 
 * Pairs players with similar records while avoiding rematches.
 * If odd number of players, lowest-ranked gets a bye.
 * 
 * @param players - Sorted by match points (desc)
 * @returns Array of [player1, player2] pairs
 */
function generatePairings(players: Player[]): Pairing[] {
  // Implementation
}

// ❌ BAD
// pairs players
function generatePairings(players: Player[]) {}
```

---

## Testing Approach

### Manual Testing Flow
1. **Test immediately after writing** - Don't accumulate untested code
2. **Test happy path first** - Verify it works at all
3. **Test error cases** - What if user is null? Lobby full?
4. **Test edge cases** - What if only 1 player? Already joined?

### Console Logging for Debug
```typescript
// ✅ GOOD - Structured logging
console.log('[LobbyDO:addPlayer]', {
  playerId,
  playerName,
  currentPlayerCount: this.state.players.length,
  isHost
})

// ❌ BAD
console.log('adding player', playerId)
```

---

## Performance Considerations

### Minimize DO Requests
```typescript
// ✅ GOOD - Single DO call
await stub.fetch('/batch-update', {
  method: 'POST',
  body: JSON.stringify({
    ready: true,
    deckName: 'My Deck'
  })
})

// ❌ BAD - Multiple DO calls
await stub.fetch('/ready', { method: 'POST' })
await stub.fetch('/set-deck-name', { 
  method: 'POST',
  body: JSON.stringify({ name: 'My Deck' })
})
```

### Batch Database Writes
```typescript
// ✅ GOOD
await prisma.lobbyParticipant.createMany({
  data: players.map(p => ({
    lobbyId,
    userId: p.id,
    role: 'player'
  }))
})

// ❌ BAD
for (const player of players) {
  await prisma.lobbyParticipant.create({
    data: { lobbyId, userId: player.id, role: 'player' }
  })
}
```

### Minimize State Broadcasts
```typescript
// ✅ GOOD - Only broadcast on changes
private updatePlayerReady(playerId: string, isReady: boolean): void {
  const player = this.state.players.find(p => p.id === playerId)
  if (player && player.isReady !== isReady) {
    player.isReady = isReady
    this.persist()
    this.broadcast({ type: 'state_update', state: this.state })
  }
}

// ❌ BAD - Broadcast even if no change
private updatePlayerReady(playerId: string, isReady: boolean): void {
  const player = this.state.players.find(p => p.id === playerId)
  player.isReady = isReady
  this.broadcast({ type: 'state_update', state: this.state })
}
```

---

## Security Rules

### Never Trust Client Input
```typescript
// ✅ GOOD
const { lobbyId } = await request.json()
if (typeof lobbyId !== 'string' || !isValidUUID(lobbyId)) {
  return Response.json({ error: 'Invalid lobby ID' }, { status: 400 })
}

// ❌ BAD
const { lobbyId } = await request.json()
await this.joinLobby(lobbyId) // Could be anything!
```

### Verify Permissions
```typescript
// ✅ GOOD
const host = this.state.players.find(p => p.role === 'host')
if (host?.id !== userId) {
  return Response.json({ error: 'Only host can start draft' }, { status: 403 })
}

// ❌ BAD
// Anyone can start draft!
```

### Sanitize User-Generated Content
```typescript
// ✅ GOOD
const lobbyName = sanitize(input.name).slice(0, 100)

// ❌ BAD
const lobbyName = input.name // Could be XSS or 10MB string
```

---

## File Organization

### One Responsibility Per File
```
✅ createLobby.ts - Only creates lobbies
✅ joinLobby.ts - Only joins lobbies

❌ lobbyActions.ts - createLobby, joinLobby, leaveLobby, etc. (too much)
```

### Collocate Related Files
```
✅ 
src/app/serverActions/lobby/
  ├── createLobby.ts
  ├── joinLobby.ts
  └── toggleReady.ts

❌
src/app/serverActions/
  ├── createLobby.ts
  ├── joinLobby.ts
  ├── toggleReady.ts
  └── ... (100 other files)
```

---

## Git Commit Guidelines

### Commit Often
- After each task completes
- After tests pass
- Before moving to next task

### Descriptive Messages
```
✅ feat: Add LobbyDO WebSocket handler
✅ fix: Prevent duplicate lobby creation
✅ refactor: Extract broadcast logic to helper

❌ update
❌ fixed stuff
❌ wip
```

---

## What to Do When Stuck

1. **Read existing code** - How does CardGameDO/DraftDO solve this?
2. **Check types** - TypeScript errors often point to the issue
3. **Add console.logs** - See what values actually are
4. **Test in isolation** - Can you reproduce in a simpler scenario?
5. **Comment your question** - Write what you're confused about
6. **Ask for help** - Better to ask than guess wrong

---

## Checklist Before Marking Task Complete

- [ ] TypeScript compiles without errors
- [ ] All imports resolve
- [ ] No `any` types (unless justified)
- [ ] Error handling in place
- [ ] Console.logs for debugging
- [ ] Manually tested happy path
- [ ] Manually tested error cases
- [ ] Comments explain complex logic
- [ ] Follows existing patterns
- [ ] Committed to git with descriptive message