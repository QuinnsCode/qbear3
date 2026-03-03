// app/serverActions/draft/createDraft.ts
'use server'

import { env } from "cloudflare:workers"
import type { DraftConfig, DraftPlayer } from "@/app/types/Draft"
import { DEFAULT_DRAFT_CONFIG } from "@/app/types/Draft"
import { loadVintageCube } from "./loadCube"
import { canCreateDraft, trackNewDraft } from "./draftTracking"

export async function createDraft(options: {
  config?: Partial<DraftConfig>
  aiCount?: number
  userId?: string
  userName?: string
}) {
  try {
    const { config, aiCount, userId, userName } = options
    
    console.log('🎴 [createDraft] Received:', { userId, userName })
    
    // ✅ CRITICAL: Validate we have a userId
    if (!userId) {
      console.error('❌ [createDraft] No userId provided!')
      return { success: false, error: 'User ID required' }
    }

    // ✅ Check if user can create a new draft (limit check)
    const limitCheck = await canCreateDraft(userId)
    if (!limitCheck.canCreate) {
      console.log('⚠️ [createDraft] Draft limit reached for user:', userId)
      return { success: false, error: limitCheck.reason }
    }

    // Load cube
    const cubeCards = await loadVintageCube()
    
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    const draftConfig: DraftConfig = {
      ...DEFAULT_DRAFT_CONFIG,
      ...config
    }
    
    // ✅ Use the provided userId directly - NO fallback generation
    const players: DraftPlayer[] = [{
      id: userId,
      name: userName || 'Guest',
      isAI: false,
      draftPool: []
    }]
    
    console.log('🎴 [createDraft] Creating player with ID:', userId)
    
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
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ [createDraft] Failed to start draft:', error)
      return { success: false, error: 'Failed to start draft' }
    }
    
    const startedState = await response.json()
    console.log('✅ [createDraft] Draft started:', draftId)

    // ✅ Track the new draft in KV
    await trackNewDraft({
      draftId,
      userId,
      userName: userName || 'Guest',
      status: 'in_progress',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      packNumber: 1,
      pickNumber: 0,
      totalPacks: draftConfig.packsPerPlayer,
      totalPicks: draftConfig.cardsPerPack,
      playerCount: players.length
    })
    console.log('✅ [createDraft] Draft tracked in KV:', draftId)

    // ✅ Return the userId so form can set cookie before redirect
    return {
      success: true,
      draftId,
      userId  // Return this so form knows which ID was used
    }
  } catch (error: any) {
    console.error('❌ [createDraft] Exception:', error)
    return { success: false, error: error.message }
  }
}