// @/lib/middleware/sandboxMiddleware.ts
import { isSandboxSubdomain } from '@/lib/subdomains';
import { extractOrgFromSubdomain } from '@/lib/middlewareFunctions';
import type { AppContext } from '@/worker';
import { createSandboxUser, createSandboxOrganization } from '@/lib/sandbox';

/**
 * Check if the current request is for a sandbox environment
 */
export function isSandboxEnvironment(request: Request): boolean {
  const url = new URL(request.url);
  
  // Check if accessing the hardcoded sandbox game (your SANDBOX_GAME_ID)
  if (url.pathname.includes('/cardGame/regal-gray-wolf')) {
    return true;
  }
  
  // Also check subdomain for production
  const orgSlug = extractOrgFromSubdomain(request);
  return orgSlug ? isSandboxSubdomain(orgSlug) : false;
}

/**
 * Generate a unique spectator ID for anonymous observers (read-only)
 */
export function generateSpectatorId(): string {
  return `spectator_${crypto.randomUUID()}`;
}

/**
 * Generate a unique sandbox player ID for chaos participants (full player)
 */
export function generateSandboxPlayerId(): string {
  return `sandbox_${crypto.randomUUID()}`;
}

/**
 * Check if a user ID is a spectator
 */
export function isSpectatorUser(userId: string): boolean {
  return userId.startsWith('spectator-') || userId.startsWith('spectator_');
}

/**
 * Check if a user ID is a sandbox player
 */
export function isSandboxPlayer(userId: string): boolean {
  return userId.startsWith('sandbox-') || userId.startsWith('sandbox_');
}

/**
 * Check if a user ID is ephemeral (sandbox or spectator)
 */
export function isEphemeralUser(userId: string): boolean {
  return isSpectatorUser(userId) || isSandboxPlayer(userId);
}

/**
 * Get or create a stable sandbox player ID from cookie
 */
function getOrCreateSandboxPlayerId(request: Request): string {
  // ✅ Try to get existing ID from cookie
  const cookies = request.headers.get('Cookie') || '';
  const sandboxIdMatch = cookies.match(/sandbox_player_id=([^;]+)/);
  
  if (sandboxIdMatch && sandboxIdMatch[1]) {
    const existingId = sandboxIdMatch[1];
    console.log('♻️ Reusing existing sandbox player ID from cookie:', existingId);
    return existingId;
  }
  
  // ✅ Generate new ID if none exists
  const newId = generateSandboxPlayerId();
  console.log('🆕 Generated new sandbox player ID:', newId);
  return newId;
}

/**
 * Setup sandbox context with ephemeral PLAYER (not spectator)
 * ✅ FIXED: Uses stable session-based ID instead of generating new one each time
 */
export async function setupSandboxContext(ctx: AppContext, request: Request) {
  // ✅ Get stable ID from cookie (or create new one)
  const sandboxPlayerId = getOrCreateSandboxPlayerId(request);
  
  ctx.user = createSandboxUser(sandboxPlayerId) as any;
  ctx.organization = createSandboxOrganization();
  ctx.userRole = 'player';
  ctx.session = null;
  ctx.orgError = null;
  
  console.log('✅ Sandbox context set up for chaos player:', sandboxPlayerId);
}

/**
 * Create response header to set sandbox player ID cookie
 * Call this when responding to sandbox requests
 */
export function createSandboxCookieHeader(sandboxPlayerId: string): string {
  // ✅ Set cookie for 24 hours
  const maxAge = 60 * 60 * 24; // 24 hours in seconds
  return `sandbox_player_id=${sandboxPlayerId}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}