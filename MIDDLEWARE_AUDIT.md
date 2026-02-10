# Middleware Audit - QNTBR

**Generated:** 2026-02-09
**Branch:** add-three-js

## Executive Summary

Current system has **3 layers** of middleware doing auth/org checks. Your goal of "if you have the game name you can see it" is mostly blocked by **organization membership checks** at the middleware level.

---

## 🔄 Current Middleware Flow

### 1. **URL Normalization** (Lines 119-125 in worker.tsx)
- Forces HTTPS in production
- Removes `www.` prefix
- **Impact:** None on access control

### 2. **Conditional Middleware** (Lines 128-222 in worker.tsx)
- Runs for almost all routes (except auth/API/websockets)
- **Three steps:**
  1. `setupSessionContext` - Gets user from cookie
  2. `setupOrganizationContext` - Checks org membership
  3. Redirect logic - Blocks access if no membership

### 3. **Route-Specific Middleware**
- WebSocket rate limiting (gsync, cgsync, draftsync)
- Draft WebSocket auth (`draftWebSocketMiddleware`)
- VTT WebSocket auth headers

---

## 👁️ Who Can See What - Access Control Matrix

| Route Pattern | Auth Required? | Org Required? | Notes |
|---------------|----------------|---------------|-------|
| `/` (main domain) | ❌ No | ❌ No | Public landing page |
| `/{org}.qntbr.com/` | ✅ Yes | ✅ Yes | Redirects to login → redirects to sanctum |
| `/{org}.qntbr.com/cardGame/{id}` | ✅ Yes | ✅ Yes | **BLOCKED** by org membership check |
| `/cardGame/{id}` (no subdomain) | ❌ No | ❌ No | Works but creates new game on main domain |
| `sandbox.qntbr.com/cardGame/*` | ❌ No | ❌ No | **EXCEPTION** - anyone can play |
| `/cardGame/regal-gray-wolf` | ❌ No | ❌ No | **HARDCODED** sandbox game |
| `/draft/{id}` | ❌ No | ❌ No | **OPEN** - guest auth via cookie |
| `/pvp/lobby/{region}` | ❌ No | ❌ No | **OPEN** - regional matchmaking |
| `/user/*` | ❌ No | ❌ No | Auth routes (login/signup) |
| `/api/*` | Varies | Varies | Route-specific auth |

---

## 🚧 Current Blockers for "Open Game Access"

### Problem 1: Organization Membership Check
**File:** `src/worker.tsx:159-175`

```typescript
if (ctx.user &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/user/create-lair') &&
    url.pathname !== '/') {

  const memberships = await getCachedUserMemberships(ctx.user.id);

  if (memberships.length === 0) {
    // BLOCKS ACCESS - redirects to create org
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/create-lair' }
    });
  }
}
```

**Impact:** If you're logged in but not in an org, you get redirected away from game pages.

### Problem 2: Subdomain Organization Check
**File:** `src/worker.tsx:178-212`

```typescript
if (ctx.orgError &&
    !request.url.includes('/api/') &&
    !request.url.includes('/__realtime') &&
    !request.url.includes('/__gsync') &&
    !request.url.includes('/__cgsync') &&
    !request.url.includes('/user/') &&
    !request.url.includes('/orgs/new') &&
    !request.url.includes('/sanctum')) {

  if (ctx.orgError === 'ORG_NOT_FOUND') {
    // Redirects to org creation
  }

  if (ctx.orgError === 'NO_ACCESS') {
    // Redirects to login
  }
}
```

**Impact:** If you access `{org}.qntbr.com/cardGame/{id}` without being a member of `{org}`, you get blocked.

### Problem 3: CardGamePage Itself Has NO Access Control
**File:** `src/app/pages/cardGame/CardGamePage.tsx:11-44`

```typescript
export default async function CardGamePage({ params, ctx, request }: RequestInfo) {
  const cardGameId = params.cardGameId

  // Get or create user identity
  const userIdentity = await getOrCreateUserId({
    ctx,
    request,
    cardGameId,
    isSandbox
  })

  // NO checks for game ownership or access
  // Just renders the game
  return <GameContent ... />
}
```

**Good News:** The page itself doesn't care about access control - middleware blocks it before it gets here.

---

## ✅ Working Exceptions (How Sandbox Works)

### Exception 1: Sandbox Subdomain (`sandbox.qntbr.com`)
**File:** `src/lib/middlewareFunctions.ts:20-24`

```typescript
export function isSandboxOrg(request: Request): boolean {
  const orgSlug = extractOrgFromSubdomain(request);
  const SANDBOX_ORGS = ['sandbox', 'default', 'test', 'trial'];
  return SANDBOX_ORGS.includes(orgSlug || '');
}
```

**File:** `src/lib/middlewareFunctions.ts:210-221`

```typescript
// Sandbox orgs don't require membership
if (isSandboxOrg(request)) {
  const organization = await getCachedOrganization(orgSlug!);

  if (organization) {
    ctx.organization = organization;
    ctx.userRole = 'viewer'; // Everyone is a viewer
    ctx.orgError = null;
    return; // Skip membership check
  }
}
```

### Exception 2: Hardcoded Game Path
**File:** `src/lib/middleware/sandboxMiddleware.ts:10-21`

```typescript
export function isSandboxEnvironment(request: Request): boolean {
  const url = new URL(request.url);

  // Check if accessing the hardcoded sandbox game
  if (url.pathname.includes('/cardGame/regal-gray-wolf')) {
    return true;
  }

  // Also check subdomain for production
  const orgSlug = extractOrgFromSubdomain(request);
  return orgSlug ? isSandboxSubdomain(orgSlug) : false;
}
```

---

## 🎯 Simplification Options

### Option A: "URL-Based Access Only" (Simplest)
Remove org membership checks for card games entirely.

**Changes:**
1. Add `/cardGame/*` to exemption list in middleware
2. Remove org membership redirect for card game routes
3. Let anyone with the URL access any game

**Pros:**
- Simplest implementation
- Matches your goal: "if you have the game name you can see it"
- Works like Figma/Google Docs sharing

**Cons:**
- Games are "public by default" if someone guesses the ID
- No privacy controls

### Option B: "Optional Privacy Mode" (Middle Ground)
Keep URL-based access as default, add optional privacy flag.

**Changes:**
1. Same as Option A
2. Add `isPrivate` flag to game metadata
3. Check privacy flag in CardGamePage (not middleware)
4. If private, check if user is game creator or org member

**Pros:**
- Flexibility - creators choose public/private
- Most games can be open
- Still supports private org games

**Cons:**
- More complex than Option A
- Need UI for privacy toggle

### Option C: "Game-Based Access Control" (Most Scalable)
Move access control from org middleware to game-level permissions.

**Changes:**
1. Remove org checks from middleware for games
2. Add `permissions` table: `userId`, `gameId`, `role` (creator/player/viewer)
3. Check permissions in CardGamePage
4. Auto-grant permission when joining game

**Pros:**
- Fine-grained control per game
- Scales to large multiplayer
- Can implement sharing/invites later

**Cons:**
- Most database changes
- Need migration for existing games

---

## 📋 Recommended Approach: Option A + Gradual Migration to C

### Phase 1: Remove Blockers (Option A)
Make games accessible by URL only.

**Changes:**
```typescript
// src/worker.tsx - Line 159
if (ctx.user &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/user/create-lair') &&
    !url.pathname.startsWith('/cardGame/') &&  // ✅ ADD THIS
    url.pathname !== '/') {
  // org membership check...
}

// src/worker.tsx - Line 178
if (ctx.orgError &&
    !request.url.includes('/api/') &&
    !request.url.includes('/__realtime') &&
    !request.url.includes('/__gsync') &&
    !request.url.includes('/__cgsync') &&
    !request.url.includes('/cardGame/') &&  // ✅ ADD THIS
    !request.url.includes('/user/') &&
    !request.url.includes('/orgs/new') &&
    !request.url.includes('/sanctum')) {
  // org error handling...
}
```

**Result:**
- `/cardGame/{any-id}` becomes accessible without org membership
- Still get user context if logged in (for display name, etc.)
- No breaking changes to existing code

### Phase 2: Add Game-Level Permissions (Option C)
Build proper game access control system.

**Database Changes:**
```prisma
model GamePermission {
  id        String   @id @default(cuid())
  gameId    String
  userId    String
  role      String   // "creator", "player", "viewer"
  createdAt DateTime @default(now())

  @@unique([gameId, userId])
  @@index([gameId])
  @@index([userId])
}
```

**Middleware Changes:**
```typescript
// Check game permissions in CardGamePage (not middleware)
const hasAccess = await checkGameAccess(cardGameId, userId);
if (!hasAccess && game.isPrivate) {
  return <NoAccessPage />;
}
```

---

## 🔍 Current Route Complexity

### Routes That Skip ALL Middleware
From `SKIP_ALL_MIDDLEWARE_ROUTES` and `SKIP_MIDDLEWARE_PREFIXES`:
- `/user/login`
- `/user/signup`
- `/user/forgot-password`
- `/user/reset-password`
- `/user/logout`
- `/api/*`
- `/__realtime`
- `/__gsync`
- `/__cgsync`

### Routes That Force Middleware
From `FORCE_MIDDLEWARE_ROUTES`:
- `/__draftsync` (needs auth for user identification)

### Routes With Custom Middleware
- `/__gsync` - Rate limiting
- `/__cgsync` - Rate limiting
- `/__draftsync` - Rate limiting + `draftWebSocketMiddleware`
- `/__vttsync` - Adds user auth headers
- `/__user-session` - User session DO
- `/__matchmaking/:region` - Rate limiting

---

## 🎨 Simplification Benefits

### Current: 3 Auth Checks Per Request
1. Middleware: Session check
2. Middleware: Org membership check
3. Middleware: Org access check
4. Page: (none currently)

### Proposed (Option A): 1 Auth Check Per Request
1. Middleware: Session check only
2. Page: Game access check (if private)

**Benefits:**
- Faster requests (fewer DB queries)
- Better caching (org membership query removed)
- Simpler mental model
- Easier to add features (sharing, invites, etc.)

---

## 🚀 Implementation Checklist (Option A)

### Step 1: Update Middleware (worker.tsx)
- [ ] Add `/cardGame/` to org membership exemption (line 159)
- [ ] Add `/cardGame/` to org error exemption (line 178)
- [ ] Test that games load without org membership

### Step 2: Update Organization Context (middlewareFunctions.ts)
- [ ] Modify `needsOrganizationContext()` to return `false` for `/cardGame/*`
- [ ] OR add special case in `setupOrganizationContext()` for card games

### Step 3: Test Cases
- [ ] Logged-in user with no org can access `/cardGame/{id}`
- [ ] Anonymous user can access `/cardGame/{id}`
- [ ] User on `{org}.qntbr.com/cardGame/{id}` can access (even without membership)
- [ ] Existing sandbox games still work
- [ ] Existing org-based games still work

### Step 4: Optional - Add Spectator UI
- [ ] Show "Sign up to save your deck" banner for anonymous users
- [ ] Show "Join this org to create games" for logged-in non-members
- [ ] (Already implemented in SpectatorBanner.tsx)

---

## 📊 Current Middleware Stats

| File | Lines of Code | Complexity |
|------|---------------|------------|
| worker.tsx | ~800 | High - routing + middleware |
| middlewareFunctions.ts | ~328 | Medium - auth logic |
| sandboxMiddleware.ts | ~103 | Low - sandbox helpers |
| userIdentification.ts | ~93 | Low - user ID logic |
| **TOTAL** | ~1324 | **High overall** |

**Recommendation:** Simplify to ~800 LOC by removing org checks for games.

---

## 🎯 Questions for Decision

1. **Privacy Model:** Do you want games to be public by default, or add a privacy flag?
   - Public by default = simpler, faster to implement
   - Privacy flag = more control, but more complexity

2. **Organization Binding:** Should games still be "owned" by orgs in the database?
   - Yes = easier to find org's games, billing by org
   - No = games are independent, easier sharing

3. **Access Control Timing:** When should access checks happen?
   - Middleware (current) = blocks early, but harder to customize
   - Page-level = more flexible, but need to handle everywhere

4. **Backwards Compatibility:** Do existing org-based games need to keep org membership requirement?
   - Yes = need migration path, more complex
   - No = all games become open by URL

---

## 💡 My Recommendation

**Go with Option A now** (remove middleware blockers), then **add game-level permissions later** (Option C) if you need privacy controls.

**Why:**
- Fastest to implement (2 line changes)
- Matches your stated goal
- No breaking changes to existing functionality
- Can always add permissions later
- Keeps org system for other features (sanctum, admin, etc.)

**Next Steps:**
1. Make the 2-line changes to worker.tsx
2. Test with a game on an org subdomain
3. Deploy and monitor
4. Add game-level permissions when needed
