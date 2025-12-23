// app/serverActions/stripe/createCheckoutSession.ts
'use server'

import { getStripe } from '@/app/lib/stripe/client'
import { STRIPE_CONFIG, getStripePriceId } from '@/app/lib/stripe/config'
import { db } from '@/db'

export async function createStripeCheckoutSession(
  userId: string,
  tier: 'starter' | 'pro'
): Promise<{ url?: string; error?: string }> {
  try {
    const stripe = getStripe()
    
    // Get or create Stripe customer
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { stripeSubscription: true }
    })
    
    if (!user) {
      return { error: 'User not found' }
    }
    
    let customerId = user.stripeSubscription?.stripeCustomerId
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId }
      })
      customerId = customer.id
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: getStripePriceId(tier),
          quantity: 1,
        },
      ],
      success_url: `${STRIPE_CONFIG.baseUrl}/pricing?success=true`,
      cancel_url: `${STRIPE_CONFIG.baseUrl}/pricing?canceled=true`,
      metadata: {
        userId,
        tier,
      },
    })
    
    return { url: session.url || undefined }
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create checkout session' }
  }
}