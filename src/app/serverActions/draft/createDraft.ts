// app/serverActions/draft/createDraft.ts
'use server'

import { env } from "cloudflare:workers"
import type { DraftConfig, DraftPlayer, CubeCard } from "@/app/types/Draft"
import { DEFAULT_DRAFT_CONFIG } from "@/app/types/Draft"
import { loadVintageCube } from "./loadCube"

export async function createDraft(options: {
  config?: Partial<DraftConfig>
  aiCount?: number
  userId?: string
  userName?: string
}) {
  try {
    const { config, aiCount, userId, userName } = options
    
    // Load cube once, cached in worker memory
    const cubeCards = await loadVintageCube()
    
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    const draftConfig: DraftConfig = {
      ...DEFAULT_DRAFT_CONFIG,
      ...config
    }
    
    const players: DraftPlayer[] = [{
      id: userId || `guest-${crypto.randomUUID()}`,
      name: userName || 'You',
      isAI: false,
      draftPool: []
    }]
    
    const aiPlayerCount = aiCount !== undefined ? aiCount : draftConfig.playerCount - 1
    for (let i = 0; i < aiPlayerCount; i++) {
      players.push({
        id: `ai-${i}`,
        name: `AI ${i + 1}`,
        isAI: true,
        draftPool: []
      })
    }
    
    const id = env.DRAFT_DO.idFromName(draftId)
    const stub = env.DRAFT_DO.get(id)
    
    const response = await stub.fetch(new Request('https://fake-host/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cubeCards, config: draftConfig, players })
      }))
      
    // ✅ ADD THIS CHECK
    if (!response.ok) {
    const error = await response.text()
    console.error('❌ Failed to start draft:', error)
    return { success: false, error: 'Failed to start draft' }
    }
    
    const startedState = await response.json()
    console.log('✅ Draft started:', startedState)
    
    return { success: true, draftId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}