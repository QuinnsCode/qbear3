// app/pages/draft/draftRoutes.ts
import { route } from "rwsdk/router"
import { env } from "cloudflare:workers"
import { drafterIn } from "@/app/lib/draft/draftFunctions"

export const draftRoutes = [
  // WebSocket connection
  route("/:draftId", async ({ request, params, ctx }) => {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 })
    }

    const draftId = params.draftId
    const stub = env.DRAFT_DO.get(env.DRAFT_DO.idFromName(draftId))

    // Who is asking comes from the session or the draft's guest cookie, never from a header the browser sent
    const headers = new Headers(request.headers)
    headers.delete('X-Auth-User-Id')
    headers.delete('X-Auth-User-Name')
    const me = drafterIn(draftId, ctx, request.headers.get('cookie'))
    if (me) {
      headers.set('X-Auth-User-Id', me.id)
      headers.set('X-Auth-User-Name', me.name)
    }
    return stub.fetch(new Request(request.url, { method: request.method, headers }))
  })
]
