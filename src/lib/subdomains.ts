// @/lib/subdomains.ts

/**
 * Reserved subdomains that trigger sandbox/special behavior
 * The sandbox host serves the shared sandbox card game
 */
export const SANDBOX_SUBDOMAINS = [
    'sandbox',
    'play',
    'demo',
    'trial',
    'test',
    'sand-box',
    'test-game',
    'gametest',
    'playground',
    'tryout',
    'testing',
  ] as const;
  
  /**
   * Banned/reserved subdomains for technical or brand reasons
   * Requests for these on this Worker get a 404 rather than the retired-lair redirect
   */
  export const BANNED_SUBDOMAINS = [
    // System/technical
    'www',
    'api',
    'app',
    'admin',
    'dashboard',
    'cdn',
    'static',
    'assets',
    'files',
    'upload',
    'download',
    'mail',
    'email',
    'smtp',
    'ftp',
    'ssh',
    
    // Auth & security
    'auth',
    'eqosys',   // the account shared by every Q app, its own Worker on eqosys.qntbr.com
    'qcrm',     // qCRM, its own Worker on qcrm.qntbr.com
    'login',
    'logout',
    'signup',
    'register',
    'signin',
    'signout',
    'account',
    'profile',
    'user',
    'users',
    
    // Common reserved
    'blog',
    'docs',
    'help',
    'support',
    'status',
    'about',
    'contact',
    'privacy',
    'terms',
    'legal',
    
    // Product/brand
    'qntbr',
    'quantbar',
    'quantum',
    'official',
    'team',
    'company',
    
    // Webhooks & realtime
    'webhook',
    'webhooks',
    'realtime',
    'ws',
    'wss',
    
    // Potentially confusing
    'admin-panel',
    'control',
    'root',
    'system',
    'internal',
    'private',
    
    // Short reserved (good ones you want to keep)
    'ai',
    'new',
    'old',
    'dev',
    'prod',
    'beta',
    'alpha',
    'live',
    'home',
    'main',
    'core',
    'hub',
    'vip',
    'pro',
    'lab',
    'ops',
    'sec',
    'io',
    'go',
    'my',
    
    // Profanity/abuse (add as needed)
    'fuck',
    'shit',
    'ass',
    // ... add more as needed
  ] as const;
  
  /**
   * Check if a subdomain is reserved for sandbox functionality
   */
  export function isSandboxSubdomain(subdomain: string): boolean {
    const normalized = subdomain.toLowerCase().trim();
    return SANDBOX_SUBDOMAINS.includes(normalized as any);
  }
  
  /**
   * Check if a subdomain is banned/reserved
   */
  export function isBannedSubdomain(subdomain: string): boolean {
    const normalized = subdomain.toLowerCase().trim();
    return BANNED_SUBDOMAINS.includes(normalized as any);
  }
  
  /**
   * True for sandbox and banned names.
   * Some of these (eqosys, qcrm) are served by other Workers on their own domains.
   */
  export function isReservedSubdomain(subdomain: string): boolean {
    return isSandboxSubdomain(subdomain) || isBannedSubdomain(subdomain);
  }
