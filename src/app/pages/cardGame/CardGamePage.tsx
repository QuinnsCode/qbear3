// app/pages/cardGame/CardGamePage.tsx
import { Suspense } from 'react'
import { type RequestInfo } from "rwsdk/worker"
import { env } from "cloudflare:workers"
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
    // ✅ Check for existing cookie first
    const cookieName = isSandbox ? `sandbox_user_${cardGameId}` : 'spectator_user';
    const existingId = request.headers.get('cookie')
      ?.split(';')
      .find(c => c.trim().startsWith(`${cookieName}=`))
      ?.split('=')[1];
    
    if (existingId) {
      // ✅ SELF-HEALING: Check if this player still exists in the game
      const { getCardGameState } = await import('@/app/lib/cardGame/cardGameFunctions');
      const gameState = await getCardGameState(cardGameId);
      const playerExists = gameState.players.find(p => p.id === existingId);
      
      if (playerExists) {
        // ✅ Player exists - use cookie ID
        userId = existingId;
        userName = isSandbox ? 'Chaos Player' : 'Spectator';
        console.log('🍪 Using existing cookie ID:', userId);
      } else {
        // ✅ SELF-HEAL: Player was removed (cleanup) - generate new ID
        console.log('🔧 Self-healing: Cookie ID not in game, generating new ID');
        if (isSandbox) {
          userId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          userName = 'Chaos Player';
        } else {
          userId = `spectator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          userName = 'Spectator';
        }
        // Cookie will be overwritten by client-side effect
      }
    } else {
      // ✅ No cookie - generate new ID
      if (isSandbox) {
        userId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        userName = 'Chaos Player';
      } else {
        userId = `spectator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        userName = 'Spectator';
      }
      console.log('🆕 Generated new ID:', userId);
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