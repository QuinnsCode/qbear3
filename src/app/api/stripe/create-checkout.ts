// @/app/api/stripe/create-checkout.ts
import { createStripeCheckoutSession } from '@/app/serverActions/stripe/createCheckoutSession'

export default async function handler({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const { userId, tier } = await request.json() as any
    
    if (!userId || !tier) {
      return Response.json({ error: 'Missing userId or tier' }, { status: 400 })
    }
    
    const result = await createStripeCheckoutSession(userId, tier)
    
    return Response.json(result)
  } catch (error) {
    console.error('Checkout API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}