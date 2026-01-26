// @/lib/middleware/ensureUserHasOrg.ts
import { db } from "@/db";
import type { AppContext } from "@/worker";

export async function ensureUserHasOrg(ctx: AppContext, request: Request): Promise<Response | null> {
  // Skip for API routes, webhooks, etc.
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('/__realtime') ||
      url.pathname.startsWith('/user/create-lair') || // Don't redirect if already on creation page
      url.pathname === '/') {
    return null;
  }
  
  // Only check if user is logged in
  if (!ctx.user) {
    return null;
  }
  
  // Check if user has any org memberships
  const memberships = await db.member.findMany({
    where: { userId: ctx.user.id },
    take: 1
  });
  
  // User has org(s) - all good
  if (memberships.length > 0) {
    return null;
  }
  
  // User has NO orgs - redirect to lair creation
  console.log('⚠️ User has no organization, redirecting to create lair');
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/user/create-lair'
    }
  });
}