// app/api/webhooks/lemonsqueezy-wh.ts
import { db } from '@/db'
import { env } from 'cloudflare:workers'

interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string
    custom_data?: {
      user_id?: string
    }
  }
  data: {
    id: string
    type: string
    attributes: {
      customer_id: number
      variant_id: number
      status: string
      created_at: string
      updated_at: string
      renews_at?: string
      ends_at?: string
      test_mode: boolean
    }
  }
}

export default async function handler({ request, ctx }: { request: Request; ctx: any }) {
  console.log('🍋 Lemon Squeezy webhook received')

  // 1. Verify webhook signature
  const signature = request.headers.get('X-Signature')
  if (!signature) {
    console.error('❌ Missing X-Signature header')
    return new Response('Missing signature', { status: 401 })
  }

  const body = await request.text()
  
  // Verify signature using HMAC
  const isValid = await verifyWebhookSignature(body, signature, env.LEMON_SQUEEZY_WEBHOOK_SECRET)
  
  if (!isValid) {
    console.error('❌ Invalid webhook signature')
    return new Response('Invalid signature', { status: 401 })
  }

  // 2. Parse event
  let event: LemonSqueezyWebhookEvent
  try {
    event = JSON.parse(body)
  } catch (error) {
    console.error('❌ Failed to parse webhook body:', error)
    return new Response('Invalid JSON', { status: 400 })
  }

  console.log(`📨 Event type: ${event.meta.event_name}`)

  // 3. Handle different event types
  try {
    switch (event.meta.event_name) {
      case 'subscription_created':
        await handleSubscriptionCreated(event)
        break

      case 'subscription_updated':
        await handleSubscriptionUpdated(event)
        break

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event)
        break

      case 'subscription_resumed':
        await handleSubscriptionResumed(event)
        break

      case 'subscription_expired':
        await handleSubscriptionExpired(event)
        break

      case 'subscription_paused':
        await handleSubscriptionPaused(event)
        break

      case 'subscription_unpaused':
        await handleSubscriptionUnpaused(event)
        break

      case 'subscription_payment_success':
        await handlePaymentSuccess(event)
        break

      case 'subscription_payment_failed':
        await handlePaymentFailed(event)
        break

      default:
        console.log(`ℹ️ Unhandled event type: ${event.meta.event_name}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return new Response('Internal error', { status: 500 })
  }
}

// ============================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    )

    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return computedSignature === signature
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleSubscriptionCreated(event: LemonSqueezyWebhookEvent) {
  const userId = event.meta.custom_data?.user_id
  
  if (!userId) {
    console.error('❌ No user_id in custom_data')
    return
  }

  // Determine tier from variant ID
  const variantId = event.data.attributes.variant_id.toString()
  let tier: 'starter' | 'pro' = 'starter'
  
  if (variantId === env.LEMON_SQUEEZY_PRO_VARIANT_ID) {
    tier = 'pro'
  } else if (variantId === env.LEMON_SQUEEZY_STARTER_VARIANT_ID) {
    tier = 'starter'
  } else {
    console.error(`❌ Unknown variant ID: ${variantId}`)
    return
  }

  // Create or update subscription
  await db.squeezeSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: 'active',
      source: 'lemonsqueezy',
      lemonSqueezySubscriptionId: event.data.id,
      lemonSqueezyCustomerId: event.data.attributes.customer_id.toString(),
      lemonSqueezyVariantId: variantId,
      currentPeriodStart: new Date(event.data.attributes.created_at),
      currentPeriodEnd: event.data.attributes.renews_at 
        ? new Date(event.data.attributes.renews_at)
        : null,
      metadata: JSON.stringify(event.data),
    },
    update: {
      tier,
      status: 'active',
      source: 'lemonsqueezy',
      lemonSqueezySubscriptionId: event.data.id,
      currentPeriodEnd: event.data.attributes.renews_at
        ? new Date(event.data.attributes.renews_at)
        : null,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription created: User ${userId} → ${tier}`)
}

async function handleSubscriptionUpdated(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: event.data.attributes.status === 'active' ? 'active' : 'inactive',
      currentPeriodEnd: event.data.attributes.renews_at
        ? new Date(event.data.attributes.renews_at)
        : null,
      metadata: JSON.stringify(event.data),
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription updated: ${subscriptionId}`)
}

async function handleSubscriptionCancelled(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: 'cancelled',
      endsAt: event.data.attributes.ends_at
        ? new Date(event.data.attributes.ends_at)
        : null,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription cancelled: ${subscriptionId}`)
}

async function handleSubscriptionResumed(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: 'active',
      endsAt: null,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription resumed: ${subscriptionId}`)
}

async function handleSubscriptionExpired(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: 'expired',
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription expired: ${subscriptionId}`)
}

async function handleSubscriptionPaused(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: 'paused',
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription paused: ${subscriptionId}`)
}

async function handleSubscriptionUnpaused(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: 'active',
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Subscription unpaused: ${subscriptionId}`)
}

async function handlePaymentSuccess(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  // Update period dates on successful payment
  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      currentPeriodStart: new Date(event.data.attributes.updated_at),
      currentPeriodEnd: event.data.attributes.renews_at
        ? new Date(event.data.attributes.renews_at)
        : null,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Payment successful: ${subscriptionId}`)
}

async function handlePaymentFailed(event: LemonSqueezyWebhookEvent) {
  const subscriptionId = event.data.id

  await db.squeezeSubscription.update({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: {
      status: 'past_due',
      updatedAt: new Date(),
    },
  })

  console.log(`⚠️ Payment failed: ${subscriptionId}`)
}