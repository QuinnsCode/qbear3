// app/serverActions/draft/makePick.ts
'use server'

import { env } from "cloudflare:workers"

export async function makePick(draftId: string, cardIds: string[], playerId: string) {
    try {
      const id = env.DRAFT_DO.idFromName(draftId)
      const stub = env.DRAFT_DO.get(id)
      
      // ✅ FIX: Match DraftAction type
      const response = await stub.fetch(new Request('https://fake-host/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'make_pick',     // ← ADD THIS
          playerId,
          data: { cardIds }      // ← WRAP IN data
        })
      }))
      
      if (!response.ok) {
        return { success: false, error: 'Failed to make pick' }
      }
      
      return { success: true }  // Don't return state, WebSocket handles it
      
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }