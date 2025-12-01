// @/lib/subdomains.ts

/**
 * Reserved subdomains that trigger sandbox/special behavior
 * These are system-reserved and cannot be registered as organizations
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
   * These cannot be registered as organizations
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
   * Minimum subdomain length for user registration
   * Set to 6 to reserve short, valuable subdomains
   */
  export const MIN_SUBDOMAIN_LENGTH = 6;
  
  /**
   * Maximum subdomain length (DNS limit)
   */
  export const MAX_SUBDOMAIN_LENGTH = 63;
  
  /**
   * All reserved subdomains (sandbox + banned)
   */
  export const ALL_RESERVED_SUBDOMAINS = [
    ...SANDBOX_SUBDOMAINS,
    ...BANNED_SUBDOMAINS,
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
   * Check if a subdomain is available for registration
   * Returns { available: boolean, reason?: string }
   */
  export function isSubdomainAvailable(subdomain: string): {
    available: boolean;
    reason?: string;
  } {
    const normalized = subdomain.toLowerCase().trim();
    
    // Check minimum length (reserve short subdomains)
    if (normalized.length < MIN_SUBDOMAIN_LENGTH) {
      return { 
        available: false, 
        reason: `Subdomain must be at least ${MIN_SUBDOMAIN_LENGTH} characters` 
      };
    }
    
    // Check maximum length
    if (normalized.length > MAX_SUBDOMAIN_LENGTH) {
      return { 
        available: false, 
        reason: `Subdomain must be less than ${MAX_SUBDOMAIN_LENGTH} characters` 
      };
    }
    
    // Check valid characters (alphanumeric and hyphens, no leading/trailing hyphens)
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
      return { 
        available: false, 
        reason: 'Subdomain can only contain letters, numbers, and hyphens (not at start/end)' 
      };
    }
    
    // Check if it's a sandbox subdomain
    if (isSandboxSubdomain(normalized)) {
      return { available: false, reason: 'This subdomain is reserved for sandbox use' };
    }
    
    // Check if it's banned
    if (isBannedSubdomain(normalized)) {
      return { available: false, reason: 'This subdomain is not available' };
    }
    
    return { available: true };
  }
  
  /**
   * Validate subdomain for organization creation
   * Throws error if invalid
   */
  export function validateSubdomainForOrg(subdomain: string): void {
    const check = isSubdomainAvailable(subdomain);
    if (!check.available) {
      throw new Error(check.reason || 'Subdomain is not available');
    }
  }