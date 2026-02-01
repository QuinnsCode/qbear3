// src/durableObjects/CacheWarmingDO.ts
/**
 * CacheWarmingDO - Scheduled cache warming for popular cards
 *
 * Uses Durable Object alarms to periodically pre-cache popular cards
 * from Scryfall into our KV cache. Reduces cold starts and Scryfall API hits.
 *
 * Features:
 * - Scheduled daily warming via alarms
 * - Curated list of popular cards (Standard staples, Commander favorites)
 * - Progress tracking and stats
 * - Manual trigger endpoint
 *
 * Single global instance ensures coordinated warming
 */

import { DurableObject } from "cloudflare:workers"
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider'
import { KVCardCache } from '@/app/services/cardData/KVCardCache'
import { CardDataService } from '@/app/services/cardData/CardDataService'

interface WarmingStats {
  lastRun: number | null
  totalCardsWarmed: number
  lastRunDuration: number
  successCount: number
  errorCount: number
  nextScheduledRun: number | null
}

/**
 * Popular cards to pre-cache
 * Start with format staples and commonly searched cards
 */
const POPULAR_CARD_NAMES = [
  // Standard staples
  'Lightning Bolt',
  'Counterspell',
  'Swords to Plowshares',
  'Path to Exile',
  'Fatal Push',
  'Thoughtseize',
  'Birds of Paradise',
  'Llanowar Elves',
  'Sol Ring',
  'Arcane Signet',

  // Commander staples
  'Cyclonic Rift',
  'Rhystic Study',
  'Smothering Tithe',
  'Mystic Remora',
  'Dockside Extortionist',
  'Demonic Tutor',
  'Vampiric Tutor',
  'Mana Crypt',
  'Mana Vault',
  'Chrome Mox',

  // Removal
  'Assassin\'s Trophy',
  'Anguished Unmaking',
  'Beast Within',
  'Chaos Warp',
  'Generous Gift',
  'Nature\'s Claim',
  'Swan Song',
  'Negate',
  'Dovin\'s Veto',

  // Card draw
  'Rhystic Study',
  'Mystic Remora',
  'Esper Sentinel',
  'Dark Confidant',
  'Sylvan Library',
  'Phyrexian Arena',

  // Ramp
  'Cultivate',
  'Kodama\'s Reach',
  'Rampant Growth',
  'Three Visits',
  'Nature\'s Lore',
  'Farseek',

  // Interaction
  'Force of Will',
  'Force of Negation',
  'Pact of Negation',
  'Mana Drain',
  'Fierce Guardianship',
  'Flusterstorm',

  // Lands
  'Command Tower',
  'Exotic Orchard',
  'Reflecting Pool',
  'City of Brass',
  'Mana Confluence',
  'Chromatic Lantern',

  // Add more as needed...
]

export class CacheWarmingDO extends DurableObject {
  private env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    try {
      // GET /stats - Get warming statistics
      if (method === 'GET' && url.pathname === '/stats') {
        const stats = await this.getStats()
        return Response.json(stats)
      }

      // POST /warm - Trigger manual warming
      if (method === 'POST' && url.pathname === '/warm') {
        const body = await request.json().catch(() => ({})) as any
        const cardNames = body.cardNames || POPULAR_CARD_NAMES

        // Run warming in background (don't block request)
        this.ctx.waitUntil(this.warmCache(cardNames))

        return Response.json({
          success: true,
          message: `Warming ${cardNames.length} cards in background`,
          cardCount: cardNames.length
        })
      }

      // POST /schedule - Set up alarm schedule
      if (method === 'POST' && url.pathname === '/schedule') {
        const body = await request.json() as any
        const intervalHours = body.intervalHours || 168 // Default: weekly (7 days)

        await this.scheduleWarming(intervalHours)

        return Response.json({
          success: true,
          message: `Scheduled warming every ${intervalHours} hours`,
          nextRun: await this.ctx.storage.getAlarm()
        })
      }

      // DELETE /schedule - Cancel scheduled warming
      if (method === 'DELETE' && url.pathname === '/schedule') {
        await this.ctx.storage.deleteAlarm()
        return Response.json({ success: true, message: 'Warming schedule cancelled' })
      }

      return Response.json({ error: 'Not found' }, { status: 404 })

    } catch (error) {
      console.error('CacheWarmingDO error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }

  /**
   * Alarm handler - runs on schedule
   */
  async alarm(): Promise<void> {
    console.log('🔔 CacheWarmingDO alarm triggered - starting cache warming')

    try {
      await this.warmCache(POPULAR_CARD_NAMES)

      // Reschedule for next run (weekly)
      await this.scheduleWarming(168)

    } catch (error) {
      console.error('❌ Cache warming alarm failed:', error)
      // Reschedule anyway to retry
      await this.scheduleWarming(168)
    }
  }

  /**
   * Warm the cache with popular cards
   */
  private async warmCache(cardNames: string[]): Promise<void> {
    const startTime = Date.now()
    console.log(`🔥 Starting cache warming for ${cardNames.length} cards`)

    if (!this.env?.CARDS_KV) {
      throw new Error('CARDS_KV binding not found')
    }

    // Initialize card data service
    const provider = new ScryfallProvider()
    const cache = new KVCardCache(this.env.CARDS_KV)
    const cardService = new CardDataService(provider, cache)

    let successCount = 0
    let errorCount = 0

    // Process cards in batches to respect rate limits
    const BATCH_SIZE = 10
    const DELAY_BETWEEN_BATCHES_MS = 200 // ~5 batches/sec

    for (let i = 0; i < cardNames.length; i += BATCH_SIZE) {
      const batch = cardNames.slice(i, i + BATCH_SIZE)

      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cardNames.length / BATCH_SIZE)}`)

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (name) => {
          try {
            // This will cache the card if not already cached
            await cardService.getCardByName(name)
            return { success: true, name }
          } catch (error) {
            console.warn(`⚠️ Failed to warm card: ${name}`, error)
            return { success: false, name, error }
          }
        })
      )

      // Count successes/errors
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++
        } else {
          errorCount++
        }
      })

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < cardNames.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS))
      }
    }

    const duration = Date.now() - startTime

    // Update stats
    const stats: WarmingStats = {
      lastRun: Date.now(),
      totalCardsWarmed: successCount,
      lastRunDuration: duration,
      successCount,
      errorCount,
      nextScheduledRun: await this.ctx.storage.getAlarm()
    }

    await this.ctx.storage.put('stats', stats)

    console.log(`✅ Cache warming complete: ${successCount} success, ${errorCount} errors, ${duration}ms`)
  }

  /**
   * Schedule next warming run
   */
  private async scheduleWarming(intervalHours: number): Promise<void> {
    const nextRun = Date.now() + (intervalHours * 60 * 60 * 1000)
    await this.ctx.storage.setAlarm(nextRun)
    console.log(`⏰ Next cache warming scheduled for ${new Date(nextRun).toISOString()}`)
  }

  /**
   * Get warming statistics
   */
  private async getStats(): Promise<WarmingStats> {
    const stats = await this.ctx.storage.get<WarmingStats>('stats')
    return stats || {
      lastRun: null,
      totalCardsWarmed: 0,
      lastRunDuration: 0,
      successCount: 0,
      errorCount: 0,
      nextScheduledRun: await this.ctx.storage.getAlarm()
    }
  }
}
