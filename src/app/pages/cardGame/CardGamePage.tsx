// app/pages/cardGame/CardGamePage.tsx
import { Suspense } from 'react'
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
import GameContent from '@/app/components/CardGame/GameContent'
import { isSandboxEnvironment } from '@/lib/middleware/sandboxMiddleware'
import { getOrCreateUserId } from '@/app/lib/auth/userIdentification'
import { validateCardGameEnvironment } from '@/app/lib/validation/environmentValidation'


export default async function CardGamePage({ params, ctx, request }: RequestInfo) {
  const cardGameId = params.cardGameId
  const isSandbox = isSandboxEnvironment(request)
  
  // Validate environment configuration
  const envValidation = validateCardGameEnvironment(env)
  if (!envValidation.isValid) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">{envValidation.error}</p>
        </div>
      </div>
    )
  }

  // Get or create user identity
  const userIdentity = await getOrCreateUserId({
    ctx,
    request,
    cardGameId,
    isSandbox
  })

  return (
    <GameContent 
      cardGameId={cardGameId}
      userId={userIdentity.userId}
      userName={userIdentity.userName}
      isLoggedIn={userIdentity.isLoggedIn}
      isSandbox={isSandbox}
    />
  )
}