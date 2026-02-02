// src/app/pages/vtt/VTTPage.tsx

import { type RequestInfo } from 'rwsdk/worker'
import { ThreeCanvas } from '@/app/components/VTT/ThreeCanvas'

/**
 * VTT Page - 3D Virtual Tabletop
 *
 * Week 1: Server foundation ✅
 * Week 2-3: Three.js canvas and WebSocket sync ✅
 */
export default async function VTTPage({ ctx, request, params }: RequestInfo) {
  const gameId = params?.gameId || 'test-game'

  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    })
  }

  // Check if user is GM via query param (for MVP)
  // In production, this would check the game state in the Durable Object
  const url = new URL(request.url)
  const isGM = url.searchParams.get('gm') === 'true'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>VTT - {gameId}</title>
      </head>
      <body className="m-0 p-0 overflow-hidden">
        <div className="w-screen h-screen">
          <ThreeCanvas
            gameId={gameId}
            playerId={ctx.user.id}
            isGM={isGM}
          />
        </div>
      </body>
    </html>
  )
}
