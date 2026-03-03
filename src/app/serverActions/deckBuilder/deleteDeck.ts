// app/serverActions/deckBuilder/deleteDeck.ts
'use server'

import { db } from '@/db'
import { env } from 'cloudflare:workers'

export async function deleteDeck(userId: string, deckId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Verify deck exists and user owns it
    const deck = await db.deck.findUnique({
      where: { id: deckId }
    })

    if (!deck) {
      return { success: false, error: 'Deck not found' }
    }

    if (deck.userId !== userId) {
      return { success: false, error: 'You do not have permission to delete this deck' }
    }

    // Delete the deck from database
    await db.deck.delete({
      where: { id: deckId }
    })

    // Clean up from KV cache
    try {
      const key = `decks:${userId}`
      const cached = await env.DECKS_KV.get(key, 'json')

      if (cached && Array.isArray(cached)) {
        const updated = cached.filter((d: any) => d.id !== deckId)
        await env.DECKS_KV.put(key, JSON.stringify(updated))
      }
    } catch (kvError) {
      console.error('Failed to clean KV cache:', kvError)
      // Don't fail the whole operation if KV cleanup fails
    }

    console.log(`✅ Deleted deck ${deckId} for user ${userId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting deck:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete deck'
    }
  }
}
