// app/api/admin/cache-stats.ts
import { env } from "cloudflare:workers"

/**
 * Admin API for cache statistics and monitoring
 *
 * GET /admin/cache-stats - Get comprehensive cache statistics
 */
export default async function handler({ request }: { request: Request }) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    if (!env?.CARDS_KV) {
      return Response.json({ error: 'CARDS_KV not configured' }, { status: 500 })
    }

    // Get all cache keys with metadata
    const list = await env.CARDS_KV.list({ limit: 1000 })

    // Analyze cache contents
    const stats = {
      totalKeys: list.keys.length,
      hasMore: !list.list_complete,
      breakdown: {
        oracleData: 0,
        printingData: 0,
        printingLists: 0,
        cardData: 0,
        cardNameMappings: 0,
        searchResults: 0,
        autocomplete: 0,
        other: 0
      },
      recentCards: [] as Array<{ name: string; type: string; timestamp: number }>,
      estimatedSize: 0
    }

    // Categorize keys
    for (const key of list.keys) {
      const keyName = key.name

      if (keyName.startsWith('oracle:')) {
        stats.breakdown.oracleData++
      } else if (keyName.startsWith('print:')) {
        stats.breakdown.printingData++
      } else if (keyName.startsWith('printings:')) {
        stats.breakdown.printingLists++
      } else if (keyName.startsWith('card:id:')) {
        stats.breakdown.cardData++
      } else if (keyName.startsWith('card:name:')) {
        stats.breakdown.cardNameMappings++
      } else if (keyName.startsWith('search:')) {
        stats.breakdown.searchResults++
      } else if (keyName.startsWith('autocomplete:')) {
        stats.breakdown.autocomplete++
      } else {
        stats.breakdown.other++
      }

      // Track recent cards (use metadata if available)
      if (key.metadata) {
        stats.recentCards.push({
          name: key.name,
          type: keyName.split(':')[0],
          timestamp: (key.metadata as any).lastUpdated || Date.now()
        })
      }
    }

    // Sort recent cards by timestamp
    stats.recentCards.sort((a, b) => b.timestamp - a.timestamp)
    stats.recentCards = stats.recentCards.slice(0, 20) // Top 20 recent

    // Estimate total size (rough calculation)
    // KV key names + estimate 2KB per card on average
    stats.estimatedSize = Math.round(
      (stats.breakdown.oracleData * 1) + // 1KB oracle data
      (stats.breakdown.printingData * 1) + // 1KB printing data
      (stats.breakdown.cardData * 2) + // 2KB full card data
      (stats.breakdown.cardNameMappings * 0.1) + // 100 bytes name mapping
      (stats.breakdown.searchResults * 5) + // 5KB search results
      (stats.breakdown.autocomplete * 0.5) // 500 bytes autocomplete
    )

    return Response.json({
      success: true,
      stats,
      cacheInfo: {
        provider: 'Cloudflare KV',
        ttl: '1 year',
        distribution: 'Global edge network'
      }
    })

  } catch (error) {
    console.error('Cache stats API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
