// app/components/CardGame/GameContent.tsx

import { getCardGameState, joinCardGame } from '@/app/lib/cardGame/cardGameFunctions'
import { env } from "cloudflare:workers"
import ClientCardGameWrapper from './ClientCardGameWrapper'
import { MTGPlayer } from '@/app/services/cardGame/CardGameState'
import { GameSocialPanel } from "@/app/components/Social/GameSocialPanel";


interface GameContentProps {
  cardGameId: string
  userId: string
  userName: string
  isLoggedIn: boolean
  isSandbox: boolean
}

export default async function GameContent({ 
  cardGameId, 
  userId, 
  userName,
  isLoggedIn,
  isSandbox
}: GameContentProps) {
  let initialGameState = await getCardGameState(cardGameId)
  
  let currentPlayer: MTGPlayer | null = initialGameState.players.find(p => p.id === userId) || null
  
  // ✅ Determine max players based on mode
  const maxPlayers = isSandbox ? 256 : 4
  
  // ✅ Detect user type FIRST (before any logic)
  const isSpectatorId = userId?.startsWith('spectator-') || userId?.startsWith('spectator_')
  const isSandboxPlayerId = userId?.startsWith('sandbox-') || userId?.startsWith('sandbox_')
  
  // ✅ Spectator mode is ONLY based on user ID prefix
  const spectatorMode = isSpectatorId
  
  // ✅ Auto-join logic: logged-in users OR sandbox players (but NOT spectators)
  const shouldAutoJoin = 
    !isSpectatorId && 
    !currentPlayer && 
    initialGameState.players.length < maxPlayers && 
    (isLoggedIn || isSandboxPlayerId)
  
  if (shouldAutoJoin) {
    console.log(`🎮 Auto-joining ${isSandboxPlayerId ? 'sandbox player' : 'user'}:`, { userId, userName });
    
    initialGameState = await joinCardGame(cardGameId, userId, userName);
    
    currentPlayer = initialGameState.players.find(p => p.id === userId) ?? null
    
    if (currentPlayer) {
      console.log('✅ Successfully joined game as player:', currentPlayer.name);
    } else {
      console.error('❌ Join succeeded but player not found in state!');
    }
  }
  
  console.log('🔍 User mode:', {
    userId,
    userName,
    isSandbox,
    isSandboxPlayerId,
    isSpectatorId,
    isLoggedIn,
    spectatorMode,
    hasPlayer: !!currentPlayer,
    playerCount: initialGameState.players.length,
    maxPlayers,
    shouldAutoJoin
  });
  
  // Check for Discord thread on server
  let discordThreadUrl: string | null = null
  if (env.CARD_GAME_REGISTRY_KV) {
    try {
      const discordData = await env.CARD_GAME_REGISTRY_KV.get(`discord:${cardGameId}`, "json") as any
      if (discordData?.threadUrl) {
        discordThreadUrl = discordData.threadUrl
      }
    } catch (err) {
      console.error('Failed to check for Discord thread:', err)
    }
  }
  
  console.log(`👤 User ${userName} ${spectatorMode ? 'spectating' : 'playing in'} game ${cardGameId}`)

  // Build game URL and name (server-side safe)
  const gameName = cardGameId.split('-').map((w: string) => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
  
  return (
    <div>
      <ClientCardGameWrapper
        gameName={gameName}
        cardGameId={cardGameId}
        currentUserId={userId}
        initialState={initialGameState}
        spectatorMode={spectatorMode}
        discordThreadUrl={discordThreadUrl}
        isSandbox={isSandbox}
      />
    </div>
  );
}