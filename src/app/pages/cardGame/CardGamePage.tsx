// app/pages/cardGame/CardGamePage.tsx
import { Suspense } from 'react'
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
// import CardGameShell from '@/app/components/CardGame/CardGameShell'
import GameContent from '@/app/components/CardGame/GameContent'
import { isSandboxEnvironment } from '@/lib/middleware/sandboxMiddleware';


export default async function CardGamePage({ params, ctx, request }: RequestInfo) {
  const cardGameId = params.cardGameId
  const isSandbox = isSandboxEnvironment(request)
  
  console.log('🎮 ctx.user:', ctx.user);
  console.log('🎮 ctx.user?.id:', ctx.user?.id);
  
  let userId: string;
  let userName: string;
  let isLoggedIn: boolean;

  if (ctx.user?.id) {
    userId = ctx.user.id;
    userName = ctx.user.name || ctx.user.email || (isSandbox ? 'Chaos Player' : 'Player');
    isLoggedIn = !userId.startsWith('sandbox_');
  } else {
    if (isSandbox) {
      userId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      userName = 'Chaos Player';
    } else {
      userId = `spectator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      userName = 'Spectator';
    }
    isLoggedIn = false;
  }

  if (!env?.CARD_GAME_STATE_DO) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">CARD_GAME_STATE_DO binding not found.</p>
        </div>
      </div>
    )
  }

  // ✅ REMOVE Suspense - just return GameContent directly
  return (
    <GameContent 
      cardGameId={cardGameId}
      userId={userId}
      userName={userName}
      isLoggedIn={isLoggedIn}
      isSandbox={isSandbox}
    />
  )
}