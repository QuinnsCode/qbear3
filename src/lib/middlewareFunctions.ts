// @/lib/middlewareFunctions.ts
import { type User, type Organization, db, setupDb } from "@/db";
import type { AppContext } from "@/worker";
import { env } from "cloudflare:workers";

export function extractOrgFromSubdomain(request: Request): string | null { 
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // Handle different environments
  if (hostname.includes('workers.dev') || hostname.includes('localhost')) {
    // For localhost subdomains like "test1.localhost"
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[1] === 'localhost') {
      return parts[0]; // Return "test1"
    }
    // Development: use path-based for testing
    return url.pathname.split('/')[1];
  }
  
  // Production: subdomain-based
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  
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
      keyType: 'basic_auth', // Store the full auth string
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
  // Store the complete basic auth string
  await db.apikey.upsert({
    where: { 
      // We'll need a unique constraint for this, or use findFirst + create/update
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

// Export function to get auth instance (for use in routes)
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
        // Organization doesn't exist
        ctx.organization = null;
        ctx.userRole = null;
        ctx.orgError = 'ORG_NOT_FOUND';
        console.log('❌ Organization not found:', orgSlug);
        return;
      }
      
      // Only set org context if user is a member (or if no user - for webhooks)
      if (org.members.length > 0 || !ctx.user) {
        ctx.organization = org as Organization;
        ctx.userRole = org.members[0]?.role || null;
        ctx.orgError = null;
        console.log('✅ Set org context:', org.name, 'Role:', ctx.userRole);
      } else {
        // User is not a member of this organization
        ctx.organization = null;
        ctx.userRole = null;
        ctx.orgError = 'NO_ACCESS';
        console.log('❌ No org access - User:', !!ctx.user, 'Org exists but user not a member');
      }
    } else {
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
      console.log('🚫 No org slug detected');
    }
  } catch (error) {
    console.error("Organization context error:", error);
    ctx.organization = null;
    ctx.userRole = null;
    ctx.orgError = 'ERROR';
  }
}