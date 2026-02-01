# Auth Cache Layer

## Overview

KV-based caching layer that reduces D1 query load by caching frequently accessed auth data:
- Sessions (5 min TTL)
- Users (10 min TTL)
- Organizations (10 min TTL)
- Memberships (5 min TTL)

## Usage

### In Middleware (Already Integrated)

The middleware automatically uses cached versions:

```typescript
// src/lib/middlewareFunctions.ts
const organization = await getCachedOrganization(orgSlug); // KV → D1 on miss
const member = await getCachedMember(userId, orgId);       // KV → D1 on miss
```

### Direct Usage

```typescript
import {
  getCachedUser,
  getCachedOrganization,
  getCachedMember,
  invalidateUser
} from '@/lib/cache/authCache';

// Get user (tries cache first)
const user = await getCachedUser(userId);

// Invalidate after update
await db.user.update({ where: { id: userId }, data: { name: 'New Name' } });
await invalidateUser(userId);
```

## Cache Invalidation

**IMPORTANT**: When you modify user/org/member data, you MUST invalidate the cache.

### User Updates

```typescript
// After updating user in D1
await invalidateUser(userId);

// Or invalidate user + all memberships
await invalidateUserContext(userId);
```

### Organization Updates

```typescript
// After updating org in D1
await invalidateOrganization(orgSlug);
```

### Membership Changes

```typescript
// After adding/removing member
await invalidateMember(userId, organizationId);
```

## Performance Impact

**Before caching:**
- 1,000 users × 5 req/min = ~250 D1 queries/sec
- 10,000 users = ~2,500 D1 queries/sec 💥 (exceeds D1 capacity)

**After caching (95% hit rate):**
- 1,000 users × 5 req/min × 5% miss rate = ~12 D1 queries/sec
- 10,000 users = ~120 D1 queries/sec ✅ (well within capacity)

## Cache Keys

| Resource | Key Pattern | TTL |
|----------|-------------|-----|
| Session | `session:{token}` | 5 min |
| User | `user:{userId}` | 10 min |
| Organization | `org:{slug}` | 10 min |
| Member | `member:{userId}:{orgId}` | 5 min |
| Memberships | `memberships:{userId}` | 5 min |

## Fallback Behavior

All cache functions include error handling that falls back to direct D1 queries if KV fails. This ensures the app continues working even if KV is down.

```typescript
try {
  // Try KV cache
  const cached = await env.AUTH_CACHE_KV.get(key);
  // ...
} catch (error) {
  // Fallback to D1
  return db.user.findUnique({ where: { id: userId } });
}
```

## Local Development

The AUTH_CACHE_KV namespace works in local dev (Wrangler dev mode) automatically. Cache TTLs are respected even locally.

## Where to Add Invalidation

Search for these patterns in the codebase and add invalidation:

### User API Routes
```typescript
// src/app/api/user/update
await db.user.update({ ... });
await invalidateUser(userId); // ← ADD THIS
```

### Organization API Routes
```typescript
// src/app/api/orgs/update
await db.organization.update({ ... });
await invalidateOrganization(orgSlug); // ← ADD THIS
```

### Member Management
```typescript
// src/app/api/orgs/members/add
await db.member.create({ ... });
await invalidateMember(userId, organizationId); // ← ADD THIS
```

### Session Logout
```typescript
// Better-auth handles session invalidation internally
// but if you manually delete sessions:
await db.session.delete({ where: { token } });
await invalidateSession(token); // ← ADD THIS
```
