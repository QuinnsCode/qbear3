// src/lib/rateLimit.ts
import { env } from "cloudflare:workers"

export type RateLimitScope = 
  | 'cgsync'        // Card game WebSocket connections
  | 'gsync'         // Board game WebSocket connections  
  | 'draftsync'     // draft websocket connections
  | 'api'           // General API calls
  | 'deck-import'   // Deck import operations
  | 'deck-create'   // Deck creation
  | 'auth'          // Login attempts
  | 'signup'        // Signup attempts

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number // Time window in milliseconds
}

export const RATE_LIMITS: Record<RateLimitScope, RateLimitConfig> = {
  'cgsync': { maxRequests: 10, windowMs: 60_000 },      // 10 connections per minute
  'draftsync': { maxRequests:10, windowMs: 60_000 },    // 10 connections per minute
  'gsync': { maxRequests: 10, windowMs: 60_000 },       // 10 connections per minute
  'api': { maxRequests: 100, windowMs: 60_000 },        // 100 calls per minute
  'deck-import': { maxRequests: 5, windowMs: 60_000 },  // 5 imports per minute
  'deck-create': { maxRequests: 10, windowMs: 60_000 }, // 10 decks per minute
  'auth': { maxRequests: 5, windowMs: 300_000 },        // 5 attempts per 5 minutes
  'signup': { maxRequests: 3, windowMs: 3600_000 },     // 3 signups per hour
}

interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
}

export async function checkRateLimit(
  scope: RateLimitScope,
  identifier: string, // IP, user ID, etc
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[scope]
  const now = Date.now()
  const windowStart = now - config.windowMs
  
  // Create time-based window key (truncate to window)
  const windowKey = Math.floor(now / config.windowMs)
  const key = `ratelimit:${scope}:${identifier}:${windowKey}`
  
  try {
    const existing = await env.RATELIMIT_KV.get<RateLimitEntry>(key, 'json')
    
    if (!existing) {
      // First request in this window
      await env.RATELIMIT_KV.put(
        key,
        JSON.stringify({
          count: 1,
          firstRequest: now,
          lastRequest: now
        } as RateLimitEntry),
        { expirationTtl: Math.ceil(config.windowMs / 1000) + 60 } // TTL slightly longer than window
      )
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs
      }
    }
    
    // Check if we're still in valid window
    if (existing.firstRequest < windowStart) {
      // Window expired, reset
      await env.RATELIMIT_KV.put(
        key,
        JSON.stringify({
          count: 1,
          firstRequest: now,
          lastRequest: now
        } as RateLimitEntry),
        { expirationTtl: Math.ceil(config.windowMs / 1000) + 60 }
      )
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs
      }
    }
    
    // Within window - check limit
    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.firstRequest + config.windowMs
      }
    }
    
    // Increment count
    await env.RATELIMIT_KV.put(
      key,
      JSON.stringify({
        ...existing,
        count: existing.count + 1,
        lastRequest: now
      } as RateLimitEntry),
      { expirationTtl: Math.ceil(config.windowMs / 1000) + 60 }
    )
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count - 1,
      resetAt: existing.firstRequest + config.windowMs
    }
    
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail open - allow request if rate limit check fails
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs
    }
  }
}

export function getRateLimitHeaders(result: { remaining: number; resetAt: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  }
}