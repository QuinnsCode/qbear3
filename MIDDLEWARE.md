# Middleware Configuration Guide

## Overview

The application uses middleware to set up context (user session, organization) for requests. Not all routes need this context, so we skip middleware for performance.

## Quick Reference

### Routes that Skip ALL Middleware

```typescript
// Auth pages (handle their own auth)
/user/login
/user/signup
/user/forgot-password
/user/reset-password
/user/logout

// API routes (use different auth patterns)
/api/*

// WebSocket/Realtime (already authenticated)
/__realtime*
/__gsync*
/__cgsync*
```

### Routes that MUST Run Middleware

```typescript
// Draft sync needs user/org context
/__draftsync*
```

## Why Skip Middleware?

### Performance
- Each middleware call makes database queries
- Session lookup: ~100-200ms
- Organization lookup: ~100-200ms
- **Total savings: ~300ms per request**

### Correctness
- Auth pages handle their own authentication
- API routes use Bearer tokens, not sessions
- WebSocket routes authenticate via connection

## How to Add a New Route

### 1. Public/Auth Pages (Skip Everything)

```typescript
// Add to SKIP_ALL_MIDDLEWARE_ROUTES in middlewareFunctions.ts
const SKIP_ALL_MIDDLEWARE_ROUTES = [
  '/user/login',
  '/your/new/public/route',  // ← Add here
] as const;
```

**When to use:**
- Login/signup pages
- Public landing pages
- Password reset flows

### 2. API Routes (Already Skipped)

API routes (`/api/*`) are automatically skipped. No action needed.

### 3. Protected Pages (Need Middleware)

Don't add to skip lists! Middleware runs by default.

**When to use:**
- User dashboards
- Organization pages
- Any page that needs `ctx.user` or `ctx.organization`

### 4. Special Cases (Force Middleware)

```typescript
// Add to FORCE_MIDDLEWARE_ROUTES
const FORCE_MIDDLEWARE_ROUTES = [
  '/__draftsync',
  '/your/special/route',  // ← Add here
] as const;
```

**When to use:**
- Route matches a skip pattern BUT needs middleware
- Example: `/__draftsync` matches `/__*` but needs user context

## Functions Reference

### `shouldSkipAllMiddleware(pathname: string): boolean`

**Purpose:** Check if a route should skip session + org context

**Returns:** `true` if route should skip, `false` if middleware should run

**Use in:** Both session and organization middleware

### `needsOrganizationContext(pathname: string, hasOrgSlug: boolean): boolean`

**Purpose:** Check if a route needs organization context (even if session is loaded)

**Returns:** `true` if route needs org, `false` if it doesn't

**Use in:** Organization middleware only

**Example:**
```typescript
// User settings on subdomain: has session, no org needed
user.myorg.com/user/settings
→ needsOrganizationContext() returns false
```

## Testing Your Changes

1. **Check logs:** Routes that skip middleware log `🔍 Skipping middleware for...`
2. **Measure speed:**
   ```bash
   # Before (with middleware)
   curl -w "%{time_total}\n" https://your-app.com/user/login
   # Should be ~300ms faster after skipping
   ```
3. **Verify auth:** Make sure protected routes still require login

## Common Mistakes

### ❌ Don't Skip Too Much
```typescript
// BAD - breaks protected pages
if (pathname.startsWith('/user/')) return true;
```

### ✅ Be Specific
```typescript
// GOOD - only skips auth pages
if (pathname.startsWith('/user/login')) return true;
```

### ❌ Don't Forget Exceptions
```typescript
// BAD - breaks draft sync
if (pathname.startsWith('/__')) return true;
```

### ✅ Document Exceptions
```typescript
// GOOD - explicitly allow draft sync
const FORCE_MIDDLEWARE_ROUTES = ['/__draftsync'];
```

## Current Middleware Flow

```
Request → Worker
  ↓
  Check shouldSkipAllMiddleware()
  ↓
  ├─ Skip? → Set ctx = null, continue to route
  ↓
  └─ Run? → setupSessionContext()
              ↓
              setupOrganizationContext()
                ↓
                Check needsOrganizationContext()
                ↓
                ├─ No org needed → Set ctx.org = null
                ↓
                └─ Needs org → Load org from DB
                                ↓
                                Route handler
```

## Need Help?

When adding a new route, ask yourself:

1. **Does this route need to know who the user is?**
   - Yes → Don't skip middleware
   - No → Add to `SKIP_ALL_MIDDLEWARE_ROUTES`

2. **Does this route need to know the organization?**
   - Yes → Don't skip, make sure org slug exists
   - No → Either skip all middleware OR add logic to `needsOrganizationContext()`

3. **Is this an exception to a skip pattern?**
   - Yes → Add to `FORCE_MIDDLEWARE_ROUTES`
   - No → Use existing patterns
