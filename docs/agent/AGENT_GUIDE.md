# Agentic Implementation Quick Reference

## Package Manager Important Note

**This project uses pnpm exclusively!**
- Use `pnpm` for all package commands
- Use `npx` only for Prisma (e.g., `npx prisma migrate dev`)
- Use `npx` for Wrangler if needed (e.g., `npx wrangler deploy`)
- Never use `npm` commands

## Files Created for Your Agent

1. **PROJECT_CONTEXT.md** - Complete system overview, architecture, patterns
2. **TASK_LIST.md** - Sequential implementation tasks with verification steps
3. **CODING_RULES.md** - Coding standards, patterns, best practices

## How to Use These Files

### For Ralph Loop / Ollama Models

**Prompt Template:**
```
You are implementing the Lobby Matchmaking System for an RWSDK + Cloudflare Workers application.

CONTEXT: Read PROJECT_CONTEXT.md for system architecture and integration points.

CURRENT TASK: [Task X.X from TASK_LIST.md]

RULES: Follow all guidelines in CODING_RULES.md

Your task is to implement [specific task] following these requirements:
[paste task details from TASK_LIST.md]

Before writing code:
1. Confirm you understand the task
2. Identify which existing files you need to reference
3. List the files you will create/modify
4. Outline your implementation approach

Then implement the task, verify it works, and report completion.
```

## Task Execution Pattern

### Step 1: Read Task
```
Current task: Task 3.2 - Implement Constructor & Initialization
Location: TASK_LIST.md, Phase 3
```

### Step 2: Understand Context
```
- What does this connect to? (Check PROJECT_CONTEXT.md)
- What patterns should I follow? (Check CODING_RULES.md)
- What similar code exists? (Look at CardGameDO/DraftDO)
```

### Step 3: Plan Implementation
```
Files to modify:
- src/lobbyDurableObject.ts

Pattern to follow:
- CardGameDO constructor pattern
- Use blockConcurrencyWhile
- Schedule alarm for expiration

Implementation steps:
1. Add blockConcurrencyWhile block
2. Load stored state
3. Check for expiration
4. Schedule alarm
```

### Step 4: Implement
```
Write the code following CODING_RULES.md:
- TypeScript strict mode
- Explicit types
- Error handling
- Console.logs for debugging
```

### Step 5: Verify
```
Checklist from TASK_LIST.md:
✓ Constructor runs without errors
✓ State loads from storage if exists
✓ Alarm schedules correctly
```

### Step 6: Report & Commit
```
Task 3.2 complete:
- Implemented constructor with blockConcurrencyWhile
- Added state loading logic
- Scheduled expiration alarm
- Tested: [test results]
- Committed: "feat: Add LobbyDO constructor and initialization"

Ready for next task: Task 3.3
```

## Quick Reference: File Locations

```
Existing Files (DO NOT MODIFY unless task says so):
- src/draftDurableObject.ts
- src/cardGameDurableObject.ts (minor edits only)
- prisma/schema.prisma (add models in Phase 1)

New Files to Create:
- src/lobbyDurableObject.ts
- src/app/types/Lobby.ts
- src/app/serverActions/lobby/*.ts
- src/app/components/Lobby/*.tsx
- src/app/pages/lobbies/LobbiesPage.tsx
- src/app/pages/lobby/LobbyPage.tsx
- src/app/pages/lobby/routes.ts (WebSocket routes)
```

## Common Patterns Quick Lookup

### DO Constructor
```typescript
constructor(state: DurableObjectState, env: Env) {
  super(state, env)
  this.ctx.blockConcurrencyWhile(async () => {
    // Load state, schedule alarms
  })
}
```

### WebSocket Accept
```typescript
this.ctx.acceptWebSocket(server, ['type', userId, userName])
```

### Broadcast
```typescript
const sockets = this.ctx.getWebSockets()
for (const ws of sockets) {
  ws.send(JSON.stringify(message))
}
```

### Server Actions in RWSDK
```typescript
// ✅ GOOD - RWSDK server action pattern
// src/app/serverActions/lobby/createLobby.ts
'use server'  // ← REQUIRED

import { db } from '@/db'
import { env } from "cloudflare:workers"

export async function createLobby(userId: string, userName: string) {
  const existing = await db.lobby.findFirst({
    where: { hostId: userId, status: { in: ['waiting', 'drafting'] } }
  })
  
  if (existing) {
    return { success: false, error: 'Already in lobby', lobbyId: existing.id }
  }
  
  const lobbyId = crypto.randomUUID()
  await db.lobby.create({
    data: { id: lobbyId, hostId: userId, status: 'waiting' }
  })
  
  const doId = env.LOBBY_DO.idFromName(`lobby:${lobbyId}`)
  const stub = env.LOBBY_DO.get(doId)
  await stub.fetch('https://fake/init', {
    method: 'POST',
    body: JSON.stringify({ lobbyId, hostId: userId, hostName: userName })
  })
  
  return { success: true, lobbyId }
}

// ❌ BAD - Missing 'use server'
import { db } from '@/db'
export async function createLobby() { }
```

### DO RPC Call
```typescript
const doId = env.LOBBY_DO.idFromName(`lobby:${lobbyId}`)
const stub = env.LOBBY_DO.get(doId)
const response = await stub.fetch('https://fake/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

## Phase Progression

```
Phase 1: Database Schema
  ↓ (Run migrations, verify in Prisma Studio)
Phase 2: Type Definitions
  ↓ (Verify TypeScript compiles)
Phase 3: LobbyDO Implementation
  ↓ (Test each method individually)
Phase 4: Server Actions
  ↓ (Test with curl/Postman)
Phase 5: API Routes
  ↓ (Test WebSocket connections)
Phase 6: UI Components
  ↓ (Test in browser)
Phase 7: Integration
  ↓ (End-to-end test flows)
Phase 8: Configuration
  ↓ (Deploy and verify)
Phase 9: Testing
  ↓ (Complete checklist)
```

## When You Get Stuck

1. Check PROJECT_CONTEXT.md for architecture clarity
2. Check CODING_RULES.md for pattern examples
3. Look at CardGameDO/DraftDO for similar code
4. Add detailed console.logs
5. Test smaller pieces in isolation
6. Comment your confusion in code
7. Skip to next task, come back later

## Success Indicators

After each task:
- [ ] Code compiles (no TypeScript errors)
- [ ] All imports resolve
- [ ] Manual test passes
- [ ] Console shows expected logs
- [ ] Committed to git

After each phase:
- [ ] All tasks in phase complete
- [ ] Integration points working
- [ ] Can demonstrate functionality
- [ ] Ready for next phase

## Testing Commands

```bash
# Check TypeScript
pnpm types

# Generate Prisma client and types
pnpm generate

# Check everything (Prisma + TypeScript)
pnpm check

# Prisma schema validation
npx prisma format
npx prisma validate

# Run migrations - LOCAL (D1 database)
pnpm migrate:dev

# Run migrations - PRODUCTION
pnpm migrate:prd

# Create new migration
pnpm migrate:new

# Start dev server
pnpm dev

# Build for production
pnpm build

# Deploy to Cloudflare
pnpm release

# Run worker scripts (for testing)
pnpm worker:run <script-path>

# Check logs
# (in browser console for client-side)
# (in terminal for server-side with pnpm dev)
```

## Emergency Reset

If you get completely stuck:

```bash
# Reset branch
git reset --hard origin/main
git checkout -b feature/lobby-matchmaking-system-v2

# Start from Phase 1 again
# Review what went wrong
# Proceed more carefully
```

## Final Checklist (Phase 9)

Test each flow completely before marking done:

- [ ] Create lobby → Join → Ready → Draft → Match → Win
- [ ] Reconnection works (refresh browser)
- [ ] Expiration works (wait 1hr or trigger manually)
- [ ] Error cases handled (full lobby, not ready, etc.)
- [ ] No console errors in browser or terminal
- [ ] All TypeScript errors resolved
- [ ] All data persists correctly (check DB)
- [ ] WebSocket connections stable
- [ ] Can rematch with same deck
- [ ] Can draft new deck

## Reference Documentation

- Durable Objects: https://developers.cloudflare.com/durable-objects/
- Prisma: https://www.prisma.io/docs
- RWSDK: https://github.com/redwoodjs/rwsdk
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

## Contact/Help

If blocked and can't proceed:
- Document the exact error
- Document what you tried
- Document current state
- Ask human for guidance

Remember: It's better to ask than to guess wrong and create technical debt!