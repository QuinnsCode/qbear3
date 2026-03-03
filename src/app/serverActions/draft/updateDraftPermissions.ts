// app/serverActions/draft/updateDraftPermissions.ts
'use server'

import { env } from "cloudflare:workers"

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
      const error = await response.json()
      return { success: false, error: error.error || 'Failed to update permissions' }
    }

    const result = await response.json()
    return { success: true, permissions: result.permissions }
  } catch (error: any) {
    console.error('Failed to update draft permissions:', error)
    return { success: false, error: error.message }
  }
}
