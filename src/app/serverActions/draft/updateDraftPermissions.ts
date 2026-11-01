// app/serverActions/draft/updateDraftPermissions.ts
'use server'

import { env } from "cloudflare:workers"
import { errorMessage } from "@/lib/errorMessage"

export async function updateDraftPermissions(
  draftId: string,
  userId: string,
  permissions: {
    isPublic?: boolean
    allowSpectators?: boolean
    spectatorList?: string[]
  }
) {
  try {
    const id = env.DRAFT_DO.idFromName(draftId)
    const stub = env.DRAFT_DO.get(id)

    const response = await stub.fetch(new Request('https://fake-host/permissions', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User-Id': userId
      },
      body: JSON.stringify(permissions)
    }))

    if (!response.ok) {
      const body: unknown = await response.json()
      const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : ''
      return { success: false, error: message || 'Failed to update permissions' }
    }

    const result: unknown = await response.json()
    const updated = result && typeof result === 'object' && 'permissions' in result ? result.permissions : undefined
    return { success: true, permissions: updated }
  } catch (error) {
    console.error('Failed to update draft permissions:', error)
    return { success: false, error: errorMessage(error) }
  }
}
