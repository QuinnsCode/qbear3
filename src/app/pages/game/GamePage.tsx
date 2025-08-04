// app/pages/game/GamePage.tsx
import { getGameState, getCurrentPlayer } from '@/app/serverActions/gameActions'
import GameBoard from '@/app/components/GameBoard/GameBoard'
import ClientGameWrapper from '@/app/components/Game/GameUtils/ClientGameWrapper'
import { env } from "cloudflare:workers"

export default async function GamePage({ params, ctx }) {
  const gameId = params.gameId
  const userId = 'game-master'
  
  if (!userId) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    })
  }

  if (!env?.GAME_STATE_DO) {
    console.error('Missing GAME_STATE_DO binding in environment')
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">GAME_STATE_DO binding not found. Check your wrangler.jsonc file.</p>
        </div>
      </div>
    )
  }

  try {
    let initialGameState
    let currentPlayer
    
    try {
      console.log('About to call getGameState with gameId:', gameId)
      
      // Fixed: Only pass gameId parameter
      initialGameState = await getGameState(gameId)
      currentPlayer = await getCurrentPlayer(gameId)
      
      console.log('✅ Game state loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load game state:', error)
      console.log('Will show loading state')
    }
    
    return (
      <>
        {initialGameState ? (
          // OPTION 1: Use Mobile UI (new design)
          <ClientGameWrapper 
            gameId={gameId}
            currentUserId={userId}
            initialState={initialGameState}
          />
          
          // OPTION 2: Use Original GameBoard (comment out ClientGameWrapper above and uncomment below)
          // <div className="min-h-screen bg-gray-50">
          //   <div className="container mx-auto py-8">
          //     <h1 className="text-3xl font-bold mb-6">
          //       Game: {initialGameState?.id}
          //     </h1>
          //     <GameBoard 
          //       gameId={gameId} 
          //       currentUserId={userId}
          //       initialState={initialGameState}
          //     />
          //   </div>
          // </div>
        ) : (
          <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-xl font-bold mb-4">Loading Game...</h2>
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
              <p className="text-sm text-gray-400 mt-4">
                Initializing game: <span className="font-mono">{gameId}</span>
              </p>
            </div>
          </div>
        )}
      </>
    )
  } catch (error) {
    console.error('Failed to load game:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Game Error</h1>
          <p className="text-gray-600 mb-4">Failed to load game: {error.message}</p>
          <p className="text-sm text-gray-500 mb-6">Game ID: {gameId}</p>
          <div className="space-x-4">
            <a 
              href={`/game/${gameId}`} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </a>
            <a 
              href="/game" 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              New Game
            </a>
          </div>
        </div>
      </div>
    )
  }
}