// @/lib/middleware/sandboxMiddleware.ts
import { isSandboxSubdomain } from '@/lib/subdomains';
import { extractOrgFromSubdomain } from '@/lib/middlewareFunctions';
import type { AppContext } from '@/worker';
import { createSandboxUser, createSandboxOrganization } from '@/lib/sandbox';

/**
 * Check if the current request is for a sandbox environment
 */
export function isSandboxEnvironment(request: Request): boolean {
  const orgSlug = extractOrgFromSubdomain(request);
  
  if (!orgSlug) {
    return false;
  }
  
  return isSandboxSubdomain(orgSlug);
}

/**
 * Generate a unique spectator ID for anonymous sandbox players
 */
export function generateSpectatorId(): string {
  return `spectator_${crypto.randomUUID()}`;
}

/**
 * Setup sandbox context with ephemeral user and organization
 */
export async function setupSandboxContext(ctx: AppContext, request: Request) {
  const spectatorId = generateSpectatorId();
  
  ctx.user = createSandboxUser(spectatorId) as any;
  ctx.organization = createSandboxOrganization();
  ctx.userRole = 'player';
  ctx.session = null;
  ctx.orgError = null;
  
  console.log('✅ Sandbox context set up for spectator:', spectatorId);
}