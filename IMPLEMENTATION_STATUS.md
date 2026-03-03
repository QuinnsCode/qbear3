# Implementation Status - Game Permissions & Invite Flow

**Last Updated:** 2026-02-09
**Branch:** add-three-js

---

## ✅ Phase 1: Fix Google SSO Flow - COMPLETE!

### What Was Implemented

#### 1. `/user/create-lair` Route ✅
- **File:** `src/app/pages/user/CreateLairPage.tsx` (exists)
- **Route:** Added to `src/app/pages/user/routes.ts`
- **Features:**
  - Pre-fills lair name from user's Google name/email
  - Slug availability checking
  - Tier selection (Free/Starter/Pro)
  - Fantasy-themed UI matching existing design

#### 2. `createOrgForExistingUser` Server Action ✅
- **File:** `src/app/serverActions/admin/createOrgForExistingUser.ts` (exists)
- **Features:**
  - Creates organization for logged-in user
  - Adds user as owner
  - Creates subscription record with selected tier
  - Returns correct redirect URL for subdomain
  - Validates slug availability and format

#### 3. Middleware Redirect ✅
- **File:** `src/worker.tsx:159-175`
- **Already configured** to redirect users without org to `/user/create-lair`

### Current Google SSO Flow

```
User clicks "Sign in with Google"
  ↓
Google OAuth (better-auth)
  ↓
User account created
  ↓
Middleware checks: user exists BUT no org membership?
  ↓
Redirects to /user/create-lair ← THIS ROUTE NOW EXISTS!
  ↓
User sees "Claim Your Lair" page
  ↓
User enters:
  - Lair Name (pre-filled from Google name)
  - Lair Subdomain (auto-generated)
  - Tier (Free/Starter/Pro)
  ↓
Submit → createOrgForExistingUser()
  ↓
Org created + User added as owner
  ↓
Redirect to {slug}.qntbr.com/sanctum
```

### Testing Checklist

- [ ] Sign in with NEW Google account
- [ ] Verify redirect to `/user/create-lair`
- [ ] Check lair name is pre-filled
- [ ] Test slug availability checking
- [ ] Create lair with free tier
- [ ] Verify redirect to `{slug}.qntbr.com/sanctum`
- [ ] Create game and verify it works

---

## 🚧 Phase 2: Create Game Permissions System - NOT STARTED

### Database Schema Needed

**New Tables:**
1. `GamePermission` - Track who can access games
2. `GameInvite` - Track pending invites

**Migration File:** `migrations/XXXX_add_game_permissions.sql`

```sql
-- GamePermission table
CREATE TABLE GamePermission (
  id TEXT PRIMARY KEY NOT NULL,
  gameId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT NOT NULL,  -- "creator", "player", "viewer"
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(gameId, userId)
);

CREATE INDEX idx_game_permission_game ON GamePermission(gameId);
CREATE INDEX idx_game_permission_user ON GamePermission(userId);
CREATE INDEX idx_game_permission_role ON GamePermission(role);

-- GameInvite table
CREATE TABLE GameInvite (
  id TEXT PRIMARY KEY NOT NULL,
  gameId TEXT NOT NULL,
  invitedBy TEXT NOT NULL,
  invitedEmail TEXT,
  invitedUserId TEXT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,  -- "pending", "accepted", "expired"
  role TEXT NOT NULL,  -- "player", "viewer"
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  acceptedAt INTEGER
);

CREATE INDEX idx_game_invite_game ON GameInvite(gameId);
CREATE INDEX idx_game_invite_token ON GameInvite(token);
CREATE INDEX idx_game_invite_email ON GameInvite(invitedEmail);
CREATE INDEX idx_game_invite_user ON GameInvite(invitedUserId);
```

### Prisma Schema Updates Needed

```prisma
model GamePermission {
  id        String   @id @default(cuid())
  gameId    String
  userId    String
  role      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([gameId, userId])
  @@index([gameId])
  @@index([userId])
  @@index([role])
}

model GameInvite {
  id            String    @id @default(cuid())
  gameId        String
  invitedBy     String
  invitedEmail  String?
  invitedUserId String?
  token         String    @unique
  status        String
  role          String
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
  acceptedAt    DateTime?

  @@index([gameId])
  @@index([token])
  @@index([invitedEmail])
  @@index([invitedUserId])
}
```

### Commands to Run

```bash
# 1. Create migration
npm run migrate:new

# 2. Edit migration file with SQL above

# 3. Apply locally
npm run migrate:dev

# 4. Update Prisma schema (manually add models above)

# 5. Generate Prisma client
npm run generate

# 6. Test locally

# 7. Apply to production
npm run migrate:prd
```

---

## 🚧 Phase 3: Update Game Creation - NOT STARTED

### Files to Modify

#### 1. `src/app/serverActions/cardGame/cardGameRegistry.ts`

**Add permission creation:**
```typescript
// After game creation...
if (options.creatorUserId) {
  await db.gamePermission.create({
    data: {
      id: crypto.randomUUID(),
      gameId: result.cardGameId,
      userId: options.creatorUserId,
      role: 'creator',
      createdAt: new Date()
    }
  });
  console.log('✅ Creator permission added for:', options.creatorUserId);
}
```

#### 2. Migration Script for Existing Games

**File:** `scripts/migrate-existing-games.ts`

```typescript
// Grant creator permissions to all existing games
const games = await db.cardGame.findMany({
  where: { creatorUserId: { not: null } }
});

for (const game of games) {
  await db.gamePermission.create({
    data: {
      id: crypto.randomUUID(),
      gameId: game.id,
      userId: game.creatorUserId!,
      role: 'creator',
      createdAt: new Date()
    }
  });
}

console.log(`✅ Migrated ${games.length} games`);
```

---

## 🚧 Phase 4: Add Permission Checks - NOT STARTED

### Files to Modify

#### 1. `src/app/pages/cardGame/CardGamePage.tsx`

**Add permission check:**
```typescript
export default async function CardGamePage({ params, ctx, request }: RequestInfo) {
  const cardGameId = params.cardGameId;
  const isSandbox = isSandboxEnvironment(request);

  // Skip permission check for sandbox
  if (!isSandbox && ctx.user) {
    // Check if user has permission
    const permission = await db.gamePermission.findUnique({
      where: {
        gameId_userId: {
          gameId: cardGameId,
          userId: ctx.user.id
        }
      }
    });

    if (!permission) {
      // Check for invite token
      const url = new URL(request.url);
      const inviteToken = url.searchParams.get('inv');

      if (inviteToken) {
        // Show accept invite page
        return <AcceptInvitePage gameId={cardGameId} token={inviteToken} />;
      }

      // No access
      return <NoAccessPage message="You don't have access to this game" />;
    }
  }

  // ... rest of existing code ...
}
```

#### 2. Create `<NoAccessPage>` Component

**File:** `src/app/pages/cardGame/NoAccessPage.tsx`

```typescript
export default function NoAccessPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go Home
          </a>
          <a href="/user/login" className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
            Log In
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### 3. Create `<AcceptInvitePage>` Component

**File:** `src/app/pages/cardGame/AcceptInvitePage.tsx`

```typescript
export default function AcceptInvitePage({
  gameId,
  token
}: {
  gameId: string;
  token: string;
}) {
  // Show invite details and Accept/Decline buttons
  // On Accept: Call acceptGameInvite server action
  // On Decline: Redirect to home
}
```

---

## 🚧 Phase 5: Build Invite UI - NOT STARTED

### Components to Create

#### 1. `<InviteModal>` Component
**File:** `src/app/components/CardGame/InviteModal.tsx`

Features:
- Copy shareable link
- Send email invite
- Show pending invites
- Show current players
- Revoke invites

#### 2. Update Sanctum Page
**File:** `src/app/pages/sanctum/SanctumPage.tsx`

Add "Invite Players" button to game cards.

---

## 🚧 Phase 6: Invite Server Actions - NOT STARTED

### Server Actions to Create

#### 1. `createGameInvite`
**File:** `src/app/serverActions/cardGame/createGameInvite.ts`

```typescript
export async function createGameInvite({
  gameId,
  invitedEmail,
  invitedUserId,
  role
}: {
  gameId: string;
  invitedEmail?: string;
  invitedUserId?: string;
  role: 'player' | 'viewer';
}) {
  // Generate secure token
  // Create invite record
  // Send email if invitedEmail provided
  // Return invite
}
```

#### 2. `acceptGameInvite`
**File:** `src/app/serverActions/cardGame/acceptGameInvite.ts`

```typescript
export async function acceptGameInvite({
  token,
  userId
}: {
  token: string;
  userId: string;
}) {
  // Validate token
  // Check not expired
  // Create GamePermission
  // Mark invite as accepted
  // Return success
}
```

#### 3. `revokeGameInvite`
**File:** `src/app/serverActions/cardGame/revokeGameInvite.ts`

```typescript
export async function revokeGameInvite(inviteId: string) {
  // Mark invite as expired
  // Return success
}
```

#### 4. `listGameInvites`
**File:** `src/app/serverActions/cardGame/listGameInvites.ts`

```typescript
export async function listGameInvites(gameId: string) {
  // Return pending invites for game
}
```

---

## 🚧 Phase 7: Email Templates - NOT STARTED

### Email Template to Create

**File:** `src/lib/email/gameInvite.ts`

```typescript
export function getGameInviteEmailHTML(
  inviterName: string,
  gameName: string,
  role: string,
  inviteLink: string
): string {
  return `
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
              <strong>${inviterName}</strong> has invited you to join a Magic: The Gathering Commander game on QNTBR.
            </p>
            <p style="margin-bottom: 30px;">
              <strong>Game:</strong> ${gameName}<br>
              <strong>Role:</strong> ${role}
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" class="button">🎮 Join Game</a>
            </div>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 30px;">
              This invite link will expire in 7 days. If you don't have a QNTBR account yet, you'll be able to create one after clicking the link.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
```

### Resend Integration

```typescript
// In createGameInvite server action
if (invitedEmail) {
  await resend.emails.send({
    from: "QNTBR <no-reply@doubledragonsupply.com>",
    to: [invitedEmail],
    subject: `You're invited to ${gameName}!`,
    html: getGameInviteEmailHTML(inviterName, gameName, role, inviteLink)
  });
}
```

---

## 📋 Next Steps Priority Order

### Immediate (Do Now)
1. **Test Google SSO flow** with new account
2. **Verify create-lair page** works correctly
3. **Deploy to production** to test in real environment

### Short Term (This Week)
4. **Create database migration** for GamePermission and GameInvite tables
5. **Update Prisma schema** with new models
6. **Run migrations** locally and in production
7. **Update game creation** to add creator permissions
8. **Add permission checks** to CardGamePage

### Medium Term (Next Week)
9. **Build invite modal** UI component
10. **Create invite server actions**
11. **Add "Invite Players" button** to Sanctum page
12. **Implement email templates** for invites
13. **Test invite flow** end-to-end

### Long Term (Future)
14. **Migrate existing games** to add creator permissions
15. **Add permission management UI** (change roles, kick players)
16. **Add analytics** for invite usage
17. **Consider public games** feature

---

## 🧪 Testing Plan

### Phase 1 (Google SSO) - Ready to Test
- [ ] New Google account sign-in
- [ ] Create-lair page loads
- [ ] Lair name pre-fills correctly
- [ ] Slug availability works
- [ ] Free tier creates org successfully
- [ ] Redirect to subdomain works
- [ ] Can create and play games

### Phase 2-3 (Permissions) - Not Ready
- [ ] Creating game adds permission
- [ ] Can't access game without permission
- [ ] Sandbox games bypass permission check

### Phase 4-7 (Invites) - Not Ready
- [ ] Can send invite by email
- [ ] Can copy invite link
- [ ] Invite email receives correctly
- [ ] Accepting invite grants permission
- [ ] Can join game after accepting
- [ ] Expired invites don't work
- [ ] Revoked invites don't work

---

## 🎯 Success Metrics

After full implementation:
- **Google SSO completion rate:** % completing org creation
- **Invite sent per game:** Average invites sent
- **Invite acceptance rate:** % of invites accepted
- **Time to first multiplayer game:** From signup to playing with others

---

## ❓ Open Questions

1. **Spectator access:** Should spectators need invites or just the link?
   - **Recommendation:** Link only (no invite needed) for spectators

2. **Invite limits:** Max invites per game?
   - **Recommendation:** Start unlimited, add limits if abused

3. **Public games:** Should creators mark games as public?
   - **Recommendation:** Add later if requested

4. **Org vs user games:** Should games be tied to orgs or users?
   - **Recommendation:** Keep org-based (for billing/limits)

---

## 📈 Current Progress

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Fix Google SSO | ✅ Complete | 100% |
| 2. Database Schema | 🚧 Not Started | 0% |
| 3. Update Game Creation | 🚧 Not Started | 0% |
| 4. Add Permission Checks | 🚧 Not Started | 0% |
| 5. Build Invite UI | 🚧 Not Started | 0% |
| 6. Invite Server Actions | 🚧 Not Started | 0% |
| 7. Email Templates | 🚧 Not Started | 0% |
| **Overall** | | **14%** |

---

## 🚀 Ready to Deploy

Phase 1 is complete and ready for deployment testing.

**Deploy Command:**
```bash
npm run release
```

**After deploy, test:**
1. Visit qntbr.com
2. Click "Sign in with Google"
3. Use a NEW Google account
4. Should redirect to /user/create-lair
5. Complete org creation
6. Should redirect to {slug}.qntbr.com/sanctum
7. Create a card game
8. Verify game works

If this works, proceed with Phase 2 (database migrations).
