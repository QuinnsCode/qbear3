// @/lib/middlewareFunctions.ts
import { type User, type Organization, db, setupDb } from "@/db";
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

export function shouldSkipMiddleware(request: Request): boolean {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Skip middleware for ALL API routes (they don't need org context)
  if (pathname.startsWith('/api/')) {
    console.log('🔍 Skipping middleware for API route:', pathname);
    return true;
  }
  
  // Skip for webhooks and realtime
  if (pathname.includes('/__realtime') || 
      pathname.includes('/__gsync') || 
      pathname.includes('/__cgsync')) {
    console.log('🔍 Skipping middleware for realtime:', pathname);
    return true;
  }
  
  // ✅ /__draftsync is NOT skipped - middleware will run
  
  return false;
}

export async function setupSessionContext(ctx: AppContext, request: Request) {
  try {
    if (shouldSkipMiddleware(request)) {
      ctx.session = null;
      ctx.user = null;
      return;
    }
    
    console.log('🔍 Setting up session context for:', new URL(request.url).pathname);
    
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
    if (shouldSkipMiddleware(request)) {
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
    
    const url = new URL(request.url);
    console.log('🔍 Setting up organization context for:', url.pathname);
    
    const orgSlug = extractOrgFromSubdomain(request);
    console.log('🔍 Extracted org slug:', orgSlug, 'from URL:', request.url);

    // Sandbox orgs don't require membership
    if (isSandboxOrg(request)) {
      const organization = await db.organization.findUnique({
        where: { slug: orgSlug }
      });
      
      if (organization) {
        ctx.organization = organization;
        ctx.userRole = 'viewer'; // Everyone is a viewer
        ctx.orgError = null;
        console.log('✅ Sandbox org - public access granted');
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
      // Find the organization
      const organization = await db.organization.findUnique({
        where: { slug: orgSlug },
        include: {
          members: {
            where: ctx.user ? { userId: ctx.user.id } : undefined,
            select: { role: true }
          }
        }
      });
      
      if (!organization) {
        console.log('❌ Organization not found:', orgSlug);
        ctx.organization = null;
        ctx.userRole = null;
        ctx.orgError = 'ORG_NOT_FOUND';
        return;
      }
      
      // Check if user has access (if user is logged in)
      if (ctx.user) {
        const userMembership = organization.members?.[0];
        if (!userMembership) {
          console.log('❌ User has no access to org:', orgSlug);
          ctx.organization = organization;
          ctx.userRole = null;
          ctx.orgError = 'NO_ACCESS';
          return;
        }
        
        ctx.userRole = userMembership.role;
        console.log('✅ User has access to org:', orgSlug, 'with role:', ctx.userRole);
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