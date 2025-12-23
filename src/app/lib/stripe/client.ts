// app/lib/stripe/client.ts
import Stripe from 'stripe'
import { env } from 'cloudflare:workers'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return stripeInstance
}