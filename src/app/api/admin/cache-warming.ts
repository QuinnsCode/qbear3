// app/api/admin/cache-warming.ts
import { env } from "cloudflare:workers"

/**
 * Admin API for cache warming control
 *
 * GET /admin/cache-warming - Get stats
 * POST /admin/cache-warming/warm - Trigger manual warming
 * POST /admin/cache-warming/schedule - Set up weekly schedule
 * DELETE /admin/cache-warming/schedule - Cancel schedule
 */
export default async function handler({ request }: { request: Request }) {
  const url = new URL(request.url)
  const method = request.method

  try {
    if (!env?.CACHE_WARMING_DO) {
      return Response.json({ error: 'CACHE_WARMING_DO not configured' }, { status: 500 })
    }

    // Get the global cache warming DO instance
    const id = env.CACHE_WARMING_DO.idFromName('global-cache-warmer')
    const stub = env.CACHE_WARMING_DO.get(id)

    // GET /admin/cache-warming - Get warming stats
    if (method === 'GET') {
      const response = await stub.fetch(new Request('https://fake-host/stats'))
      const stats = await response.json()

      return Response.json({
        success: true,
        stats,
        info: {
          schedule: 'Weekly (every 168 hours)',
          popularCardsCount: 70 // From POPULAR_CARD_NAMES
        }
      })
    }

    // POST /admin/cache-warming/warm - Trigger manual warming
    if (method === 'POST' && url.pathname.endsWith('/warm')) {
      const body = await request.json().catch(() => ({}))

      const response = await stub.fetch(new Request('https://fake-host/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }))

      const result = await response.json()
      return Response.json(result)
    }

    // POST /admin/cache-warming/schedule - Set up schedule
    if (method === 'POST' && url.pathname.endsWith('/schedule')) {
      const body = await request.json().catch(() => ({}))

      const response = await stub.fetch(new Request('https://fake-host/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }))

      const result = await response.json()
      return Response.json(result)
    }

    // DELETE /admin/cache-warming/schedule - Cancel schedule
    if (method === 'DELETE' && url.pathname.endsWith('/schedule')) {
      const response = await stub.fetch(new Request('https://fake-host/schedule', {
        method: 'DELETE'
      }))

      const result = await response.json()
      return Response.json(result)
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 404 })

  } catch (error) {
    console.error('Cache warming API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
