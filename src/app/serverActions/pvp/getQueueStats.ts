// app/serverActions/pvp/getQueueStats.ts
'use server'

import { env } from "cloudflare:workers"
import { REGION_LIST, type Region } from "@/app/lib/constants/regions"

export interface RegionQueueStats {
  queueSize: number
  longestWaitSeconds: number
}

export type QueueStatsByRegion = Record<Region, RegionQueueStats>

const EMPTY: RegionQueueStats = { queueSize: 0, longestWaitSeconds: 0 }

/**
 * Live queue sizes for every matchmaking region. Cheap: one DO fetch per region,
 * and a region that has never been used just reports an empty queue.
 */
export async function getQueueStats(): Promise<QueueStatsByRegion> {
  const entries = await Promise.all(
    REGION_LIST.map(async (region): Promise<[Region, RegionQueueStats]> => {
      try {
        const id = env.MATCHMAKING_DO.idFromName(region.id)
        const stub = env.MATCHMAKING_DO.get(id)
        const res = await stub.fetch(new Request(`https://fake-host/stats?region=${region.id}`))
        if (!res.ok) return [region.id, EMPTY]
        const data = await res.json() as Partial<RegionQueueStats>
        return [region.id, {
          queueSize: data.queueSize ?? 0,
          longestWaitSeconds: data.longestWaitSeconds ?? 0,
        }]
      } catch (error) {
        console.warn(`[getQueueStats] ${region.id} unavailable:`, error)
        return [region.id, EMPTY]
      }
    })
  )
  return Object.fromEntries(entries) as QueueStatsByRegion
}
