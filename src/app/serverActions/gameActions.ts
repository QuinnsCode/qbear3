// app/serverActions/gameActions.ts - FIXED for RedwoodJS SDK
//we try to keep the server actions in here for our game

'use server'

import { env } from "cloudflare:workers";
import { renderRealtimeClients } from "rwsdk/realtime/worker";
import type { GameState } from '@/app/lib/GameState'

// Helper function to call the Durable Object - FIXED VERSION
async function callGameDO(
  gameId: string, 
  method: string, 
  data?: any
): Promise<any> {
  // console.log('callGameDO called with:', { gameId, method, data })
  
  if (!env.GAME_STATE_DO) {
    throw new Error('GAME_STATE_DO binding not found. Check your wrangler.jsonc configuration.')
  }
  
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('Invalid gameId provided')
  }
  
  try {
    const doId = env.GAME_STATE_DO.idFromName(gameId)
    const gameState = env.GAME_STATE_DO.get(doId)
    
    let requestInit: RequestInit = {
      headers: { 'Content-Type': 'application/json' }
    }

    if (method === 'getState') {
      requestInit.method = 'GET'
    } else if (method === 'rewindToAction') {
      requestInit.method = 'PUT'
      requestInit.body = JSON.stringify(data)
    } else {
      requestInit.method = 'POST'
      requestInit.body = JSON.stringify(data || {})
    }
    
    // console.log('Making DO request:', { method: requestInit.method, body: requestInit.body })
    
    const response = await gameState.fetch("http://fake-host/", requestInit)
  
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Game DO error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    return await response.json()
    
  } catch (error) {
    console.error('Durable Object call failed:', {
      gameId,
      method,
      error: error.message,
      hasBinding: !!env.GAME_STATE_DO
    })
    throw error
  }
}

// Server Actions - FIXED to not pass DO namespace
export async function getGameState(gameId: string): Promise<GameState> {
  try {
    console.log('getGameState called for:', gameId)
    const result = await callGameDO(gameId, 'getState')
    console.log('getGameState result:', result)
    return result as GameState
  } catch (error) {
    console.error('Failed to get game state:', error)
    throw new Error('Failed to get game state')
  }
}

export async function advancePhase(gameId: string, playerId: string): Promise<GameState> {
  try {
    console.log('advancePhase called:', { gameId, playerId })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_phase',
      playerId,
      data: {}
    })
    console.log('advancePhase result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to advance phase:', error)
    throw new Error('Failed to advance phase')
  }
}

export async function advanceTurn(gameId: string, playerId: string): Promise<GameState> {
  try {
    console.log('advanceTurn called:', { gameId, playerId })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_turn',
      playerId,
      data: {}
    })
    console.log('advanceTurn result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to advance turn:', error)
    throw new Error('Failed to advance turn')
  }
}

export async function makePlayerDecision(
  gameId: string, 
  playerId: string, 
  decision: any
): Promise<GameState> {
  try {
    console.log('makePlayerDecision called:', { gameId, playerId, decision })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'player_decision',
      playerId,
      data: { decision }
    })
    console.log('makePlayerDecision result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to make player decision:', error)
    throw new Error('Failed to make player decision')
  }
}

export async function deployMachines(
  gameId: string,
  playerId: string,
  territoryId: string,
  count: number
): Promise<GameState> {
  try {
    console.log('deployMachines called:', { gameId, playerId, territoryId, count })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'deploy_machines',
      playerId,
      data: { territoryId, count }
    })
    console.log('deployMachines result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to deploy machines:', error)
    throw new Error('Failed to deploy machines')
  }
}

export async function playCard(
  gameId: string,
  playerId: string,
  cardId: string,
  targets: string[] | undefined
): Promise<GameState> {
  try {
    console.log('playCard called:', { gameId, playerId, cardId, targets })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'play_card',
      playerId,
      data: { cardId, targets }
    })
    console.log('playCard result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to play card:', error)
    throw new Error('Failed to play card')
  }
}

// Replay/Rewind Actions
export async function rewindToAction(gameId: string, actionIndex: number): Promise<GameState> {
  try {
    console.log('rewindToAction called:', { gameId, actionIndex })
    const result = await callGameDO(gameId, 'rewindToAction', { actionIndex })
    console.log('rewindToAction result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to rewind game:', error)
    throw new Error('Failed to rewind game')
  }
}

export async function getGameHistory(gameId: string) {
  try {
    console.log('getGameHistory called for:', gameId)
    const gameState = await callGameDO(gameId, 'getState')
    return {
      actions: gameState.actions,
      currentActionIndex: gameState.currentActionIndex
    }
  } catch (error) {
    console.error('Failed to get game history:', error)
    throw new Error('Failed to get game history')
  }
}

// Game Management Actions
export async function createGame(
  gameId: string,
  playerNames: string[],
  territoryConfig: Record<string, any>
): Promise<GameState> {
  try {
    console.log('createGame called:', { gameId, playerNames, territoryConfig })
    const result = await callGameDO(gameId, 'createGame', {
      playerNames,
      territoryConfig
    })
    console.log('createGame result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to create game:', error)
    throw new Error('Failed to create game')
  }
}

export async function joinGame(gameId: string, playerId: string, playerName: string): Promise<GameState> {
  try {
    console.log('joinGame called:', { gameId, playerId, playerName })
    const result = await callGameDO(gameId, 'joinGame', {
      playerId,
      playerName
    })
    console.log('joinGame result:', result)
    
    // Trigger realtime update for all clients watching this game
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to join game:', error)
    throw new Error('Failed to join game')
  }
}

export async function restartGameWithNuking(
  gameId: string, 
  player1Id: string, 
  player2Id: string, 
  nukeCount: number = 4
): Promise<GameState> {
  try {
    const result = await callGameDO(gameId, 'restartGame', {
      player1Id,
      player2Id,
      nukeCount
    })
    
    // ✅ Enable this to broadcast to all players
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to restart game with nuking:', error)
    throw new Error('Failed to restart game with nuking')
  }
}

// Utility Actions
export async function getCurrentPlayer(gameId: string) {
  try {
    // console.log('getCurrentPlayer called for:', gameId)
    const gameState = await callGameDO(gameId, 'getState')
    return gameState.players[gameState.currentPlayerIndex]
  } catch (error) {
    console.error('Failed to get current player:', error)
    throw new Error('Failed to get current player')
  }
}

export async function getPlayerDecision(gameId: string, playerId: string) {
  try {
    console.log('getPlayerDecision called:', { gameId, playerId })
    const gameState = await callGameDO(gameId, 'getState')
    const player = gameState.players.find(p => p.id === playerId)
    return player?.pendingDecision || null
  } catch (error) {
    console.error('Failed to get player decision:', error)
    throw new Error('Failed to get player decision')
  }
}

export async function getGameSummary(gameId: string) {
  try {
    console.log('getGameSummary called for:', gameId)
    const gameState = await callGameDO(gameId, 'getState')
    return {
      id: gameState.id,
      status: gameState.status,
      currentYear: gameState.currentYear,
      currentPhase: gameState.currentPhase,
      currentPlayer: gameState.players[gameState.currentPlayerIndex],
      playerCount: gameState.players.length,
      actionCount: gameState.actions.length
    }
  } catch (error) {
    console.error('Failed to get game summary:', error)
    throw new Error('Failed to get game summary')
  }
}

// Test/Debug Actions
export async function initializeTestGame(gameId: string): Promise<GameState> {
  try {
    console.log('initializeTestGame called for:', gameId)
    
    // First try to get existing state
    try {
      const existingState = await callGameDO(gameId, 'getState')
      if (existingState && existingState.id) {
        console.log('Game already exists, returning existing state')
        return existingState
      }
    } catch (error) {
      console.log('No existing game found, creating new one')
    }
    
    // Create a new test game
    const territoryConfig = {
      'territory1': {
        name: 'North Base',
        initialMachines: 3,
        connections: ['territory2', 'territory3']
      },
      'territory2': {
        name: 'Central Hub', 
        initialMachines: 2,
        connections: ['territory1', 'territory3']
      },
      'territory3': {
        name: 'South Outpost',
        initialMachines: 1,
        connections: ['territory1', 'territory2']
      }
    }
    
    const result = await createGame(gameId, ['Player 1', 'Player 2'], territoryConfig)
    console.log('initializeTestGame result:', result)
    return result
  } catch (error) {
    console.error('Failed to initialize test game:', error)
    throw new Error('Failed to initialize test game')
  }
}

export async function placeUnit(
  gameId: string,
  playerId: string,
  territoryId: string,
  count: number = 1
): Promise<GameState> {
  try {
    console.log('placeUnit called:', { gameId, playerId, territoryId, count })
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'place_unit',
      playerId,
      data: { territoryId, count }
    })
    
    console.log('placeUnit result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to place unit:', error)
    throw new Error('Failed to place unit')
  }
}

export async function collectEnergy(
  gameId: string,
  playerId: string,
  amount: number
): Promise<GameState> {
  try {
    console.log('collectEnergy called:', { gameId, playerId, amount })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'collect_energy',
      playerId,
      data: { amount }
    })
    
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to collect energy:', error)
    throw new Error('Failed to collect energy')
  }
}

export async function spendEnergy(
  gameId: string,
  playerId: string,
  amount: number
): Promise<GameState> {
  try {
    console.log('spendEnergy called:', { gameId, playerId, amount })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'spend_energy',
      playerId,
      data: { amount }
    })
    
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to spend energy:', error)
    throw new Error('Failed to spend energy')
  }
}

export async function attackTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  attackingUnits: number
): Promise<GameState> {
  try {
    console.log('attackTerritory called:', { gameId, playerId, fromTerritoryId, toTerritoryId, attackingUnits })
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'attack_territory',
      playerId,
      data: { 
        fromTerritoryId, 
        toTerritoryId, 
        attackingUnits 
      }
    })
    
    console.log('attackTerritory result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to attack territory:', error)
    throw new Error('Failed to attack territory')
  }
}

export async function fortifyTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  unitCount: number
): Promise<GameState> {
  try {
    console.log('fortifyTerritory called:', { gameId, playerId, fromTerritoryId, toTerritoryId, unitCount })
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'fortify_territory',
      playerId,
      data: { 
        fromTerritoryId, 
        toTerritoryId, 
        unitCount 
      }
    })
    
    console.log('fortifyTerritory result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to fortify territory:', error)
    throw new Error('Failed to fortify territory')
  }
}

export async function checkForAITurn(gameId: string): Promise<{ needsAI: boolean, playerId?: string }> {
  try {
    console.log('checkForAITurn called:', { gameId })
    
    const gameState = await callGameDO(gameId, 'getState')
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    
    // ✅ UPDATED: Check for both setup and playing phases
    const needsAI = currentPlayer && 
                   currentPlayer.name === 'AI Player' && 
                   (gameState.status === 'setup' || gameState.status === 'playing')
    
    return {
      needsAI: !!needsAI,
      playerId: needsAI ? currentPlayer.id : undefined
    }
  } catch (error) {
    console.error('Failed to check for AI turn:', error)
    return { needsAI: false }
  }
}

// adding commander and base placements functions
// adding the nuke and water commanders who can be placed but arent at setup phase
// Add this to your gameActions.ts file:

export async function placeCommander(
  gameId: string,
  playerId: string,
  territoryId: string,
  commanderType: 'land' | 'diplomat' | 'nuke' | 'water'  // ✅ ADD nuke and water if you use them
): Promise<GameState> {
  try {
    console.log('placeCommander called:', { gameId, playerId, territoryId, commanderType })
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'place_commander',
      playerId,
      data: { territoryId, commanderType }
    })
    
    console.log('placeCommander result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to place commander:', error)
    throw new Error('Failed to place commander')
  }
}

export async function placeSpaceBase(
  gameId: string,
  playerId: string,
  territoryId: string
): Promise<GameState> {
  try {
    console.log('placeSpaceBase called:', { gameId, playerId, territoryId })
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'place_space_base',
      playerId,
      data: { territoryId }
    })
    
    console.log('placeSpaceBase result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to place space base:', error)
    throw new Error('Failed to place space base')
  }
}

// ✅ NEW: Bidding-related actions
export async function submitBid(
  gameId: string,
  playerId: string,
  bidAmount: number
): Promise<GameState> {
  try {
    console.log('submitBid called:', { gameId, playerId, bidAmount })
    
    // ✅ Use callGameDO like all other actions
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'place_bid',
      playerId,
      data: { bidAmount }
    })
    
    console.log('submitBid result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to submit bid:', error)
    throw new Error('Failed to submit bid')
  }
}

export async function startYearTurns(gameId: string): Promise<GameState> {
  try {
    console.log('startYearTurns called:', { gameId })
    
    // ✅ Use callGameDO like all other actions
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'start_year_turns',
      playerId: 'system',  // Required by Durable Object
      data: {}
    })
    
    console.log('startYearTurns result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to start year turns:', error)
    throw new Error('Failed to start year turns')
  }
}

export async function advancePlayerPhase(gameId: string, playerId: string): Promise<GameState> {
  try {
    console.log('advancePlayerPhase called:', { gameId, playerId })
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_player_phase',
      playerId,
      data: {}
    })
    
    console.log('advancePlayerPhase result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to advance player phase:', error)
    throw new Error('Failed to advance player phase')
  }
}

export async function collectAndStartDeploy(
  gameId: string,
  playerId: string,
  energyAmount: number,
  unitsToPlace: number
): Promise<GameState> {
  try {
    console.log('collectAndStartDeploy called:', { gameId, playerId, energyAmount, unitsToPlace })
    
    // Collect the energy and start deployment
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'collect_energy',
      playerId,
      data: { amount: energyAmount, unitsToPlace } // Pass units count for tracking
    })
    
    console.log('collectAndStartDeploy result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to collect and start deploy:', error)
    throw new Error('Failed to collect and start deploy')
  }
}

export async function confirmDeploymentComplete(
  gameId: string,
  playerId: string
): Promise<GameState> {
  try {
    console.log('confirmDeploymentComplete called:', { gameId, playerId })
    
    // Advance phase with deployment completion flag
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_player_phase',
      playerId,
      data: { deploymentComplete: true }
    })
    
    console.log('confirmDeploymentComplete result:', result)
    
    // Trigger realtime update
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    return result as GameState
  } catch (error) {
    console.error('Failed to confirm deployment complete:', error)
    throw new Error('Failed to confirm deployment complete')
  }
}