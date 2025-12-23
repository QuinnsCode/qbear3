// app/serverActions/stripe/createPortalSession.ts
'use server'

import { getStripe } from '@/app/lib/stripe/client'
import { STRIPE_CONFIG } from '@/app/lib/stripe/config'
import { db } from '@/db'

export async function createStripePortalSession(
  userId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { stripeSubscription: true }
    })
    
    if (!user?.stripeSubscription?.stripeCustomerId) {
      return { error: 'No active subscription found' }
    }
    
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeSubscription.stripeCustomerId,
      return_url: `${STRIPE_CONFIG.baseUrl}/pricing`,
    })
    
    return { url: session.url }
  } catch (error) {
    console.error('Stripe portal error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create portal session' }
  }
}