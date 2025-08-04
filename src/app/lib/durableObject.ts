import type { GameState } from '@/app/lib/GameState'

export async function callGameDO(
  gameStateDO: DurableObjectNamespace<any>,
  gameId: string, 
  method: string, 
  data?: any
): Promise<GameState> {
  // Debug what we're actually receiving
  console.log('callGameDO received:')
  console.log('  gameStateDO type:', typeof gameStateDO)
  console.log('  gameStateDO value:', gameStateDO)
  console.log('  gameId:', gameId)
  console.log('  method:', method)
  console.log('  data:', data)
  
  if (!gameStateDO) {
    throw new Error('GAME_STATE_DO binding not found. Check your wrangler.jsonc configuration.')
  }
  
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('Invalid gameId provided')
  }
  
  try {
    const doId = gameStateDO.idFromName(gameId)
    const gameState = gameStateDO.get(doId)
    
    const requestInit: RequestInit = {
      method: method === 'getState' ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    if (requestInit.method === 'POST') {
      requestInit.body = JSON.stringify(data);
    }
    
    const response = await gameState.fetch("http://fake-host/", requestInit);
  
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Game DO error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    return response.json() as Promise<GameState>
    
  } catch (error) {
    console.error('Durable Object call failed:', {
      gameId,
      method,
      error: error.message,
      hasBinding: !!gameStateDO
    })
    throw error
  }
}