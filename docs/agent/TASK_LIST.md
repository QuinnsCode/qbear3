# Ralph Prompting Guide - Lobby Matchmaking System

## Initial Setup Prompt

```
You are Ralph, an AI coding assistant implementing a new feature for an RWSDK + Cloudflare Workers application.

PROJECT: Lobby Matchmaking System for 1v1 cube draft battles

CONTEXT FILES (read these first):
- docs/agent/PROJECT_CONTEXT.md - System architecture and tech stack
- docs/agent/TASK_LIST.md - Sequential implementation tasks
- docs/agent/CODING_RULES.md - Coding standards and patterns
- docs/agent/AGENT_GUIDE.md - Workflow and quick reference

CURRENT STATUS: Starting fresh on feature branch

YOUR MISSION: Implement the complete lobby system following the task list sequentially.

CONSTRAINTS:
1. This project uses RWSDK (RedwoodJS SDK for Cloudflare)
2. Database is Cloudflare D1 (not standard Prisma)
3. Use pnpm for all commands (never npm)
4. Migrations use: pnpm migrate:new, then pnpm migrate:dev
5. Always run pnpm generate after schema changes
6. Follow existing patterns from src/cardGameDurableObject.ts and src/draftDurableObject.ts
7. Pages use RequestInfo type from rwsdk/worker
8. Routes defined in src/worker.tsx using route() and prefix()
9. Server actions REQUIRE 'use server' directive at top of file
10. NO Next.js App Router patterns (no /app/[id]/page.tsx file-based routing)

WORKFLOW:
1. Read the current task from TASK_LIST.md
2. Check PROJECT_CONTEXT.md for architecture details
3. Follow patterns in CODING_RULES.md
4. Implement the task
5. Verify using the task's verification checklist
6. Commit with descriptive message
7. Report completion and move to next task

START WITH: Phase 1, Task 1.1 - Update Prisma Schema

Acknowledge you understand and are ready to begin.
```

## Continuation Prompt (After Each Task)

```
TASK COMPLETE: [Task X.X Name]

STATUS:
✓ Implementation complete
✓ Verification passed
✓ Committed: [commit message]

NEXT TASK: Phase X, Task X.X - [Task Name]

Read the task from docs/agent/TASK_LIST.md and implement it following the same process.
```

## Error Recovery Prompt

```
ERROR ENCOUNTERED: [describe error]

CURRENT STATE:
- Working on: [Task X.X]
- Error: [error message]
- What I tried: [attempted solutions]

CONTEXT:
- Review docs/agent/PROJECT_CONTEXT.md for integration points
- Review docs/agent/CODING_RULES.md for patterns
- Check existing files: src/cardGameDurableObject.ts, src/draftDurableObject.ts

REQUEST: Analyze the error and suggest a solution that follows project patterns.
```

## Phase Completion Checkpoint

```
PHASE COMPLETE: Phase X - [Phase Name]

COMPLETED TASKS:
- Task X.1: ✓
- Task X.2: ✓
- Task X.3: ✓

VERIFICATION:
- All TypeScript compiles: [yes/no]
- All tests pass: [yes/no]
- Integration points working: [yes/no]

READY FOR: Phase [X+1] - [Next Phase Name]

Confirm phase completion and proceed to next phase.
```

## Testing Verification Prompt

```
TIME TO TEST: [Feature Name]

TEST FLOW:
[Copy specific test flow from TASK_LIST.md Phase 9]

EXPECTED BEHAVIOR:
[Describe what should happen]

INSTRUCTIONS:
1. Start dev server: pnpm dev
2. Navigate to [URL]
3. Perform [actions]
4. Verify [expected results]
5. Check console for errors
6. Report results

Execute the test and report findings.
```

## Example Session Flow

### Session Start
```bash
# You (Human):
Ralph, please read docs/agent/PROJECT_CONTEXT.md, docs/agent/TASK_LIST.md, 
docs/agent/CODING_RULES.md, and docs/agent/AGENT_GUIDE.md.

Then start with Phase 1, Task 1.1: Update Prisma Schema.

This is an RWSDK project using Cloudflare D1 and pnpm.
```

### Ralph Responds
```
I've read all context files. I understand:
- RWSDK build system with D1 database
- Use pnpm (never npm)
- Follow patterns from existing DOs
- Sequential task execution

Starting Task 1.1: Update Prisma Schema

I will:
1. Open prisma/schema.prisma
2. Add Lobby, LobbyParticipant, and LobbyMatch models
3. Add relations to User model
4. Verify with npx prisma format

Proceeding...
```

### After Task Completion
```bash
# You (Human):
Great! Now move to Task 1.2.

# Ralph:
Task 1.1 Complete ✓
- Added 3 new models to schema
- Updated User relations
- Verified with prisma format
- Committed: "feat: Add lobby system database schema"

Starting Task 1.2: Create Migration
Running: pnpm migrate:new
```

## Key Phrases for Ralph

### To Pause/Check
```
"Ralph, pause. Show me the current state of [file/feature]."
"Ralph, explain your approach for [task] before implementing."
```

### To Course Correct
```
"Ralph, that's not following the pattern. Check [existing file] for reference."
"Ralph, review CODING_RULES.md section on [topic] and revise."
```

### To Get Status
```
"Ralph, what task are you on and what's the progress?"
"Ralph, summarize what's been completed so far."
```

### To Test
```
"Ralph, let's test [feature]. Follow the test flow from TASK_LIST.md Phase 9."
```

## Common Ralph Issues & Solutions

### Issue: Ralph forgets context
**Solution:**
```
"Ralph, re-read docs/agent/PROJECT_CONTEXT.md and confirm the tech stack."
```

### Issue: Ralph uses wrong commands (npm instead of pnpm)
**Solution:**
```
"Ralph, stop. This project uses pnpm exclusively. Check CODING_RULES.md section 4."
```

### Issue: Ralph creates code not following patterns
**Solution:**
```
"Ralph, review src/cardGameDurableObject.ts lines [X-Y] and apply the same pattern."
```

### Issue: Ralph skips verification steps
**Solution:**
```
"Ralph, run all verification steps from Task X.X before proceeding."
```

## Progress Tracking Template

Create a file `docs/agent/PROGRESS.md` and have Ralph update it:

```markdown
# Lobby System Implementation Progress

## Phase 1: Database Schema ✓
- [x] Task 1.1: Update Prisma Schema
- [x] Task 1.2: Create Migration

## Phase 2: Type Definitions
- [x] Task 2.1: Create Lobby Types
- [ ] Task 2.2: ...

## Current Status
Working on: Phase X, Task X.X
Blocked by: [none/issue description]
Next up: Task X.X
```

## Ralph-Optimized Prompting Tips

1. **Be Specific About Files**
   ```
   ✓ "Edit src/lobbyDurableObject.ts, add constructor following CardGameDO pattern"
   ✗ "Add a constructor"
   ```

2. **Reference Context Docs**
   ```
   ✓ "Check TASK_LIST.md Phase 3, Task 3.2 for implementation details"
   ✗ "Implement the constructor"
   ```

3. **Enforce Verification**
   ```
   ✓ "Complete Task 3.2 including all verification steps before continuing"
   ✗ "Do Task 3.2"
   ```

4. **Use Existing Code as Templates**
   ```
   ✓ "Use the alarm pattern from CardGameDO lines 45-60"
   ✗ "Add an alarm"
   ```

5. **Break Down Large Tasks**
   ```
   ✓ "For Task 3.8, first outline the approach, then implement startDraft method"
   ✗ "Do Task 3.8"
   ```

## File Locations Quick Reference

Ralph will need these paths frequently:

```bash
# Schema
prisma/schema.prisma

# Existing DOs (for patterns)
src/cardGameDurableObject.ts
src/draftDurableObject.ts

# New DO (to create)
src/lobbyDurableObject.ts

# Types (to create)
src/app/types/Lobby.ts

# Server Actions (to create)
src/app/serverActions/lobby/createLobby.ts
src/app/serverActions/lobby/joinLobby.ts
src/app/serverActions/lobby/toggleReady.ts
# ... etc

# Components (to create)
src/app/components/Lobby/LobbyWaitingRoom.tsx
src/app/components/Lobby/CreateLobbyButton.tsx

# Pages (to create)
src/app/pages/lobbies/LobbiesPage.tsx
src/app/pages/lobby/LobbyPage.tsx

# WebSocket Routes (to create)
src/app/pages/lobby/routes.ts

# Config
wrangler.toml
```

## Sample Full Session

```bash
# Session Init
You: "Ralph, read all files in docs/agent/. This is an RWSDK project using D1 and pnpm. Start Phase 1."

Ralph: "[reads files] Understood. Starting Task 1.1..."
[implements Task 1.1]
Ralph: "Task 1.1 complete. Moving to Task 1.2..."

# After a few tasks
You: "Ralph, pause. Show me the Lobby model you created."
Ralph: "[shows schema]"
You: "Good. Continue to next task."

# If error occurs
Ralph: "Error: Prisma generate failed..."
You: "Ralph, did you run pnpm generate or npx prisma generate?"
Ralph: "I ran npx prisma generate"
You: "Use pnpm generate per RWSDK. Check AGENT_GUIDE.md."
Ralph: "Corrected. pnpm generate succeeded."

# Phase completion
Ralph: "Phase 1 complete. All tasks verified. Ready for Phase 2."
You: "Proceed to Phase 2."

# Testing
You: "Ralph, test the lobby creation flow per TASK_LIST.md Phase 9, Test Flow