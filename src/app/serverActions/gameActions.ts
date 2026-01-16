// app/serverActions/gameActions.ts - FIXED for RedwoodJS SDK
//we try to keep the server actions in here for our game

'use server'

import { env } from "cloudflare:workers";
import { syncGameState } from "@/lib/syncedState";
import type { GameState, AttackResult, InvasionResult, MoveResult } from '@/app/lib/GameState'


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
    // await syncDeckBuilder(userId);(gameId, result);

    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState
  } catch (error) {
    console.error('Failed to spend energy:', error)
    throw new Error('Failed to spend energy')
  }
}

// ================================
// NEW TWO-PHASE INVASION SYSTEM
// ================================

/**
 * PHASE 1: Resolve Combat (Calculate dice results, store pendingConquest)
 * This replaces the old invadeTerritory action
 */
export async function invadeTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  attackingUnits: number,
  commanderTypes: string[] = []
): Promise<GameState> {
  try {
    console.log('🎯 PHASE 1: Resolving combat:', {
      gameId,
      playerId,
      fromTerritoryId,
      toTerritoryId,
      attackingUnits,
      commanderTypes
    });

    // ✅ CHANGED: Use new 'resolve_combat' action type
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'resolve_combat',  // ✅ NEW ACTION TYPE
      playerId,
      data: { fromTerritoryId, toTerritoryId, attackingUnits, commanderTypes }
    });
    
    console.log('🎯 Combat resolution result:', {
      pendingConquest: result.pendingConquest,
      territoryConquered: !!result.pendingConquest
    });

    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState;
  } catch (error) {
    console.error('❌ Failed to resolve combat:', error);
    throw new Error(`Failed to resolve combat: ${error.message}`);
  }
}

/**
 * PHASE 2: Confirm Conquest (Choose additional move-in, apply territory ownership)
 * This is the NEW action for completing a conquest
 */
export async function confirmConquest(
  gameId: string,
  playerId: string,
  additionalUnits: number
): Promise<GameState> {
  try {
    console.log('📦 PHASE 2: Confirming conquest with additional units:', {
      gameId,
      playerId,
      additionalUnits
    });

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'confirm_conquest',  // ✅ NEW ACTION TYPE
      playerId,
      data: { additionalUnits }
    });
    
    console.log('✅ Conquest confirmed:', result);

    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState;
  } catch (error) {
    console.error('❌ Failed to confirm conquest:', error);
    throw new Error(`Failed to confirm conquest: ${error.message}`);
  }
}

// ✅ ENHANCED: Move into empty territory (for nuclear devastation, etc.)
export async function moveIntoEmptyTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  movingUnits: number
): Promise<GameState> {
  try {
    console.log('🚶 Moving into empty territory:', {
      gameId,
      playerId,
      fromTerritoryId,
      toTerritoryId,
      movingUnits
    });

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'move_into_empty_territory',
      playerId,
      data: { fromTerritoryId, toTerritoryId, movingUnits }
    });
    
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState;
  } catch (error) {
    console.error('❌ Failed to move into empty territory:', error);
    throw new Error(`Failed to move into empty territory: ${error.message}`);
  }
}

export async function startInvasionPhase(
  gameId: string,
  playerId: string
): Promise<GameState> {
  try {
    console.log('⚔️ Starting invasion phase:', { gameId, playerId });
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'start_invasion_phase',
      playerId,
      data: {}
    });
    
    console.log('⚔️ Invasion phase started:', result);
    
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState;
  } catch (error) {
    console.error('❌ Failed to start invasion phase:', error);
    throw new Error(`Failed to start invasion phase: ${error.message}`);
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
// adding the nuclear and naval commanders who can be placed but arent at setup phase
// Add this to your gameActions.ts file:

export async function placeCommander(
  gameId: string,
  playerId: string,
  territoryId: string,
  commanderType: 'land' | 'diplomat' | 'nuclear' | 'naval'  // ✅ ADD nuclear and naval if you use them
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
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
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState
  } catch (error) {
    console.error('Failed to advance player phase:', error)
    throw new Error('Failed to advance player phase')
  }
}

// Update your collectAndStartDeploy in gameActions.ts with better logging:
// Update your collectAndStartDeploy in gameActions.ts:
export async function collectAndStartDeploy(
  gameId: string,
  playerId: string,
  energyAmount: number,
  unitsToPlace: number
): Promise<GameState> {
  try {
    console.log('🎯 SERVER ACTION: collectAndStartDeploy called:', { 
      gameId, 
      playerId, 
      energyAmount, 
      unitsToPlace 
    })
    
    // ✅ CRITICAL: Validate inputs
    if (typeof energyAmount !== 'number' || energyAmount <= 0) {
      console.error('❌ Invalid energyAmount:', energyAmount)
      throw new Error(`Invalid energyAmount: ${energyAmount}`)
    }
    
    if (typeof unitsToPlace !== 'number' || unitsToPlace <= 0) {
      console.error('❌ Invalid unitsToPlace:', unitsToPlace)  
      throw new Error(`Invalid unitsToPlace: ${unitsToPlace}`)
    }
    
    console.log('🎯 Sending data to Durable Object:', {
      type: 'collect_energy',
      playerId,
      data: { amount: energyAmount, unitsToPlace }
    })
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'collect_energy',
      playerId,
      data: { amount: energyAmount, unitsToPlace } // ✅ Both values passed explicitly
    })
    
    // ✅ VERIFY the result has correct data
    const updatedPlayer = result.players?.find(p => p.id === playerId)
    console.log('🎯 SERVER ACTION: Result verification:', {
      playerId,
      playerName: updatedPlayer?.name,
      unitsToPlaceThisTurn: updatedPlayer?.unitsToPlaceThisTurn,
      unitsPlacedThisTurn: updatedPlayer?.unitsPlacedThisTurn,
      energy: updatedPlayer?.energy,
      gameStatus: result.status,
      currentPhase: result.currentPhase
    })
    
    // ✅ CRITICAL: Verify the overlay should show
    if (result.status === 'playing' && result.currentPhase === 1) {
      const currentPlayer = result.players[result.currentPlayerIndex]
      if (currentPlayer?.id === playerId) {
        console.log('✅ CollectDeployOverlay should now be visible for', currentPlayer.name)
      }
    }
    
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState
  } catch (error) {
    console.error('❌ SERVER ACTION: collectAndStartDeploy failed:', error)
    throw new Error(`Failed to collect and start deploy: ${error.message}`)
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
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState
  } catch (error) {
    console.error('Failed to confirm deployment complete:', error)
    throw new Error('Failed to confirm deployment complete')
  }
}

/**
 * Advance from Build & Hire phase to Buy Cards phase
 */
export async function advanceFromBuildHire(
  gameId: string,
  playerId: string
): Promise<GameState> {
  try {
    console.log('🎯 Advancing from Build & Hire to Buy Cards phase');

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_player_phase',
      playerId,
      data: { phaseComplete: true }
    });

    console.log('✅ Phase advance successful:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Phase advance error:', error);
    throw new Error(`Failed to advance phase: ${error.message}`);
  }
}

/**
 * Purchase and place commander in a single atomic action during Build & Hire phase (Phase 2)
 */
export async function purchaseAndPlaceCommander(
  gameId: string,
  playerId: string,
  territoryId: string,
  commanderType: 'land' | 'diplomat' | 'naval' | 'nuclear',
  cost: number
): Promise<GameState> {
  try {
    console.log(`🛒🏗️ Purchasing and placing ${commanderType} commander on territory ${territoryId} for ${cost} energy`);

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'purchase_and_place_commander',
      playerId,
      data: { territoryId, commanderType, cost }
    });

    console.log('✅ Commander purchase and placement successful:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Commander purchase and placement error:', error);
    throw new Error(`Failed to purchase and place commander: ${error.message}`);
  }
}

/**
 * Purchase and place space base in a single atomic action during Build & Hire phase (supports multiple purchases)
 */
export async function purchaseAndPlaceSpaceBase(
  gameId: string,
  playerId: string,
  territoryId: string,
  cost: number
): Promise<GameState> {
  try {
    console.log(`🛒🏰 Purchasing and placing space base on territory ${territoryId} for ${cost} energy`);

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'purchase_and_place_space_base',
      playerId,
      data: { territoryId, cost }
    });

    console.log('✅ Space base purchase and placement successful:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Space base purchase and placement error:', error);
    throw new Error(`Failed to purchase and place space base: ${error.message}`);
  }
}

/**
 * Purchase cards from commander decks (Phase 3)
 * selectedCards: Array<{ commanderType: string, quantity: number }>
 */
export async function purchaseCards(
  gameId: string,
  playerId: string,
  selectedCards: Array<{ commanderType: string, quantity: number }>
): Promise<GameState> {
  try {
    console.log(`🛒📋 Purchasing cards:`, selectedCards);

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'purchase_cards',
      playerId,
      data: { selectedCards }
    });

    console.log('✅ Cards purchased successfully:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Card purchase error:', error);
    throw new Error(`Failed to purchase cards: ${error.message}`);
  }
}

/**
 * Advance from Buy Cards phase to Play Cards phase
 */
export async function advanceFromBuyCards(
  gameId: string,
  playerId: string
): Promise<GameState> {
  try {
    console.log('🎯 Advancing from Buy Cards to Play Cards phase');

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_player_phase',
      playerId,
      data: { phaseComplete: true }
    });

    console.log('✅ Phase advance successful:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Phase advance error:', error);
    throw new Error(`Failed to advance phase: ${error.message}`);
  }
}

export async function advanceFromPlayCards(gameId: string, playerId: string): Promise<GameState> {
  try {
    console.log('🎯 Advancing from Play Cards to Play Cards phase at Attack Phase');

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_player_phase',
      playerId,
      data: { phaseComplete: true }
    });

    console.log('✅ Phase advance successful:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Phase advance error:', error);
    throw new Error(`Failed to advance phase: ${error.message}`);
  }
}

export async function confirmAdditionalMoveIn(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  additionalUnits: number
): Promise<GameState> {
  console.warn('⚠️ confirmAdditionalMoveIn is deprecated - use confirmConquest instead');
  
  // ✅ Redirect to new system
  return confirmConquest(gameId, playerId, additionalUnits);
}

// ================================
// HELPER FUNCTIONS FOR UI
// ================================

/**
 * Check if player has a pending conquest awaiting move-in decision
 */
export async function hasPendingConquest(gameId: string, playerId: string): Promise<boolean> {
  try {
    const gameState = await getGameState(gameId);
    return !!(gameState.pendingConquest && gameState.pendingConquest.playerId === playerId);
  } catch (error) {
    console.error('Failed to check pending conquest:', error);
    return false;
  }
}

/**
 * Get pending conquest details for UI
 */
export async function getPendingConquest(gameId: string, playerId: string) {
  try {
    const gameState = await getGameState(gameId);
    
    if (gameState.pendingConquest && gameState.pendingConquest.playerId === playerId) {
      return {
        conquest: gameState.pendingConquest,
        fromTerritory: gameState.territories[gameState.pendingConquest.fromTerritoryId],
        toTerritory: gameState.territories[gameState.pendingConquest.toTerritoryId]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get pending conquest:', error);
    return null;
  }
}

/**
 * Advance from Invasion phase (5) to Fortify phase (6)
 */
export async function advanceFromInvasion(
  gameId: string,
  playerId: string
): Promise<GameState> {
  try {
    console.log('🎯 Advancing from Invasion to Fortify phase');

    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_player_phase',
      playerId,
      data: { phaseComplete: true }
    });

    console.log('✅ Phase advance successful:', result);
    
    // Trigger realtime update
    // await syncDeckBuilder(userId);(gameId, result);

    return result as GameState;
  } catch (error) {
    console.error('❌ Phase advance error:', error);
    throw new Error(`Failed to advance from invasion phase: ${error.message}`);
  }
}

export async function advanceFromFortify(gameId: string, playerId: string): Promise<GameState> {
  try {
    console.log('Advancing from Fortify phase - ending turn');
    
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'advance_from_fortify',
      playerId,
      data: { phaseComplete: true }
    });
    
    console.log('Turn ended - advancing to next player');
    
    // await syncDeckBuilder(userId);(gameId, result);
    
    return result as GameState;
  } catch (error) {
    console.error('Advance from fortify failed:', error);
    throw new Error(`Failed to advance from fortify: ${error.message}`);
  }
}