// app/components/Game/ClientGameWrapper.tsx
'use client'

import { useEffect, useState } from 'react'
import { initRealtimeClient } from "rwsdk/realtime/client"
import MobileGameUI from '@/app/components/Game/MobileGameUI'

interface ClientGameWrapperProps {
  gameId: string
  currentUserId: string
  initialState: any
}

export default function ClientGameWrapper({ 
  gameId, 
  currentUserId, 
  initialState 
}: ClientGameWrapperProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [gameId])

  // Show loading until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-4">Loading Game Interface...</h2>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-sm text-gray-400 mt-4">Initializing client...</p>
        </div>
      </div>
    )
  }

  return (
    <MobileGameUI 
      gameId={gameId}
      currentUserId={currentUserId} 
      initialState={initialState}
    />
  )
}