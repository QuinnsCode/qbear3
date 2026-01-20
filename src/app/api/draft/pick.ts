// app/api/draft/pick.ts
import { env } from "cloudflare:workers"

export default async function handler({ request, ctx }: any) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const body = await request.json()
    const { draftId, cardIds } = body as {
      draftId: string
      cardIds: string[]
    }
    
    if (!draftId || !cardIds || cardIds.length === 0) {
      return Response.json({ error: 'Missing draftId or cardIds' }, { status: 400 })
    }
    
    const playerId = ctx.user?.id || `guest-${crypto.randomUUID()}`
    
    // Get DO stub
    const id = env.DRAFT_DO.idFromName(draftId)
    const stub = env.DRAFT_DO.get(id)
    
    // Make pick
    const response = await stub.fetch(new Request('https://fake-host/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, cardIds })
    }))
    
    if (!response.ok) {
      const error = await response.json()
      return Response.json(error, { status: response.status })
    }
    
    const state = await response.json()
    
    return Response.json({ 
      success: true, 
      state 
    })
    
  } catch (error: any) {
    console.error('Error making pick:', error)
    return Response.json({ 
      error: error.message || 'Failed to make pick' 
    }, { status: 500 })
  }
}