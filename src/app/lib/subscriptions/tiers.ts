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
      maxCommanderDecks: 2,  // ✅ Separate limits per format
      maxDraftDecks: 10,
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
      maxCommanderDecks: 5,
      maxDraftDecks: 20,
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
      maxCommanderDecks: 20,
      maxDraftDecks: 50,
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

// ✅ User-specific overrides for testing accounts
export function getUserTierOverride(userEmail?: string): Partial<typeof SQUEEZE_TIERS['free']['features']> | null {
  const TESTING_EMAILS = [
    'notryanquinn@gmail.com',  // Ryan's testing account
  ]

  if (userEmail && TESTING_EMAILS.includes(userEmail.toLowerCase())) {
    return {
      maxCommanderDecks: 100,
      maxDraftDecks: 100,
      maxGamesPerOrg: 100,
      maxPlayersPerGame: 16,
    }
  }

  return null
}

// Helper to get tier config (with optional user override by email)
export function getTierConfig(tier: SqueezeTier, userEmail?: string) {
  const config = SQUEEZE_TIERS[tier]

  // Apply override if exists
  const override = userEmail ? getUserTierOverride(userEmail) : null
  if (override) {
    return {
      ...config,
      features: { ...config.features, ...override }
    }
  }

  return config
}

// ✅ UPDATED: Now checks both sources + user overrides
export function canCreateGame(user: any, currentGameCount: number) {
  const subscription = getActiveSubscription(user)
  const tier = subscription?.tier || 'free'
  const config = getTierConfig(tier as SqueezeTier, user?.email)
  return currentGameCount < config.features.maxGamesPerOrg
}

// ✅ UPDATED: Check if user can create another deck + user overrides (per format)
export function canCreateDeck(user: any, currentCommanderDecks: number, currentDraftDecks: number, format: 'commander' | 'draft') {
  const subscription = getActiveSubscription(user)
  const tier = subscription?.tier || 'free'
  const config = getTierConfig(tier as SqueezeTier, user?.email)

  if (format === 'commander') {
    return currentCommanderDecks < config.features.maxCommanderDecks
  } else {
    return currentDraftDecks < config.features.maxDraftDecks
  }
}

// ✅ UPDATED: Now checks both sources + user overrides
export function canAddPlayer(user: any, currentPlayerCount: number) {
  const subscription = getActiveSubscription(user)
  const tier = subscription?.tier || 'free'
  const config = getTierConfig(tier as SqueezeTier, user?.email)
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