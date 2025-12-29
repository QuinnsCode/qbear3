// app/lib/subscriptions/tiers.ts
import type { User, StripeSubscription, SqueezeSubscription } from '@/db'

export const SQUEEZE_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    features: {
      maxGamesPerOrg: 3,
      maxPlayersPerGame: 4,
      maxDecksPerUser: 2, // ✅ ADDED
      canUseDiscord: false,
      prioritySupport: false,
    },
    description: 'Perfect for trying out QNTBR',
  },
  
  starter: {
    id: 'starter',
    name: 'QNTBR Founding Starter',
    price: 1,
    interval: 'month',
    features: {
      maxGamesPerOrg: 5,
      maxPlayersPerGame: 6,
      maxDecksPerUser: 5, // ✅ ADDED
      canUseDiscord: false,
      prioritySupport: true,
    },
    description: 'Great for small groups',
  },
  
  pro: {
    id: 'pro',
    name: 'QNTBR Founding Pro',
    price: 5,
    interval: 'month',
    features: {
      maxGamesPerOrg: 10,
      maxPlayersPerGame: 8,
      maxDecksPerUser: 12, // ✅ ADDED
      canUseDiscord: true,
      prioritySupport: true,
    },
    description: 'For power users and large groups',
  },
} as const

export type SqueezeTier = keyof typeof SQUEEZE_TIERS

// ✅ NEW: Get subscription from either Stripe or LemonSqueezy
function getActiveSubscription(user: { 
  stripeSubscription?: StripeSubscription | null, 
  squeezeSubscription?: SqueezeSubscription | null 
} | null): { tier: string; status: string; currentPeriodEnd?: Date | null } | null {
  if (!user) return null
  
  // Prefer Stripe (newer)
  if (user.stripeSubscription) {
    return {
      tier: user.stripeSubscription.tier,
      status: user.stripeSubscription.status,
      currentPeriodEnd: user.stripeSubscription.currentPeriodEnd
    }
  }
  
  // Fallback to LemonSqueezy (legacy)
  if (user.squeezeSubscription) {
    return {
      tier: user.squeezeSubscription.tier,
      status: user.squeezeSubscription.status,
      currentPeriodEnd: user.squeezeSubscription.currentPeriodEnd
    }
  }
  
  return null
}

// Helper to get tier config
export function getTierConfig(tier: SqueezeTier) {
  return SQUEEZE_TIERS[tier]
}

// ✅ UPDATED: Now checks both sources
export function canCreateGame(user: any, currentGameCount: number) {
  const subscription = getActiveSubscription(user)
  const tier = subscription?.tier || 'free'
  const config = getTierConfig(tier as SqueezeTier)
  return currentGameCount < config.features.maxGamesPerOrg
}

// ✅ NEW: Check if user can create another deck
export function canCreateDeck(user: any, currentDeckCount: number) {
  const subscription = getActiveSubscription(user)
  const tier = subscription?.tier || 'free'
  const config = getTierConfig(tier as SqueezeTier)
  return currentDeckCount < config.features.maxDecksPerUser
}

// ✅ UPDATED: Now checks both sources
export function canAddPlayer(user: any, currentPlayerCount: number) {
  const subscription = getActiveSubscription(user)
  const tier = subscription?.tier || 'free'
  const config = getTierConfig(tier as SqueezeTier)
  return currentPlayerCount < config.features.maxPlayersPerGame
}

// ✅ UPDATED: Now checks both sources
export function isSubscriptionActive(user: any): boolean {
  const subscription = getActiveSubscription(user)
  if (!subscription) return true // Free tier is always "active"
  
  // Check status
  if (subscription.status !== 'active') return false
  
  // Check if expired
  if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
    return false
  }
  
  return true
}

// ✅ UPDATED: Now checks both sources
export function getEffectiveTier(user: any): SqueezeTier {
  const subscription = getActiveSubscription(user)
  if (!subscription) return 'free'
  if (!isSubscriptionActive(user)) return 'free'
  
  return subscription.tier as SqueezeTier
}