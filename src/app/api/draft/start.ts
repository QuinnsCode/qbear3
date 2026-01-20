// app/api/draft/start.ts
import { env } from "cloudflare:workers"
import { DEFAULT_DRAFT_CONFIG } from "@/app/types/Draft"
import type { DraftConfig, DraftPlayer, CubeCard } from "@/app/types/Draft"

export default async function handler({ request, ctx }: any) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  try {
    const body = await request.json()
    const { cubeCards, config, aiCount } = body as {
      cubeCards: CubeCard[]
      config?: Partial<DraftConfig>
      aiCount?: number
    }
    
    if (!cubeCards || cubeCards.length < 360) {
      return Response.json({ error: 'Need at least 360 cards for draft' }, { status: 400 })
    }
    
    // Generate draft ID
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    // Merge config
    const draftConfig: DraftConfig = {
      ...DEFAULT_DRAFT_CONFIG,
      ...config
    }
    
    // Create players
    const players: DraftPlayer[] = []
    
    // Human player
    players.push({
      id: ctx.user?.id || `guest-${crypto.randomUUID()}`,
      name: ctx.user?.name || 'You',
      isAI: false,
      draftPool: []
    })
    
    // AI players
    const aiPlayerCount = aiCount !== undefined ? aiCount : draftConfig.playerCount - 1
    for (let i = 0; i < aiPlayerCount; i++) {
      players.push({
        id: `ai-${i}`,
        name: `AI ${i + 1}`,
        isAI: true,
        draftPool: []
      })
    }
    
    // Get DO stub
    const id = env.DRAFT_DO.idFromName(draftId)
    const stub = env.DRAFT_DO.get(id)
    
    // Start draft
    const response = await stub.fetch(new Request('https://fake-host/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cubeCards, config: draftConfig, players })
    }))
    
    if (!response.ok) {
      throw new Error('Failed to start draft')
    }
    
    const state = await response.json()
    
    return Response.json({ 
      success: true, 
      draftId,
      state 
    })
    
  } catch (error: any) {
    console.error('Error starting draft:', error)
    return Response.json({ 
      error: error.message || 'Failed to start draft' 
    }, { status: 500 })
  }
}