// app/pages/draft/draftRoutes.ts
import { route } from "rwsdk/router"
import { env } from "cloudflare:workers"

export const draftRoutes = [
  // WebSocket connection
  route("/:draftId", async ({ request, params }) => {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 })
    }
    
    const draftId = params.draftId
    const id = env.DRAFT_DO.idFromName(draftId)
    const stub = env.DRAFT_DO.get(id)
    
    // Use the request that already has auth headers from middleware
    return stub.fetch(request)
  })
]