# Game Permissions & Invite Flow Plan

**Generated:** 2026-02-09
**Branch:** add-three-js

---

## 🎯 Goal

Build a proper game permissions system where:
1. **You need an org** to create/host games
2. **Invite flow** from sanctum page: Create game → Invite people → Send invite if not on QNTBR
3. **Google SSO flow** fixed: Either org-up then SSO, or SSO then finish signup with org

---

## 📊 Current State Analysis

### ✅ What Works
- **Email/Password signup:** Creates user + org in one flow (`BetterAuthSignup.tsx`)
- **Subdomain routing:** `{org}.qntbr.com` works correctly
- **Game creation:** Games are created via `createNewCardGame()`
- **Sandbox mode:** `sandbox.qntbr.com` and hardcoded game work without auth

### ❌ What's Broken

#### Problem 1: Google SSO Doesn't Create Org
**File:** `src/app/pages/user/FantasyLogin.tsx:85-95`

```typescript
const handleGoogleSignIn = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: redirectPath,  // Just redirects after auth
  });
};
```

**Issue:**
- Google SSO creates a user account via better-auth
- BUT doesn't create an organization
- User gets stuck in redirect loop (middleware checks for org membership at line 159 in worker.tsx)
- Current middleware redirects users without org to `/user/create-lair`

**Current Flow:**
```
User clicks "Sign in with Google"
  ↓
Google OAuth
  ↓
better-auth creates user
  ↓
Redirects to /sanctum
  ↓
Middleware sees: user exists BUT no org membership
  ↓
Redirects to /user/create-lair  ← BROKEN (route doesn't exist yet)
```

#### Problem 2: No Invite System
- No way to invite people to games
- No "share game link" functionality
- No email invites for non-QNTBR users

#### Problem 3: Game Ownership Unclear
- Games are created with `orgSlug` and optional `creatorUserId`
- BUT no explicit permission/access control table
- Can't track who can view/edit/manage a game

---

## 🏗️ Implementation Plan

### Phase 1: Fix Google SSO Flow (PRIORITY)

#### Option A: SSO → Complete Signup (RECOMMENDED)
User signs in with Google, then completes org creation.

**Flow:**
```
User clicks "Sign in with Google"
  ↓
Google OAuth
  ↓
better-auth creates user
  ↓
Check: Does user have org membership?
  ├─ YES → Redirect to /sanctum
  └─ NO  → Redirect to /user/create-lair (new page)
```

**New Page:** `/user/create-lair`
- Shows: "Welcome {name}! Let's create your lair."
- Form fields:
  - Lair Name (pre-filled: "{name}'s Lair")
  - Lair Subdomain (auto-generated from name)
  - Tier selection (Free/Starter/Pro)
- Submit → Creates org → Adds user as owner → Redirects to `{slug}.qntbr.com/sanctum`

**Changes Needed:**
1. Create `/user/create-lair` route and page
2. Create `createOrgForExistingUser` server action
3. Update middleware redirect (already points to `/user/create-lair`)

#### Option B: Org First → SSO
User selects/creates org before Google SSO.

**Flow:**
```
User clicks "Sign in with Google"
  ↓
Redirect to /user/select-org page
  ↓
User enters lair name/subdomain
  ↓
Stores in session/cookie
  ↓
Google OAuth
  ↓
better-auth creates user
  ↓
Retrieves org info from session
  ↓
Creates org + membership
  ↓
Redirects to {slug}.qntbr.com/sanctum
```

**Complexity:** Higher (need session state management)

**Recommendation:** Go with Option A - simpler, better UX.

---

### Phase 2: Create Game Permissions System

#### Database Schema

```prisma
model GamePermission {
  id        String   @id @default(cuid())
  gameId    String   // Card game ID
  userId    String   // User who has permission
  role      String   // "creator", "player", "viewer"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([gameId, userId])
  @@index([gameId])
  @@index([userId])
  @@index([role])
}

model GameInvite {
  id        String   @id @default(cuid())
  gameId    String   // Card game ID
  invitedBy String   // User ID who sent invite
  invitedEmail String?  // Email if inviting non-user
  invitedUserId String? // User ID if inviting existing user
  token     String   @unique // Invite token for URL
  status    String   // "pending", "accepted", "expired"
  role      String   // "player", "viewer"
  expiresAt DateTime
  createdAt DateTime @default(now())
  acceptedAt DateTime?

  @@index([gameId])
  @@index([token])
  @@index([invitedEmail])
  @@index([invitedUserId])
}
```

#### Permission Roles

| Role | Can View | Can Play | Can Invite | Can Manage |
|------|----------|----------|------------|------------|
| **creator** | ✅ | ✅ | ✅ | ✅ |
| **player** | ✅ | ✅ | ❌ | ❌ |
| **viewer** | ✅ | ❌ | ❌ | ❌ |

**Management Actions:**
- Delete game
- Change game settings
- Kick players
- Change player roles

---

### Phase 3: Build Invite Flow

#### From Sanctum Page

**UI Changes:**
```tsx
// src/app/pages/sanctum/SanctumPage.tsx

// Add "Invite Players" button to each game card
<button onClick={() => openInviteModal(gameId)}>
  👥 Invite Players
</button>
```

**Invite Modal:**
```
┌─────────────────────────────────────┐
│  Invite Players to {Game Name}      │
├─────────────────────────────────────┤
│                                      │
│  Share Link:                         │
│  ┌─────────────────────────────────┐│
│  │ qntbr.com/cardGame/{id}?inv=... ││
│  └─────────────────────────────────┘│
│  [📋 Copy Link]                      │
│                                      │
│  ─────────── OR ───────────          │
│                                      │
│  Send Email Invite:                  │
│  ┌─────────────────────────────────┐│
│  │ email@example.com                ││
│  └─────────────────────────────────┘│
│  Role: [Player ▼]                    │
│  [📧 Send Invite]                    │
│                                      │
│  Pending Invites:                    │
│  • john@example.com (Player) - Sent  │
│  • jane@example.com (Viewer) - Sent  │
│                                      │
│  Current Players:                    │
│  • You (Creator) 👑                  │
│  • Alice (Player)                    │
│                                      │
└─────────────────────────────────────┘
```

#### Invite Accept Flow

**Flow for Existing Users:**
```
User clicks invite link
  ↓
Logged in? → Yes
  ↓
Add permission to GamePermission table
  ↓
Redirect to /cardGame/{id}
```

**Flow for New Users:**
```
User clicks invite link
  ↓
Not logged in
  ↓
Redirect to /user/signup?invite={token}
  ↓
User signs up (email or Google)
  ↓
Creates org (if needed)
  ↓
Accept invite (add permission)
  ↓
Redirect to /cardGame/{id}
```

---

### Phase 4: Update Game Creation

**Changes to createNewCardGame:**
```typescript
// src/app/serverActions/cardGame/cardGameRegistry.ts

export async function createNewCardGame(
  orgSlug: string,
  options: {
    creatorUserId?: string;
    isSandbox?: boolean;
    maxPlayers?: number;
  }
) {
  // ... existing game creation code ...

  // ✅ ADD: Create initial permission for creator
  if (options.creatorUserId) {
    await db.gamePermission.create({
      data: {
        gameId: result.cardGameId,
        userId: options.creatorUserId,
        role: 'creator'
      }
    });
  }

  return result;
}
```

**Changes to CardGamePage:**
```typescript
// src/app/pages/cardGame/CardGamePage.tsx

export default async function CardGamePage({ params, ctx, request }: RequestInfo) {
  const cardGameId = params.cardGameId;

  // ✅ CHECK: Does user have permission to view this game?
  if (ctx.user && !isSandbox) {
    const permission = await db.gamePermission.findUnique({
      where: {
        gameId_userId: {
          gameId: cardGameId,
          userId: ctx.user.id
        }
      }
    });

    if (!permission) {
      // ✅ CHECK: Is there a valid invite token?
      const url = new URL(request.url);
      const inviteToken = url.searchParams.get('inv');

      if (inviteToken) {
        // Show "Accept Invite" page
        return <AcceptInvitePage gameId={cardGameId} token={inviteToken} />;
      }

      // No permission, no invite
      return <NoAccessPage message="You don't have access to this game" />;
    }
  }

  // ... rest of existing code ...
}
```

---

## 🔧 Implementation Checklist

### Step 1: Fix Google SSO (PRIORITY)

- [ ] Create `/user/create-lair` page
  - [ ] Import tier selection from BetterAuthSignup
  - [ ] Pre-fill lair name from user's name
  - [ ] Slug availability check
  - [ ] Submit creates org + membership

- [ ] Create `createOrgForExistingUser` server action
  ```typescript
  // src/app/serverActions/orgs/createOrgForExistingUser.ts
  export async function createOrgForExistingUser(
    userId: string,
    lairName: string,
    lairSlug: string,
    tier: 'free' | 'starter' | 'pro'
  )
  ```

- [ ] Test Google SSO flow:
  1. New user signs in with Google
  2. Redirected to /user/create-lair
  3. Creates org
  4. Redirected to {slug}.qntbr.com/sanctum

### Step 2: Add Database Tables

- [ ] Create migration for `GamePermission` table
- [ ] Create migration for `GameInvite` table
- [ ] Run migrations locally: `npm run migrate:dev`
- [ ] Run migrations in production: `npm run migrate:prd`

### Step 3: Update Game Creation

- [ ] Modify `createNewCardGame` to create initial permission
- [ ] Test: Creating game adds you as creator

### Step 4: Add Permission Checks

- [ ] Update `CardGamePage` to check permissions
- [ ] Create `<NoAccessPage>` component
- [ ] Create `<AcceptInvitePage>` component
- [ ] Test: Can't access game without permission

### Step 5: Build Invite UI

- [ ] Create `<InviteModal>` component
- [ ] Add "Invite Players" button to game cards in Sanctum
- [ ] Add copy link functionality
- [ ] Add email invite functionality

### Step 6: Invite Server Actions

- [ ] `createGameInvite(gameId, invitedEmail, role)` - Creates invite, sends email
- [ ] `acceptGameInvite(token, userId)` - Accepts invite, grants permission
- [ ] `revokeGameInvite(inviteId)` - Cancels pending invite
- [ ] `listGameInvites(gameId)` - Shows pending invites

### Step 7: Email Templates

- [ ] Create game invite email template (Resend)
- [ ] Test email sending locally
- [ ] Test email sending in production

---

## 🚀 Migration Strategy

### For Existing Games

Need to grant permissions to existing game players:

```sql
-- Find all existing games and their players
-- Add creator permissions for all users who created games

INSERT INTO GamePermission (id, gameId, userId, role, createdAt, updatedAt)
SELECT
  'perm_' || substr(md5(random()::text), 1, 16),  -- Generate ID
  cg.id as gameId,
  cg.creatorUserId as userId,
  'creator' as role,
  cg.createdAt,
  datetime('now')
FROM CardGame cg
WHERE cg.creatorUserId IS NOT NULL
ON CONFLICT DO NOTHING;
```

---

## 📧 Invite Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #e0e0e0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #16213e; border-radius: 12px; padding: 32px; border: 2px solid #f59e0b; }
    .title { font-size: 24px; font-weight: bold; color: #fbbf24; margin-bottom: 16px; }
    .button { display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">🎴</div>
      <h1 class="title">You're Invited to Play!</h1>
      <p style="margin-bottom: 20px;">
        <strong>{inviterName}</strong> has invited you to join a Magic: The Gathering Commander game on QNTBR.
      </p>
      <p style="margin-bottom: 30px;">
        <strong>Game:</strong> {gameName}<br>
        <strong>Role:</strong> {role}
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{inviteLink}" class="button">🎮 Join Game</a>
      </div>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 30px;">
        This invite link will expire in 7 days. If you don't have a QNTBR account yet, you'll be able to create one after clicking the link.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 🔐 Security Considerations

1. **Invite Tokens:** Use cryptographically secure random tokens (32+ chars)
2. **Expiration:** Invites expire after 7 days
3. **Rate Limiting:** Limit invite sends per user (10 per hour)
4. **Email Validation:** Validate email format before sending
5. **Permission Escalation:** Only creators can change roles
6. **Audit Log:** Track who invited whom (already in GameInvite table)

---

## 🎮 User Stories

### Story 1: New User via Google SSO
```
As a new user signing in with Google
I want to create my lair during signup
So that I can immediately start creating games
```

**Acceptance:**
- ✅ Google SSO button works
- ✅ After Google auth, user sees "Create Your Lair" page
- ✅ User can choose tier (free/paid)
- ✅ User is redirected to their subdomain after org creation

### Story 2: Game Creator Inviting Friend
```
As a game creator
I want to invite my friend to my game
So that we can play together
```

**Acceptance:**
- ✅ "Invite Players" button visible on game card
- ✅ Can copy shareable link
- ✅ Can send email invite
- ✅ Friend receives email with join link
- ✅ Friend can click link and join game

### Story 3: New User Accepting Invite
```
As a new user receiving an invite
I want to sign up and join the game
So that I can play with my friend
```

**Acceptance:**
- ✅ Clicking invite link shows signup/login page
- ✅ After signup, user is added to game
- ✅ User can immediately see the game

---

## 🧪 Testing Plan

### Manual Testing

1. **Google SSO Flow**
   - [ ] Sign in with new Google account
   - [ ] Verify redirect to /user/create-lair
   - [ ] Create org with free tier
   - [ ] Verify redirect to {slug}.qntbr.com/sanctum
   - [ ] Create a game
   - [ ] Verify game appears in sanctum

2. **Invite Flow - Existing User**
   - [ ] User A creates game
   - [ ] User A invites User B via email
   - [ ] User B receives email
   - [ ] User B clicks link (already logged in)
   - [ ] User B sees game immediately

3. **Invite Flow - New User**
   - [ ] User A creates game
   - [ ] User A invites newuser@example.com
   - [ ] New user receives email
   - [ ] New user clicks link
   - [ ] New user signs up
   - [ ] New user automatically joins game

### Automated Testing

```typescript
// Test: Create game adds creator permission
test('creating game grants creator permission', async () => {
  const result = await createNewCardGame('test-org', {
    creatorUserId: 'user123',
    isSandbox: false,
    maxPlayers: 4
  });

  const permission = await db.gamePermission.findUnique({
    where: {
      gameId_userId: {
        gameId: result.cardGameId,
        userId: 'user123'
      }
    }
  });

  expect(permission).toBeDefined();
  expect(permission.role).toBe('creator');
});

// Test: Non-creator can't access game
test('non-creator cannot access game', async () => {
  const gameId = 'test-game-123';
  const userId = 'unauthorized-user';

  const hasAccess = await checkGameAccess(gameId, userId);
  expect(hasAccess).toBe(false);
});

// Test: Invite token grants access
test('valid invite token grants access', async () => {
  const invite = await createGameInvite('game123', 'user@example.com', 'player');
  const accepted = await acceptGameInvite(invite.token, 'user456');

  expect(accepted).toBe(true);

  const permission = await db.gamePermission.findUnique({
    where: {
      gameId_userId: {
        gameId: 'game123',
        userId: 'user456'
      }
    }
  });

  expect(permission).toBeDefined();
  expect(permission.role).toBe('player');
});
```

---

## 📅 Timeline Estimate

| Phase | Task | Time Estimate |
|-------|------|---------------|
| 1 | Fix Google SSO flow | 2-3 hours |
| 2 | Add database tables | 1 hour |
| 3 | Update game creation | 1 hour |
| 4 | Add permission checks | 2 hours |
| 5 | Build invite UI | 3-4 hours |
| 6 | Invite server actions | 2-3 hours |
| 7 | Email templates | 1-2 hours |
| **Total** | | **12-16 hours** |

---

## 🎯 Success Metrics

After implementation, measure:
1. **Google SSO completion rate** - % of Google users who complete org creation
2. **Invite acceptance rate** - % of invites that are accepted
3. **Time to first game** - How long from signup to joining first game
4. **Invite usage** - How many invites per game creator

---

## ❓ Open Questions

1. **Invite Limits:** Should we limit invites per game? (e.g., max 10 invites)
2. **Public Games:** Should creators be able to mark games as "public" (no invite needed)?
3. **Org Requirement:** Should games still be tied to orgs, or should they be user-owned?
4. **Spectator Invites:** Should spectators need invites, or can anyone spectate with link?

**Recommendations:**
- Start with unlimited invites, add limits if abused
- Don't implement public games yet (can add later)
- Keep games tied to orgs (for billing/limits)
- Allow spectator access with link (no invite needed)
