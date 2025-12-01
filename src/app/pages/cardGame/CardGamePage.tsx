// app/pages/cardGame/CardGamePage.tsx
import { Suspense } from 'react'
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
import CardGameShell from '@/app/components/CardGame/CardGameShell'
import GameContent from '@/app/components/CardGame/GameContent'
import { isSandboxEnvironment } from '@/lib/middleware/sandboxMiddleware';


export default async function CardGamePage({ params, ctx, request }: RequestInfo) {
  const cardGameId = params.cardGameId
  const isSandbox = isSandboxEnvironment(request)
  
  // Debug: Check what we have
  const hasUser = !!ctx.user;
  const hasUserId = !!(ctx.user?.id);
  
  console.log('🔍 CardGamePage Debug:', {
    hasUser,
    hasUserId,
    userId: ctx.user?.id,
    userName: ctx.user?.name || ctx.user?.email,
    userObject: ctx.user
  });

  // PROPER user ID determination
  let userId: string;
  let userName: string;
  let isLoggedIn: boolean;

  if (ctx.user?.id) {
    // User is logged in - use their actual ID
    userId = ctx.user.id;
    userName = ctx.user.name || ctx.user.email || 'Player';
    isLoggedIn = true;
    console.log('✅ Logged in user:', { userId, userName });
  } else {
    // Not logged in - generate a CONSISTENT spectator ID
    // (but this will still be different each page load - that's expected for spectators)
    userId = `spectator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    userName = 'Spectator';
    isLoggedIn = false;
    console.log('👁️ Spectator:', { userId, userName });
  }

  if (!env?.CARD_GAME_STATE_DO) {
    console.error('Missing CARD_GAME_STATE_DO binding in environment')
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">CARD_GAME_STATE_DO binding not found.</p>
        </div>
      </div>
    )
  }
  

  return (
    <Suspense fallback={<CardGameShell />}>
      <GameContent 
        cardGameId={cardGameId}
        userId={userId}
        userName={userName}
        isLoggedIn={isLoggedIn}
        isSandbox={isSandbox}
      />
    </Suspense>
  )
}