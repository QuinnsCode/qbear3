# Ralph Test - Minimal First Goal

## Purpose
Verify Ralph can successfully complete a small, isolated task before attempting the full lobby system implementation.

## Test Goal: Add a Simple "Lobby" Model to Database

This tests Ralph's ability to:
1. Read context files
2. Modify Prisma schema
3. Run RWSDK migration commands
4. Verify changes
5. Commit with proper message

## Setup

### 1. Create Agent Docs Directory
```bash
# In your project root
mkdir -p docs/agent

# Copy the context files there
# (download from Claude and move them)
```

### 2. Create Test Branch
```bash
git checkout -b test/ralph-simple-lobby
```

## Ralph Test Prompt

```
You are Ralph, an AI coding assistant. This is a test to verify you can work with this codebase.

CONTEXT FILES (read these):
- docs/agent/PROJECT_CONTEXT.md - Tech stack and patterns
- docs/agent/CODING_RULES.md - Standards

PROJECT INFO:
- RWSDK project (RedwoodJS SDK for Cloudflare)
- Database: Cloudflare D1 via Prisma
- Package manager: pnpm (never npm)
- Migration commands: pnpm migrate:new, then pnpm migrate:dev

TASK: Add a Simple Lobby Model

STEPS:
1. Open prisma/schema.prisma
2. Add this model:

```prisma
model SimpleLobby {
  id        String   @id @default(uuid())
  name      String
  hostId    String
  status    String   @default("waiting")
  createdAt DateTime @default(now())
  
  @@map("simple_lobbies")
}
```

3. Verify schema: npx prisma format
4. Create migration: pnpm migrate:new
5. Apply migration: pnpm migrate:dev
6. Generate client: pnpm generate
7. Verify TypeScript: pnpm types

VERIFICATION CHECKLIST:
- [ ] Schema has SimpleLobby model
- [ ] npx prisma format runs without errors
- [ ] Migration created in prisma/migrations/
- [ ] pnpm migrate:dev succeeds
- [ ] pnpm generate succeeds
- [ ] pnpm types succeeds (no TypeScript errors)

Report each step as you complete it.
When all steps pass, respond with "TEST COMPLETE ✓"
```

## Expected Ralph Behavior

### Good Response Pattern:
```
I've read the context files. I understand:
- RWSDK build system
- D1 database
- Use pnpm commands
- Follow migration workflow

Starting task...

Step 1: Opening prisma/schema.prisma
Step 2: Adding SimpleLobby model... [shows code]
Step 3: Running npx prisma format... ✓
Step 4: Running pnpm migrate:new... ✓
Step 5: Running pnpm migrate:dev... ✓
Step 6: Running pnpm generate... ✓
Step 7: Running pnpm types... ✓

All verification steps passed.

TEST COMPLETE ✓
```

### Bad Response Patterns (Red Flags):
```
❌ "I'll use npm run migrate" - Wrong package manager
❌ "Running npx prisma migrate dev" - Wrong command for RWSDK
❌ Skips verification steps
❌ Doesn't show what it's doing
❌ Hallucinates file contents without actually checking
```

## What This Tests

✅ **Can read and understand context files**
✅ **Can modify existing files correctly**
✅ **Uses correct commands (pnpm, not npm)**
✅ **Follows RWSDK migration workflow**
✅ **Runs verification steps**
✅ **Reports progress clearly**

## If Test Passes

Great! Ralph can:
- Understand project structure
- Follow instructions
- Use correct tooling
- Verify work

**Next step:** Try Phase 1 of full implementation (just database schema)

## If Test Fails

**Common fixes:**

### Ralph uses wrong commands
```
Prompt: "Ralph, stop. Check CODING_RULES.md section 4. This project uses pnpm, not npm."
```

### Ralph doesn't run verification
```
Prompt: "Ralph, run all verification steps from the checklist before reporting complete."
```

### Ralph can't find files
```
Prompt: "Ralph, list the files in prisma/ directory first."
```

### Ralph hallucinates
```
Prompt: "Ralph, show me the actual contents of prisma/schema.prisma before and after your changes."
```

## Success Criteria

Before proceeding to full implementation:
- [ ] SimpleLobby model added to schema
- [ ] Migration created and applied
- [ ] No TypeScript errors
- [ ] Ralph followed all commands correctly
- [ ] Ralph reported progress clearly
- [ ] Changes committed to git

## Next Steps After Success

If this test passes, create a slightly bigger test:

### Test 2: Add Server Action
```
TASK: Create a simple server action

FILE: src/app/serverActions/test/createSimpleLobby.ts

CODE:
'use server'
import { db } from '@/db'

export async function createSimpleLobby(name: string) {
  const lobby = await db.simpleLobby.create({
    data: {
      name,
      hostId: 'test-host',
      status: 'waiting'
    }
  })
  return lobby
}

VERIFY:
- File created in correct location
- TypeScript compiles (pnpm types)
- Follows server action pattern from CODING_RULES.md
```

### Test 3: Create Simple Component
```
TASK: Create a basic lobby list component

FILE: src/app/components/Test/SimpleLobbyList.tsx

Requirements:
- Client component ('use client')
- Fetches lobbies (use createSimpleLobby server action)
- Displays list with Tailwind classes
- No errors in pnpm dev
```

## Graduated Testing Approach

```
Test 1: Database Model ✓
    ↓
Test 2: Server Action ✓
    ↓
Test 3: Simple Component ✓
    ↓
Phase 1: Full Database Schema
    ↓
Phase 2: Type Definitions
    ↓
... (continue if confidence high)
```

## Cleanup After Testing

```bash
# If all tests passed, merge or delete test branch
git checkout main
git branch -D test/ralph-simple-lobby

# If you want to keep the simple test files for reference
git checkout main
git merge test/ralph-simple-lobby

# Or clean slate
git checkout main
# Test files were in separate branch, just delete it
```

## Recommendation

**Start with just Test 1** (SimpleLobby model). If Ralph:
- ✅ Completes it successfully
- ✅ Uses correct commands
- ✅ Reports clearly

Then you can proceed directly to Phase 1 of the full implementation with confidence.

If Ralph struggles with Test 1, iterate on prompting until it works reliably before attempting anything more complex.