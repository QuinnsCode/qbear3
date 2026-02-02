// lib/auth/adminCheck.ts

/**
 * Admin role system
 * - SUPER_ADMIN: Full access to everything (repo owner only)
 * - ADMIN: Can access admin panel but not super sensitive stuff
 * - USER: Regular user, no admin access
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Super admin user IDs (hardcoded - only repo owner)
 * Add your user ID here!
 */
const SUPER_ADMIN_IDS = [
  // TODO: Add your user ID here
  // Example: 'abc123-def456-ghi789'
  'BBJx2nLppYEVEbRUYJBXfk1u4iPxtgqX'
];

/**
 * Super admin emails (fallback if user ID not set yet)
 */
const SUPER_ADMIN_EMAILS = [
  // TODO: Add your email here
  // Example: 'ryan@example.com'
  'notryanquinn@gmail.com'
];

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: { id: string; email?: string | null; role?: string | null }): boolean {
  // Check by ID
  if (SUPER_ADMIN_IDS.includes(user.id)) {
    return true;
  }

  // Check by email
  if (user.email && SUPER_ADMIN_EMAILS.includes(user.email)) {
    return true;
  }

  // Check by role field
  if (user.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  return false;
}

/**
 * Check if user is any kind of admin (super admin or regular admin)
 */
export function isAdmin(user: { id: string; email?: string | null; role?: string | null }): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }

  if (user.role === ROLES.ADMIN) {
    return true;
  }

  return false;
}

/**
 * Require super admin access - throws error if not super admin
 */
export function requireSuperAdmin(user: { id: string; email?: string | null; role?: string | null } | null): void {
  if (!user) {
    throw new Error('Authentication required');
  }

  if (!isSuperAdmin(user)) {
    throw new Error('Super admin access required');
  }
}

/**
 * Require admin access - throws error if not admin
 */
export function requireAdmin(user: { id: string; email?: string | null; role?: string | null } | null): void {
  if (!user) {
    throw new Error('Authentication required');
  }

  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
}
