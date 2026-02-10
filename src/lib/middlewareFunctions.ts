// @/lib/middlewareFunctions.ts
import { type User, type Organization, db, setupDb } from "@/db";
import type { AppContext } from "@/worker";
import { env } from "cloudflare:workers";
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import { RateLimitScope } from "@/lib/rateLimit";
import {
  getCachedOrganization,
  getCachedMember
} from "@/lib/cache/authCache";
let dbInitialized = false;

export async function initializeServices() {
  if (!dbInitialized) {
    await setupDb(env);
    dbInitialized = true;
  }
}

export function isSandboxOrg(request: Request): boolean {
  const orgSlug = extractOrgFromSubdomain(request);
  const SANDBOX_ORGS = ['sandbox', 'default', 'test', 'trial'];
  return SANDBOX_ORGS.includes(orgSlug || '');
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
] as const;

/**
 * Check if a route should skip ALL middleware (session + org context)
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
 * Check if a route needs organization context
 *
 * WHY SKIP ORG CONTEXT:
 * - Main domain pages: No subdomain = no org
 * - User settings: Personal, not org-specific
 * - Sandbox: Handled separately
 */
export function needsOrganizationContext(pathname: string, hasOrgSlug: boolean): boolean {
  // No org slug = no org context needed
  if (!hasOrgSlug) {
    return false;
  }

  // User settings pages don't need org context even on subdomains
  if (pathname.startsWith('/user/settings') || pathname.startsWith('/user/profile')) {
    return false;
  }

  // Everything else on a subdomain needs org context
  return true;
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
      console.warn('⚠️ Auth session failed, continuing without session:', authError?.message);
      ctx.session = null;
      ctx.user = null;
    }
    
  } catch (error) {
    console.error("Session setup error:", error);
    ctx.session = null;
    ctx.user = null;
  }
}

export async function setupOrganizationContext(ctx: AppContext, request: Request) {
  try {
    const url = new URL(request.url);

    if (shouldSkipAllMiddleware(url.pathname)) {
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
      return;
    }

    // Skip if sandbox (already handled by sandboxMiddleware)
    const { isSandboxEnvironment } = await import('@/lib/middleware/sandboxMiddleware');
    if (isSandboxEnvironment(request)) {
      console.log('🔍 Skipping org context - sandbox already handled');
      return;
    }

    const orgSlug = extractOrgFromSubdomain(request);

    // Check if this route actually needs org context
    if (!needsOrganizationContext(url.pathname, !!orgSlug)) {
      console.log('🔍 Route does not need org context:', url.pathname);
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
      return;
    }

    console.log('🔍 Setting up organization context for:', url.pathname);
    console.log('🔍 Extracted org slug:', orgSlug, 'from URL:', request.url);

    // Sandbox orgs don't require membership
    if (isSandboxOrg(request)) {
      const organization = await getCachedOrganization(orgSlug!);

      if (organization) {
        ctx.organization = organization;
        ctx.userRole = 'viewer'; // Everyone is a viewer
        ctx.orgError = null;
        console.log('✅ Sandbox org - public access granted (cached)');
        return;
      }
    }
    
    if (!orgSlug) {
      // No organization context (main domain)
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
      return;
    }
    
    try {
      // Find the organization (cached)
      const organization = await getCachedOrganization(orgSlug);

      if (!organization) {
        console.log('❌ Organization not found:', orgSlug);
        ctx.organization = null;
        ctx.userRole = null;
        ctx.orgError = 'ORG_NOT_FOUND';
        return;
      }

      // Check if user has access (if user is logged in)
      if (ctx.user) {
        // Get user's membership (cached)
        const userMembership = await getCachedMember(ctx.user.id, organization.id);

        if (!userMembership) {
          console.log('❌ User has no access to org:', orgSlug);
          ctx.organization = organization;
          ctx.userRole = null;
          ctx.orgError = 'NO_ACCESS';
          return;
        }

        ctx.userRole = userMembership.role;
        console.log('✅ User has access to org:', orgSlug, 'with role:', ctx.userRole, '(cached)');
      } else {
        // No user logged in, but org exists
        ctx.userRole = null;
      }

      ctx.organization = organization;
      ctx.orgError = null;
      
    } catch (dbError) {
      console.error("Database error in org context:", dbError);
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = 'ERROR';
    }
    
  } catch (error) {
    console.error("Organization context error:", error);
    ctx.organization = null;
    ctx.userRole = null;
    ctx.orgError = 'ERROR';
  }
}

export function extractOrgFromSubdomain(request: Request): string | null { 
  const url = new URL(request.url);
  const hostname = url.hostname;
  
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