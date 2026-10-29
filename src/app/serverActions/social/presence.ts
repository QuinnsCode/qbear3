// app/serverActions/social/presence.ts
'use server'

import { env } from "cloudflare:workers"
import { requestInfo } from "rwsdk/worker"

export type Presence = 'online' | 'away' | 'offline'

export interface UserPresence {
  presence: Presence
  lastActive: number
  activeGames: string[]
}

/**
 * Reads presence for a set of users straight from their UserSessionDO.
 * Hibernated objects answer instantly from storage, so this is cheap enough to
 * call for a whole friends list.
 */
export async function getPresenceForUsers(userIds: string[]): Promise<Record<string, UserPresence>> {
  // Presence is only readable by a signed-in user; signed-out callers get nothing
  // so arbitrary ids cannot be enumerated.
  if (!requestInfo.ctx.user) return {}

  const unique = [...new Set(userIds)].slice(0, 100)
  const entries = await Promise.all(
    unique.map(async (userId): Promise<[string, UserPresence]> => {
      try {
        const id = env.USER_SESSION_DO.idFromName(userId)
        const stub = env.USER_SESSION_DO.get(id)
        const res = await stub.fetch(new Request('https://fake-host/state'))
        if (!res.ok) return [userId, { presence: 'offline', lastActive: 0, activeGames: [] }]
        const data = await res.json() as Partial<UserPresence> & { connectedDevices?: number }
        // A user with no live sockets is offline no matter what storage says.
        const presence: Presence = (data.connectedDevices ?? 0) > 0 ? (data.presence || 'online') : 'offline'
        return [userId, { presence, lastActive: data.lastActive || 0, activeGames: data.activeGames || [] }]
      } catch {
        return [userId, { presence: 'offline', lastActive: 0, activeGames: [] }]
      }
    })
  )
  return Object.fromEntries(entries)
}
