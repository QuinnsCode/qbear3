// @/lib/cache/authCache.ts
/**
 * Auth Cache Layer - KV-based caching for auth middleware
 * Reduces D1 query load by caching sessions, users, orgs, and memberships
 */

import { env } from "cloudflare:workers";
import { db, type User, type Session, type Organization, type Member } from "@/db";

const CACHE_TTL = {
  SESSION: 300, // 5 minutes - sessions are semi-ephemeral
  USER: 600, // 10 minutes - user profiles change infrequently
  ORGANIZATION: 600, // 10 minutes - orgs change infrequently
  MEMBER: 300, // 5 minutes - memberships can change
} as const;

// ============================================
// Session Caching
// ============================================

export async function getCachedSession(token: string): Promise<Session | null> {
  try {
    // Try cache first
    const cached = await env.AUTH_CACHE_KV.get(`session:${token}`);
    if (cached) {
      const session = JSON.parse(cached) as Session;

      // Check expiry
      if (new Date(session.expiresAt) > new Date()) {
        return session;
      }

      // Expired - delete from cache
      await env.AUTH_CACHE_KV.delete(`session:${token}`);
      return null;
    }

    // Cache miss - query D1
    const session = await db.session.findUnique({
      where: { token }
    });

    if (!session) return null;

    // Check expiry before caching
    if (new Date(session.expiresAt) <= new Date()) {
      return null;
    }

    // Store in cache
    await env.AUTH_CACHE_KV.put(
      `session:${token}`,
      JSON.stringify(session),
      { expirationTtl: CACHE_TTL.SESSION }
    );

    return session;
  } catch (error) {
    console.error("Session cache error:", error);
    // Fallback to D1 on cache failure
    return db.session.findUnique({ where: { token } });
  }
}

export async function invalidateSession(token: string): Promise<void> {
  await env.AUTH_CACHE_KV.delete(`session:${token}`);
}

// ============================================
// User Caching
// ============================================

export async function getCachedUser(userId: string): Promise<User | null> {
  try {
    // Try cache first
    const cached = await env.AUTH_CACHE_KV.get(`user:${userId}`);
    if (cached) {
      return JSON.parse(cached) as User;
    }

    // Cache miss - query D1
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) return null;

    // Store in cache
    await env.AUTH_CACHE_KV.put(
      `user:${userId}`,
      JSON.stringify(user),
      { expirationTtl: CACHE_TTL.USER }
    );

    return user;
  } catch (error) {
    console.error("User cache error:", error);
    return db.user.findUnique({ where: { id: userId } });
  }
}

export async function invalidateUser(userId: string): Promise<void> {
  await env.AUTH_CACHE_KV.delete(`user:${userId}`);
}

// ============================================
// Organization Caching
// ============================================

export async function getCachedOrganization(slug: string): Promise<Organization | null> {
  try {
    // Try cache first
    const cached = await env.AUTH_CACHE_KV.get(`org:${slug}`);
    if (cached) {
      return JSON.parse(cached) as Organization;
    }

    // Cache miss - query D1
    const org = await db.organization.findUnique({
      where: { slug }
    });

    if (!org) return null;

    // Store in cache
    await env.AUTH_CACHE_KV.put(
      `org:${slug}`,
      JSON.stringify(org),
      { expirationTtl: CACHE_TTL.ORGANIZATION }
    );

    return org;
  } catch (error) {
    console.error("Organization cache error:", error);
    return db.organization.findUnique({ where: { slug } });
  }
}

export async function invalidateOrganization(slug: string): Promise<void> {
  await env.AUTH_CACHE_KV.delete(`org:${slug}`);
}

// ============================================
// Member Caching
// ============================================

export async function getCachedMember(
  userId: string,
  organizationId: string
): Promise<Member | null> {
  try {
    // Try cache first
    const cacheKey = `member:${userId}:${organizationId}`;
    const cached = await env.AUTH_CACHE_KV.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Member;
    }

    // Cache miss - query D1
    const member = await db.member.findFirst({
      where: {
        userId,
        organizationId
      }
    });

    if (!member) {
      // Cache negative result to avoid repeated queries
      await env.AUTH_CACHE_KV.put(cacheKey, "null", {
        expirationTtl: 60 // Short TTL for negative cache
      });
      return null;
    }

    // Store in cache
    await env.AUTH_CACHE_KV.put(
      cacheKey,
      JSON.stringify(member),
      { expirationTtl: CACHE_TTL.MEMBER }
    );

    return member;
  } catch (error) {
    console.error("Member cache error:", error);
    return db.member.findFirst({
      where: { userId, organizationId }
    });
  }
}

export async function getCachedUserMemberships(userId: string): Promise<Member[]> {
  try {
    // Try cache first
    const cacheKey = `memberships:${userId}`;
    const cached = await env.AUTH_CACHE_KV.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Member[];
    }

    // Cache miss - query D1
    const memberships = await db.member.findMany({
      where: { userId },
      take: 10 // Reasonable limit
    });

    // Store in cache
    await env.AUTH_CACHE_KV.put(
      cacheKey,
      JSON.stringify(memberships),
      { expirationTtl: CACHE_TTL.MEMBER }
    );

    return memberships;
  } catch (error) {
    console.error("Memberships cache error:", error);
    return db.member.findMany({ where: { userId }, take: 10 });
  }
}

export async function invalidateMember(userId: string, organizationId: string): Promise<void> {
  await Promise.all([
    env.AUTH_CACHE_KV.delete(`member:${userId}:${organizationId}`),
    env.AUTH_CACHE_KV.delete(`memberships:${userId}`)
  ]);
}

// ============================================
// Batch Invalidation (for write operations)
// ============================================

export async function invalidateUserContext(userId: string): Promise<void> {
  // Invalidate user and all their memberships
  await Promise.all([
    env.AUTH_CACHE_KV.delete(`user:${userId}`),
    env.AUTH_CACHE_KV.delete(`memberships:${userId}`)
  ]);
}
