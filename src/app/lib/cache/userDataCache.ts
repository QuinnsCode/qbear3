"use server"

import { env } from "cloudflare:workers"

/**
 * User data caching layer to reduce database queries
 * Uses AUTH_CACHE_KV for fast cached lookups
 */
  
export type CachedUserProfile = {
  id: string
  name: string | null
  email: string
  image: string | null
  tier: string
  hasDiscord: boolean
  tierLimits: {
    maxGames: number
    maxPlayers: number
    maxDecks: number
  }
  cachedAt: number
}

export type CachedSocialData = {
  friends: any[]
  friendRequests: { incoming: any[]; outgoing: any[] }
  gameInvites: { received: any[]; sent: any[] }
  cachedAt: number
}

const CACHE_TTL = {
  USER_PROFILE: 300,      // 5 minutes - subscription data changes rarely
  SOCIAL_DATA: 60,        // 1 minute - friend requests/invites can change
  DISCORD_STATUS: 600,    // 10 minutes - very rarely changes
}

/**
 * Get cached user profile or return null if not cached/expired
 */
export async function getCachedUserProfile(userId: string): Promise<CachedUserProfile | null> {
  try {
    if (!env?.AUTH_CACHE_KV) return null

    const cached = await env.AUTH_CACHE_KV.get(`user:profile:${userId}`, 'json')
    if (!cached) return null

    const profile = cached as CachedUserProfile
    const age = Date.now() - profile.cachedAt

    // Invalidate if older than TTL
    if (age > CACHE_TTL.USER_PROFILE * 1000) {
      return null
    }

    return profile
  } catch (error) {
    console.error('[Cache] Error reading user profile cache:', error)
    return null
  }
}

/**
 * Cache user profile data
 */
export async function setCachedUserProfile(profile: CachedUserProfile): Promise<void> {
  try {
    if (!env?.AUTH_CACHE_KV) return

    await env.AUTH_CACHE_KV.put(
      `user:profile:${profile.id}`,
      JSON.stringify(profile),
      { expirationTtl: CACHE_TTL.USER_PROFILE }
    )
  } catch (error) {
    console.error('[Cache] Error writing user profile cache:', error)
  }
}

/**
 * Get cached social data (friends, requests, invites)
 */
export async function getCachedSocialData(userId: string): Promise<CachedSocialData | null> {
  try {
    if (!env?.AUTH_CACHE_KV) return null

    const cached = await env.AUTH_CACHE_KV.get(`user:social:${userId}`, 'json')
    if (!cached) return null

    const socialData = cached as CachedSocialData
    const age = Date.now() - socialData.cachedAt

    // Invalidate if older than TTL
    if (age > CACHE_TTL.SOCIAL_DATA * 1000) {
      return null
    }

    return socialData
  } catch (error) {
    console.error('[Cache] Error reading social data cache:', error)
    return null
  }
}

/**
 * Cache social data
 */
export async function setCachedSocialData(userId: string, data: Omit<CachedSocialData, 'cachedAt'>): Promise<void> {
  try {
    if (!env?.AUTH_CACHE_KV) return

    const cacheData: CachedSocialData = {
      ...data,
      cachedAt: Date.now()
    }

    await env.AUTH_CACHE_KV.put(
      `user:social:${userId}`,
      JSON.stringify(cacheData),
      { expirationTtl: CACHE_TTL.SOCIAL_DATA }
    )
  } catch (error) {
    console.error('[Cache] Error writing social data cache:', error)
  }
}

/**
 * Invalidate user profile cache (call when user updates profile or subscription)
 */
export async function invalidateUserProfile(userId: string): Promise<void> {
  try {
    if (!env?.AUTH_CACHE_KV) return
    await env.AUTH_CACHE_KV.delete(`user:profile:${userId}`)
  } catch (error) {
    console.error('[Cache] Error invalidating user profile cache:', error)
  }
}

/**
 * Invalidate social data cache (call when friends/requests/invites change)
 */
export async function invalidateSocialData(userId: string): Promise<void> {
  try {
    if (!env?.AUTH_CACHE_KV) return
    await env.AUTH_CACHE_KV.delete(`user:social:${userId}`)
  } catch (error) {
    console.error('[Cache] Error invalidating social data cache:', error)
  }
}
