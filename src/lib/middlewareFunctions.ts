// @/lib/middlewareFunctions.ts
import { errorMessage } from '@/lib/errorMessage'
import { setupDb } from "@/db";
import { isLoopbackIp } from "@/lib/loopback";
import type { AppContext } from "@/worker";
import { env } from "cloudflare:workers";
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import { RateLimitScope } from "@/lib/rateLimit";
let dbInitialized = false;

export async function initializeServices() {
  if (!dbInitialized) {
    await setupDb(env);
    dbInitialized = true;
  }
}

export async function rateLimitMiddleware(
  request: Request,
  scope: RateLimitScope
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  
  const result = await checkRateLimit(scope, ip)
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        ...getRateLimitHeaders(result),
        'Retry-After': retryAfter.toString(),
      }
    })
  }
  
  return null // Allow request
}

/**
 * Routes that don't need session or organization context
 * These routes handle their own auth or are public
 */
const SKIP_ALL_MIDDLEWARE_ROUTES = [
  '/user/login',
  '/user/signup',
  '/user/forgot-password',
  '/user/reset-password',
  '/user/logout',
] as const;

/**
 * Route prefixes that should skip middleware
 */
const SKIP_MIDDLEWARE_PREFIXES = [
  '/api/',           // API routes handle their own auth
  '/__realtime',     // WebSocket realtime connections
  '/__gsync',        // Game state sync
  '/__cgsync',       // Card game sync
] as const;

/**
 * Routes that MUST run middleware (even if they match skip patterns)
 * Document exceptions here to avoid confusion
 */
const FORCE_MIDDLEWARE_ROUTES = [
  '/__draftsync',    // Draft sync needs user/org context
  '/api/draft',      // Drafting over JSON acts as the session's user (src/app/api/draft/draft.ts)
  '/api/cardGame/',  // Loading a saved deck at a table, likewise
] as const;

/**
 * Check if a route should skip ALL middleware (session context)
 *
 * WHY SKIP:
 * - Auth pages: Handle their own authentication
 * - API routes: Use different auth patterns
 * - WebSocket: Already authenticated via connection
 */
export function shouldSkipAllMiddleware(pathname: string): boolean {
  // Check forced routes first (highest priority)
  if (FORCE_MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route))) {
    return false;
  }

  // Check exact matches
  if (SKIP_ALL_MIDDLEWARE_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('🔍 Skipping middleware for auth/public page:', pathname);
    return true;
  }

  // Check prefixes
  if (SKIP_MIDDLEWARE_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    console.log('🔍 Skipping middleware for special route:', pathname);
    return true;
  }

  return false;
}

/**
 * Legacy function - use shouldSkipAllMiddleware instead
 * @deprecated Use shouldSkipAllMiddleware for clarity
 */
export function shouldSkipMiddleware(request: Request): boolean {
  const url = new URL(request.url);
  return shouldSkipAllMiddleware(url.pathname);
}

export async function setupSessionContext(ctx: AppContext, request: Request) {
  try {
    const url = new URL(request.url);

    if (shouldSkipAllMiddleware(url.pathname)) {
      ctx.session = null;
      ctx.user = null;
      return;
    }

    console.log('🔍 Setting up session context for:', url.pathname);
    
    // Import auth using the new pattern
    const { initAuth } = await import("@/lib/auth");
    
    try {
      const authInstance = initAuth();
      console.log('🔍 Request cookies:', request.headers.get('cookie')?.substring(0, 100))
      const session = await authInstance.api.getSession({
        headers: request.headers
      });
      
      ctx.session = session;
      ctx.user = session?.user as any; // Cast to any to handle type differences
      console.log('✅ Session context set:', !!ctx.user ? `User: ${ctx.user?.email}` : 'No user');
    } catch (authError) {
      console.warn('⚠️ Auth session failed, continuing without session:', errorMessage(authError));
      ctx.session = null;
      ctx.user = null;
    }
    
  } catch (error) {
    console.error("Session setup error:", error);
    ctx.session = null;
    ctx.user = null;
  }
}

export function extractOrgFromSubdomain(request: Request): string | null { 
  const url = new URL(request.url);
  const hostname = url.hostname;

  // 127.0.0.1 (the desktop host) has no subdomain; without this it reads as the org "127"
  if (isLoopbackIp(hostname)) {
    return null;
  }
  
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[1] === 'localhost') {
      const orgSlug = parts[0];
      // Don't treat 'www' as an org slug
      if (orgSlug === 'www') {
        return null;
      }
      if (/^[a-z0-9-]+$/.test(orgSlug) && orgSlug.length > 0) {
        return orgSlug;
      }
    }
    return null;
  }
  
  if (hostname.includes('workers.dev')) {
    const parts = hostname.split('.');
    if (parts.length >= 4) {
      const orgSlug = parts[0];
      // Don't treat 'www' as an org slug
      if (orgSlug === 'www') {
        return null;
      }
      if (/^[a-z0-9-]+$/.test(orgSlug) && orgSlug.length > 0) {
        return orgSlug;
      }
    }
    return null;
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const orgSlug = parts[0];
    // Don't treat 'www' as an org slug
    if (orgSlug === 'www') {
      return null;
    }
    if (/^[a-z0-9-]+$/.test(orgSlug) && orgSlug.length > 0) {
      return orgSlug;
    }
  }
  
  return null;
}