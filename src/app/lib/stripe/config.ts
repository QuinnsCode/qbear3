// app/lib/stripe/config.ts
import { env } from 'cloudflare:workers'

export const STRIPE_CONFIG = {
  secretKey: env.STRIPE_SECRET_KEY!,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET!,
  
  prices: {
    starter: env.STRIPE_STARTER_PRICE_ID!, // Your $1/month price
    pro: env.STRIPE_PRO_PRICE_ID!,         // Your $5/month price
  },
  
  baseUrl: env.BETTER_AUTH_URL || 'https://qntbr.com'
} as const

export function getStripePriceId(tier: 'starter' | 'pro'): string {
  return STRIPE_CONFIG.prices[tier]
}