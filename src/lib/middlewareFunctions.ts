// @/lib/middlewareFunctions.ts
import { type User, type Organization, db, setupDb } from "@/db";
import { auth } from "@/lib/auth";
import type { AppContext } from "@/worker";
import { env } from "cloudflare:workers";

export function extractOrgFromSubdomain(request: Request): string | null { 
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  console.log('🔍 Checking hostname for org:', hostname);
  
  // Handle different environments - ONLY check hostname, ignore pathname
  if (hostname.includes('localhost')) {
    // For localhost subdomains like "myorg.localhost:5173"
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[1] === 'localhost') {
      const orgSlug = parts[0];
      // Validate org slug format
      if (/^[a-z0-9-]+$/.test(orgSlug) && orgSlug.length > 0) {
        console.log(`✅ Found org from localhost subdomain: "${orgSlug}"`);
        return orgSlug;
      }
    }
    
    // No subdomain on localhost = main domain
    console.log('🏠 Main domain (no subdomain)');
    return null;
  }
  
  if (hostname.includes('workers.dev')) {
    // For workers.dev like "myorg.myapp.workers.dev"
    const parts = hostname.split('.');
    if (parts.length >= 4) {
      const orgSlug = parts[0];
      if (/^[a-z0-9-]+$/.test(orgSlug) && orgSlug.length > 0) {
        console.log(`✅ Found org from workers.dev subdomain: "${orgSlug}"`);
        return orgSlug;
      }
    }
    
    console.log('🏠 Main workers.dev domain');
    return null;
  }
  
  // Production: custom domain like "myorg.myapp.com"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const orgSlug = parts[0];
    if (/^[a-z0-9-]+$/.test(orgSlug) && orgSlug.length > 0) {
      console.log(`✅ Found org from production subdomain: "${orgSlug}"`);
      return orgSlug;
    }
  }
  
  console.log('🏠 Main production domain');
  return null;
}

export interface ShipStationCredentials {
  authString: string;
}

export async function getOrgShipStationCredentials(organizationId: string): Promise<ShipStationCredentials> {
  const credential = await db.apikey.findFirst({
    where: {
      organizationId,
      service: 'shipstation',
      keyType: 'basic_auth',
      enabled: true
    }
  });
  
  if (!credential?.key) {
    throw new Error(`ShipStation credentials not configured for organization ${organizationId}`);
  }
  
  return { authString: credential.key };
}

export async function setOrgShipStationCredentials(
  organizationId: string, 
  credentials: ShipStationCredentials,
  userId?: string
) {
  await db.apikey.upsert({
    where: { 
      id: `${organizationId}-shipstation-auth`
    },
    update: {
      key: credentials.authString,
      updatedAt: new Date()
    },
    create: {
      id: `${organizationId}-shipstation-auth`,
      organizationId,
      service: 'shipstation',
      keyType: 'basic_auth',
      name: 'ShipStation Basic Auth',
      key: credentials.authString,
      userId,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

export async function checkOrgHasShipStationCredentials(organizationId: string): Promise<boolean> {
  try {
    await getOrgShipStationCredentials(organizationId);
    return true;
  } catch {
    return false;
  }
}

// REMOVE THE GLOBAL AUTH INSTANCE - this was causing the hang
let dbInitialized = false;

export async function initializeServices() {
  if (!dbInitialized) {
    await setupDb(env);
    dbInitialized = true;
  }
}

export function shouldSkipMiddleware(request: Request): boolean {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Skip middleware for auth routes completely
  if (pathname.startsWith('/api/auth/')) {
    console.log('🔍 Skipping middleware for auth route:', pathname);
    return true;
  }
  
  // Skip for webhooks and realtime
  if (pathname.includes('/webhooks/') || pathname.includes('/__realtime')) {
    console.log('🔍 Skipping middleware for webhook/realtime:', pathname);
    return true;
  }
  
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
    
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    ctx.session = session;
    ctx.user = session?.user || null;
    console.log('✅ Session context set:', !!ctx.user ? `User: ${ctx.user.email}` : 'No user');
  } catch (error) {
    console.error("Session error:", error);
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
    
    const url = new URL(request.url);
    console.log('🔍 Setting up organization context for:', url.pathname);
    
    const orgSlug = extractOrgFromSubdomain(request);
    console.log('🔍 Extracted org slug:', orgSlug, 'from URL:', request.url);
    
    if (!orgSlug) {
      // No organization context (main domain)
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
      return;
    }
    
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
      const userMembership = organization.members[0];
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
    
  } catch (error) {
    console.error("Organization context error:", error);
    ctx.organization = null;
    ctx.userRole = null;
    ctx.orgError = 'ERROR';
  }
}