// app/serverActions/draft/exportDeck.ts
'use server'

import { env } from "cloudflare:workers"

export async function exportDeck(draftId: string, playerId: string) {
  try {
    const id = env.DRAFT_DO.idFromName(draftId)
    const stub = env.DRAFT_DO.get(id)
    
    const response = await stub.fetch(new Request(`https://fake-host/export/${playerId}`, {
      method: 'GET'
    }))
    
    if (!response.ok) {
      return { success: false, error: 'Failed to export deck' }
    }
    
    const deck = await response.json()
    return { success: true, deck }
    
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}