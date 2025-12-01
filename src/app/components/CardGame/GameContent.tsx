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
  
  // app/components/CardGame/GameContent.tsx

  if (isLoggedIn && !currentPlayer && initialGameState.players.length < 4) {
    console.log('🔍 BEFORE JOIN:');
    console.log('  - Looking for userId:', userId);
    console.log('  - Players in game:', initialGameState.players.map(p => `${p.name} (${p.id})`));
    
    initialGameState = await joinCardGame(cardGameId, userId, userName);
    
    console.log('🔍 AFTER JOIN:');
    console.log('  - Looking for userId:', userId);
    console.log('  - Players in game:', initialGameState.players.map(p => `${p.name} (${p.id})`));
    
    currentPlayer = initialGameState.players.find(p => p.id === userId) ?? null
    
    console.log('🔍 SEARCH RESULT:');
    console.log('  - Found player?', !!currentPlayer);
    if (currentPlayer) {
      console.log('  - Player name:', currentPlayer.name);
    } else {
      console.log('  - ❌ NO MATCH! Searching for:', userId);
      console.log('  - Available IDs:', initialGameState.players.map(p => p.id));
    }
  }
  
  const isSpectator = !currentPlayer
  
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
  
  console.log(`👤 User ${userName} ${isSpectator ? 'spectating' : 'playing in'} game ${cardGameId}`)

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
        spectatorMode={isSpectator}
        discordThreadUrl={discordThreadUrl} // Pass thread URL
      />
    </div>
  );
}