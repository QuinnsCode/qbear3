// @/lib/middlewareFunctions.ts
import { type User, type Organization, db, setupDb } from "@/db";
import type { AppContext } from "@/worker";
import { env } from "cloudflare:workers";

// @/lib/middlewareFunctions.ts - Fully org-scoped approach

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
  authString: string; // The full basic auth string (base64 encoded username:password)
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

// Global flags for one-time initialization
let dbInitialized = false;
let authInstance: any = null;

export async function initializeServices() {
  if (!dbInitialized) {
    await setupDb(env);
    dbInitialized = true;
    
    // Create auth instance immediately after db setup
    const { auth } = await import("@/lib/auth");
    authInstance = auth;
  }
}

export function getAuthInstance() {
  if (!authInstance) {
    throw new Error("Auth instance not initialized. Call initializeServices() first.");
  }
  return authInstance;
}

export async function setupSessionContext(ctx: AppContext, request: Request) {
  try {
    const session = await authInstance.api.getSession({
      headers: request.headers
    });
    ctx.session = session;
    ctx.user = session?.user || null;
  } catch (error) {
    console.error("Session error:", error);
    ctx.session = null;
    ctx.user = null;
  }
}

export async function setupOrganizationContext(ctx: AppContext, request: Request) {
  try {
    const orgSlug = extractOrgFromSubdomain(request);
    console.log('🔍 Extracted org slug:', orgSlug, 'from URL:', request.url);

    if (orgSlug) {
      const org = await db.organization.findUnique({
        where: { slug: orgSlug },
        include: { 
          members: { 
            where: { userId: ctx.user?.id },
            select: {
              id: true,
              role: true,
              userId: true,
              createdAt: true
            }
          }
        }
      });
      
      console.log('🏢 Found org:', org?.name, 'Members for user:', org?.members?.length);
      
      if (!org) {
        // Organization doesn't exist - redirect to main domain with error
        ctx.organization = null;
        ctx.userRole = null;
        ctx.orgError = 'ORG_NOT_FOUND';
        console.log('❌ Organization not found:', orgSlug);
        return;
      }
      
      // For webhooks and API calls, allow access without user context
      if (!ctx.user && (request.url.includes('/api/') || request.url.includes('/webhooks/'))) {
        ctx.organization = org as Organization;
        ctx.userRole = null;
        ctx.orgError = null;
        console.log('🔗 API/Webhook access to org:', org.name);
        return;
      }
      
      // For regular pages, check user membership
      if (org.members.length > 0) {
        ctx.organization = org as Organization;
        ctx.userRole = org.members[0]?.role || null;
        ctx.orgError = null;
        console.log('✅ User has access to org:', org.name, 'Role:', ctx.userRole);
      } else {
        // User is not a member - they should join or be invited
        ctx.organization = org as Organization; // Still set org so login page can show org name
        ctx.userRole = null;
        ctx.orgError = ctx.user ? 'NO_ACCESS' : null; // Only error if user is logged in but not a member
        console.log('❌ User not a member of org:', org.name);
      }
    } else {
      // No org context (main domain)
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
      console.log('🏠 Main domain - no org context');
    }
  } catch (error) {
    console.error("Organization context error:", error);
    ctx.organization = null;
    ctx.userRole = null;
    ctx.orgError = 'ERROR';
  }
}