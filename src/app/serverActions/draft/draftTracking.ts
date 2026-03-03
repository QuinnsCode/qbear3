// app/serverActions/draft/draftTracking.ts
'use server'

import { env } from "cloudflare:workers"

/**
 * Draft metadata stored in KV
 * KV Key structure:
 * - `drafts:${userId}:active` -> Array of active draft metadata
 */

export type DraftStatus = 'in_progress' | 'completed' | 'abandoned'

export type DraftMetadata = {
  draftId: string
  userId: string
  userName: string
  status: DraftStatus
  createdAt: number
  lastActivity: number
  packNumber: number
  pickNumber: number
  totalPacks: number
  totalPicks: number
  playerCount: number
}

const MAX_ACTIVE_DRAFTS = 3
const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Get user's active drafts
 */
export async function getUserActiveDrafts(userId: string): Promise<{
  success: boolean
  drafts: DraftMetadata[]
  error?: string
}> {
  try {
    const key = `drafts:${userId}:active`
    const stored = await env.DECKS_KV.get(key, 'json')

    if (!stored || !Array.isArray(stored)) {
      return { success: true, drafts: [] }
    }

    // Filter out expired drafts
    const now = Date.now()
    const activeDrafts = (stored as DraftMetadata[]).filter(draft => {
      const age = now - draft.lastActivity
      return age < DRAFT_EXPIRY_MS && draft.status === 'in_progress'
    })

    // Clean up expired drafts
    if (activeDrafts.length !== stored.length) {
      await env.DECKS_KV.put(key, JSON.stringify(activeDrafts))
    }

    return {
      success: true,
      drafts: activeDrafts.sort((a, b) => b.lastActivity - a.lastActivity)
    }
  } catch (error) {
    console.error('[getUserActiveDrafts] Error:', error)
    return {
      success: false,
      drafts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if user can create a new draft (under limit)
 */
export async function canCreateDraft(userId: string): Promise<{
  canCreate: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
}> {
  const { drafts } = await getUserActiveDrafts(userId)

  if (drafts.length >= MAX_ACTIVE_DRAFTS) {
    return {
      canCreate: false,
      reason: `You have reached the maximum of ${MAX_ACTIVE_DRAFTS} active drafts. Complete or abandon one to start a new draft.`,
      currentCount: drafts.length,
      maxAllowed: MAX_ACTIVE_DRAFTS
    }
  }

  return {
    canCreate: true,
    currentCount: drafts.length,
    maxAllowed: MAX_ACTIVE_DRAFTS
  }
}

/**
 * Add a new draft to user's active drafts
 */
export async function trackNewDraft(draft: DraftMetadata): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const key = `drafts:${draft.userId}:active`

    // Get existing drafts
    const { drafts } = await getUserActiveDrafts(draft.userId)

    // Check limit
    if (drafts.length >= MAX_ACTIVE_DRAFTS) {
      return {
        success: false,
        error: `Maximum of ${MAX_ACTIVE_DRAFTS} active drafts reached`
      }
    }

    // Add new draft
    const updatedDrafts = [...drafts, draft]

    // Store in KV
    await env.DECKS_KV.put(key, JSON.stringify(updatedDrafts))

    console.log(`[trackNewDraft] Added draft ${draft.draftId} for user ${draft.userId}`)

    return { success: true }
  } catch (error) {
    console.error('[trackNewDraft] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update draft metadata (progress, last activity, etc.)
 */
export async function updateDraftMetadata(
  userId: string,
  draftId: string,
  updates: Partial<DraftMetadata>
): Promise<{ success: boolean; error?: string }> {
  try {
    const key = `drafts:${userId}:active`
    const { drafts } = await getUserActiveDrafts(userId)

    const draftIndex = drafts.findIndex(d => d.draftId === draftId)

    if (draftIndex === -1) {
      return { success: false, error: 'Draft not found' }
    }

    // Update the draft
    drafts[draftIndex] = { ...drafts[draftIndex], ...updates }

    // Store in KV
    await env.DECKS_KV.put(key, JSON.stringify(drafts))

    return { success: true }
  } catch (error) {
    console.error('[updateDraftMetadata] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Remove a draft from active list (completed or abandoned)
 */
export async function removeDraft(
  userId: string,
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const key = `drafts:${userId}:active`
    const { drafts } = await getUserActiveDrafts(userId)

    const updatedDrafts = drafts.filter(d => d.draftId !== draftId)

    // Store in KV
    await env.DECKS_KV.put(key, JSON.stringify(updatedDrafts))

    console.log(`[removeDraft] Removed draft ${draftId} for user ${userId}`)

    return { success: true }
  } catch (error) {
    console.error('[removeDraft] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Mark a draft as completed
 */
export async function completeDraft(
  userId: string,
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  return await updateDraftMetadata(userId, draftId, { status: 'completed' })
}

/**
 * Mark a draft as abandoned
 */
export async function abandonDraft(
  userId: string,
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  return await removeDraft(userId, draftId)
}
