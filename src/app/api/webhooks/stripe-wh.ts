// app/api/webhooks/stripe-wh.ts
import { getStripe } from '@/app/lib/stripe/client'
import { STRIPE_CONFIG } from '@/app/lib/stripe/config'
import { db } from '@/db'
import type Stripe from 'stripe'

export default async function handler({ request }: { request: Request }) {
  const stripe = getStripe()
  const signature = request.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }
  
  const body = await request.text()
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return new Response('Invalid signature', { status: 400 })
  }
  
  console.log(`🔔 Stripe webhook: ${event.type}`)
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
    }
    
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response('Webhook error', { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return
  
  console.log(`✅ Checkout completed for user ${userId}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }
  
  // Determine tier from price ID
  const priceId = subscription.items.data[0]?.price.id
  let tier: 'starter' | 'pro' | 'free' = 'free'
  
  if (priceId === STRIPE_CONFIG.prices.starter) {
    tier = 'starter'
  } else if (priceId === STRIPE_CONFIG.prices.pro) {
    tier = 'pro'
  }
  
  await db.stripeSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: JSON.stringify(subscription),
    },
    update: {
      tier,
      status: subscription.status,
      stripePriceId: priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      metadata: JSON.stringify(subscription),
    },
  })
  
  console.log(`✅ Subscription updated: ${userId} → ${tier}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.stripeSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
      tier: 'free',
    },
  })
  
  console.log(`✅ Subscription canceled: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return
  
  await db.stripeSubscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: 'active' },
  })
  
  console.log(`✅ Payment succeeded: ${subscriptionId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return
  
  await db.stripeSubscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: 'past_due' },
  })
  
  console.log(`⚠️ Payment failed: ${subscriptionId}`)
}