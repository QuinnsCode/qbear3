Hybrid Rendering Strategy
Server-Side Rendering (Initial Load)
typescript// CardGamePage.tsx (Server Component)
export default async function CardGamePage({ params, ctx, request }) {
  // 1. Fetch initial state from DO
  const id = env.CARD_GAME_STATE_DO.idFromName(cardGameId)
  const stub = env.CARD_GAME_STATE_DO.get(id)
  const response = await stub.fetch(new Request('https://fake-host/', { method: 'GET' }))
  const initialState = await response.json()
  
  // 2. Render with initial state
  return (
    <ClientCardGameWrapper
      initialState={initialState}  // ← SSR'd state
      cardGameId={cardGameId}
      currentUserId={userId}
    />
  )
}
Client-Side Real-time Updates (WebSocket)
typescript// ClientCardGameWrapper.tsx (Client Component)
export default function ClientCardGameWrapper({ initialState, cardGameId, currentUserId }) {
  const { gameState, isConnected } = useCardGameSync({
    cardGameId,
    playerId: currentUserId,
    onStateUpdate: (newState) => {
      // Real-time updates from WebSocket
    }
  })
  
  // Use WebSocket state if connected, fallback to initial
  const currentState = gameState || initialState
  
  return <CardGameBoard gameState={currentState} />
}
```

### The Full Flow
```
1. User visits /cardGame/abc123
   ↓
2. Server fetches initial state from DO (GET request)
   ↓
3. Server renders HTML with initial state
   ↓
4. Browser receives fully rendered page (fast!)
   ↓
5. Client hydrates React components
   ↓
6. useCardGameSync establishes WebSocket connection
   ↓
7. DO broadcasts any state changes to all connected clients
   ↓
8. React re-renders with new state (real-time!)
Why This is Powerful
Server-Side Rendering Benefits:

✅ Fast initial page load
✅ SEO friendly (if needed)
✅ Works without JS (basic view)
✅ No loading spinner on first visit

WebSocket Benefits:

✅ Real-time multiplayer
✅ All players see updates instantly
✅ No polling (efficient)
✅ Bi-directional communication

Combined:

Best of both worlds
Fast first paint + real-time updates
Graceful degradation (WebSocket fails → still have initial state)
Scalable (DO handles WebSocket connections per game)

This is the modern pattern for real-time multiplayer games! 🚀