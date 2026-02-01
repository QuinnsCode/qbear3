// app/components/CardGame/GameContent.tsx

import { getCardGameState, joinCardGame } from '@/app/serverActions/cardGame/cardGameActions'
import { env } from "cloudflare:workers"
import ClientCardGameWrapper from './ClientCardGameWrapper'
import { determineUserRole, shouldAutoJoinGame } from '@/app/lib/cardGame/userRoleLogic'
import { getDiscordThreadUrl } from '@/app/lib/social/discordIntegration'
import { formatGameName } from '@/app/lib/utils/gameFormatting'

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
  // Get initial game state
  let gameState = await getCardGameState(cardGameId)
  
  // Determine user role and auto-join logic
  const userRole = determineUserRole(userId, gameState, isSandbox)
  const shouldJoin = shouldAutoJoinGame(userRole, isLoggedIn, gameState, isSandbox)
  
  // Auto-join if needed
  if (shouldJoin) {
    console.log(`Auto-joining ${userRole.isSandboxPlayer ? 'sandbox player' : 'user'}:`, { userId, userName })
    
    gameState = await joinCardGame(cardGameId, userId, userName)
    
    const joinedPlayer = gameState.players.find(p => p.id === userId)
    if (joinedPlayer) {
      console.log('Successfully joined game as player:', joinedPlayer.name)
    } else {
      console.error('Join succeeded but player not found in state!')
    }
  }
  
  // Log user mode for debugging
  console.log('User mode:', {
    userId,
    userName,
    ...userRole,
    isLoggedIn,
    playerCount: gameState.players.length,
    shouldJoin
  })
  
  // Get Discord thread URL if available
  const discordThreadUrl = await getDiscordThreadUrl(cardGameId, env)
  
  // Format game name
  const gameName = formatGameName(cardGameId)
  
  console.log(`User ${userName} ${userRole.isSpectator ? 'spectating' : 'playing in'} game ${cardGameId}`)

  return (
    <ClientCardGameWrapper
      gameName={gameName}
      cardGameId={cardGameId}
      currentUserId={userId}
      initialState={gameState}
      spectatorMode={userRole.isSpectator}
      discordThreadUrl={discordThreadUrl}
      isSandbox={isSandbox}
    />
  )
}