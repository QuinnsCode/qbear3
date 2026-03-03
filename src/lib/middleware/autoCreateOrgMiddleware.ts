// @/lib/middleware/autoCreateOrgMiddleware.ts
import type { AppContext } from "@/worker";
import { db } from "@/db";
import { getCachedUserMemberships, invalidateMember } from '@/lib/cache/authCache';
import { autoCreateOrgForOAuthUser } from '@/lib/auth/autoCreateOrgForOAuthUser';

/**
 * Middleware that:
 * 1. Auto-creates an org for users who don't have one
 * 2. Redirects users to their org subdomain if they're on the main domain
 *
 * This runs AFTER session context is set up, on the first request after sign-in.
 *
 * Why this approach:
 * - Doesn't block the sign-in process (fast sign-in)
 * - Creates org on-demand only when needed
 * - Provides seamless UX (user doesn't see create-lair page)
 */
export async function autoCreateOrgMiddleware(
  ctx: AppContext,
  request: Request
): Promise<Response | null> {
  const url = new URL(request.url);

  // Skip for API routes, create-lair page, and root
  if (!ctx.user ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/user/create-lair') ||
      url.pathname === '/') {
    return null;
  }

  // Check if user has any orgs
  const memberships = await getCachedUserMemberships(ctx.user.id);

  // Case 1: User has org(s) but is on main domain → redirect to their org
  if (memberships.length > 0) {
    const isOnMainDomain = !hasSubdomain(request);

    if (isOnMainDomain) {
      // Get org details
      const membership = await db.member.findFirst({
        where: { userId: ctx.user.id },
        include: { organization: true }
      });

      if (membership) {
        const redirectUrl = buildOrgRedirectUrl(membership.organization.slug, request);
        console.log('✅ [AUTO-REDIRECT] User has org, redirecting to:', redirectUrl);
        return new Response(null, {
          status: 302,
          headers: { Location: redirectUrl }
        });
      }
    }

    // User has org and is on correct subdomain - all good
    return null;
  }

  // Case 2: User has no org → auto-create one

  console.log('⚠️ [AUTO-ORG] User has no org, auto-creating...');

  try {
    // Auto-create org for user
    await autoCreateOrgForOAuthUser(ctx.user);

    // Invalidate membership cache
    await invalidateMember(ctx.user.id, '*');

    // Get fresh membership with org data
    const freshMemberships = await db.member.findMany({
      where: { userId: ctx.user.id },
      include: { organization: true },
      take: 1
    });

    if (freshMemberships.length > 0) {
      const orgSlug = freshMemberships[0].organization.slug;
      const redirectUrl = buildOrgRedirectUrl(orgSlug, request);

      console.log('✅ [AUTO-ORG] Created and redirecting to:', redirectUrl);
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl }
      });
    }
  } catch (error) {
    console.error('❌ [AUTO-ORG] Failed to auto-create:', error);
  }

  // Fallback: redirect to manual creation page
  console.log('⚠️ [AUTO-ORG] Auto-create failed, redirecting to create-lair');
  return new Response(null, {
    status: 302,
    headers: { Location: '/user/create-lair' }
  });
}

/**
 * Check if request is on main domain (no subdomain) or on a subdomain
 */
function hasSubdomain(request: Request): boolean {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Localhost: check for subdomain pattern (e.g., "myorg.localhost")
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    return parts.length >= 2 && parts[1] === 'localhost';
  }

  // Production: check for subdomain pattern (e.g., "myorg.qntbr.com")
  const parts = hostname.split('.');

  // workers.dev: subdomain.worker.workers.dev (4 parts)
  if (hostname.includes('workers.dev')) {
    return parts.length >= 4;
  }

  // qntbr.com: subdomain.qntbr.com (3 parts)
  return parts.length >= 3 && hostname !== 'www.qntbr.com';
}

/**
 * Build redirect URL to user's org subdomain
 */
function buildOrgRedirectUrl(orgSlug: string, request: Request): string {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const protocol = url.protocol;

  // Localhost
  if (hostname.includes('localhost')) {
    const port = url.port || '5173';
    return `${protocol}//${orgSlug}.localhost:${port}/sanctum`;
  }

  // Cloudflare workers.dev
  if (hostname.includes('workers.dev')) {
    const workerDomain = hostname.split('.').slice(-3).join('.');
    return `${protocol}//${orgSlug}.${workerDomain}/sanctum`;
  }

  // Production
  return `${protocol}//${orgSlug}.qntbr.com/sanctum`;
}
