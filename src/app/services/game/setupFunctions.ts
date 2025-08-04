// /app/services/game/setupFunctions.ts
import type { GameState, GameAction, Player, Territory } from '@/app/lib/GameState'
import { GAME_CONFIG } from '@/app/services/game/gameSetup'

export function isSetupPhaseComplete(gameState: GameState, phase: string): boolean {
  if (!gameState) return false
  
  // Only check human players (exclude NPCs)
  const activePlayers = gameState.players.filter(p => 
    !p.name.includes('NPC') && p.name !== 'NPC'
  )
  
  console.log(`🔍 Checking if ${phase} phase is complete for ${activePlayers.length} active players`)
  
  const completionResults = activePlayers.map(player => {
    let isComplete = false
    
    switch (phase) {
      case 'units':
        // Player is done if they have no units left to place
        isComplete = (player.remainingUnitsToPlace || 0) <= 0
        console.log(`   ${player.name}: ${player.remainingUnitsToPlace || 0} units remaining - ${isComplete ? 'DONE' : 'NOT DONE'}`)
        break
        
      case 'land_commander':
        isComplete = player.territories.some(tId => 
          gameState?.territories[tId]?.landCommander === player.id
        )
        console.log(`   ${player.name}: has land commander - ${isComplete ? 'YES' : 'NO'}`)
        break
        
      case 'diplomat_commander':
        isComplete = player.territories.some(tId => 
          gameState?.territories[tId]?.diplomatCommander === player.id
        )
        console.log(`   ${player.name}: has diplomat commander - ${isComplete ? 'YES' : 'NO'}`)
        break
        
      case 'space_base':
        isComplete = player.territories.some(tId => 
          gameState?.territories[tId]?.spaceBase === player.id
        )
        console.log(`   ${player.name}: has space base - ${isComplete ? 'YES' : 'NO'}`)
        break
        
      default:
        isComplete = false
    }
    
    return isComplete
  })
  
  const allComplete = completionResults.every(result => result)
  console.log(`📊 Phase ${phase} completion: ${allComplete ? 'ALL DONE' : 'STILL WAITING'}`)
  
  return allComplete
}

export function advanceToNextSetupPlayer(gameState: GameState): GameState {
  const newState = { ...gameState }
  
  const activePlayers = newState.players.filter(player => 
    player.name !== 'NPC' && 
    !player.name.includes('NPC')
  )
  
  if (activePlayers.length === 0) {
    console.warn('⚠️ No active players found!')
    return newState
  }
  
  const currentActiveIndex = activePlayers.findIndex(p => 
    p.id === newState.players[newState.currentPlayerIndex].id
  )
  
  const nextActiveIndex = (currentActiveIndex + 1) % activePlayers.length
  const nextPlayer = activePlayers[nextActiveIndex]
  
  newState.currentPlayerIndex = newState.players.findIndex(p => p.id === nextPlayer.id)
  
  console.log(`🔄 Turn advanced to: ${nextPlayer.name}`)
  
  return newState
}

export interface SetupProgressionResult {
  newState: GameState
  shouldAdvancePhase: boolean
  shouldAdvanceTurn: boolean
  triggerAI?: boolean
  currentPlayer?: Player
}

export function handleSetupPhaseProgression(gameState: GameState, action: any): SetupProgressionResult {
  if (!gameState) return {
    newState: gameState,
    shouldAdvancePhase: false,
    shouldAdvanceTurn: false
  }

  const newState = { ...gameState }
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  let shouldAdvancePhase = false
  let shouldAdvanceTurn = false
  
  console.log(`📍 Handling setup progression - Phase: ${newState.setupPhase}, Player: ${currentPlayer.name}`)
  
  switch (newState.setupPhase) {
    case 'units':
      if (action.type === 'place_unit') {
        const playerCompletedTurn = (currentPlayer.unitsPlacedThisTurn || 0) >= 3 || 
                                  (currentPlayer.remainingUnitsToPlace || 0) <= 0
        
        if (playerCompletedTurn) {
          console.log(`✅ ${currentPlayer.name} completed units turn`)
          currentPlayer.unitsPlacedThisTurn = 0
          
          if (isSetupPhaseComplete(newState, 'units')) {
            console.log(`🎯 ALL players completed units phase - advancing to Land Commanders`)
            newState.setupPhase = 'land_commander'
            newState.currentPlayerIndex = 0
            shouldAdvancePhase = true
          } else {
            console.log(`🔄 Advancing to next player in units phase`)
            const updatedState = advanceToNextSetupPlayer(newState)
            Object.assign(newState, updatedState)
            shouldAdvanceTurn = true
          }
        }
      }
      break

    case 'land_commander':
      if (action.type === 'place_commander' && action.data.commanderType === 'land') {
        if (isSetupPhaseComplete(newState, 'land_commander')) {
          console.log(`🎯 ALL players completed land commander phase - advancing to Diplomat Commanders`)
          newState.setupPhase = 'diplomat_commander'
          newState.currentPlayerIndex = 0
          shouldAdvancePhase = true
        } else {
          const updatedState = advanceToNextSetupPlayer(newState)
          Object.assign(newState, updatedState)
          shouldAdvanceTurn = true
        }
      }
      break

    case 'diplomat_commander':
      if (action.type === 'place_commander' && action.data.commanderType === 'diplomat') {
        if (isSetupPhaseComplete(newState, 'diplomat_commander')) {
          console.log(`🎯 ALL players completed diplomat commander phase - advancing to Space Bases`)
          newState.setupPhase = 'space_base'
          newState.currentPlayerIndex = 0
          shouldAdvancePhase = true
        } else {
          const updatedState = advanceToNextSetupPlayer(newState)
          Object.assign(newState, updatedState)
          shouldAdvanceTurn = true
        }
      }
      break

    case 'space_base':
      if (action.type === 'place_space_base') {
        if (isSetupPhaseComplete(newState, 'space_base')) {
          console.log(`🎮 ALL setup phases complete! Starting Year 1 bidding`)
          newState.setupPhase = 'complete'
          newState.status = 'bidding'
          
          // ✅ FIX: Only include non-NPC players in bidding
          const biddingPlayers = newState.players.filter(player => 
            !player.name.includes('NPC') && player.name !== 'NPC'
          )
          
          newState.bidding = {
            year: 1,
            bidsSubmitted: {},
            bidsRevealed: false,
            playersWaitingToBid: biddingPlayers.map(p => p.id), // ✅ Only real players
            finalTurnOrder: undefined,
            highestBidder: undefined,
            tiebreakRoll: undefined
          }
          
          // ✅ FIX: Clear bids for ALL players (including NPCs)
          newState.players.forEach(player => {
            player.currentBid = undefined
          })
          
          newState.currentPlayerIndex = 0
          newState.players.forEach(p => p.isActive = false)
          newState.players[0].isActive = true
          
          shouldAdvancePhase = true
        } else {
          const updatedState = advanceToNextSetupPlayer(newState)
          Object.assign(newState, updatedState)
          shouldAdvanceTurn = true
        }
      }
      break
  }

  return {
    newState,
    shouldAdvancePhase,
    shouldAdvanceTurn,
    triggerAI: shouldAdvancePhase || shouldAdvanceTurn,
    currentPlayer: newState.players[newState.currentPlayerIndex]
  }
}

// AI SETUP HELPERS
export function doAIUnitPlacement(gameState: GameState): {
  success: boolean
  unitsToPlace: number
  territories: string[]
} {
  if (!gameState) return { success: false, unitsToPlace: 0, territories: [] }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  if (!currentPlayer) return { success: false, unitsToPlace: 0, territories: [] }
  
  console.log(`🤖 AI ${currentPlayer.name} starting unit placement`)
  console.log(`🤖 Remaining units: ${currentPlayer.remainingUnitsToPlace}`)
  console.log(`🤖 Units placed this turn: ${currentPlayer.unitsPlacedThisTurn || 0}`)
  
  const maxUnitsThisTurn = Math.min(3, currentPlayer.remainingUnitsToPlace || 0)
  const unitsAlreadyPlaced = currentPlayer.unitsPlacedThisTurn || 0
  const unitsToPlace = maxUnitsThisTurn - unitsAlreadyPlaced
  
  const territories = currentPlayer.territories.filter(id => 
    gameState?.territories[id]?.ownerId === currentPlayer.id
  )
  
  return {
    success: unitsToPlace > 0 && territories.length > 0,
    unitsToPlace,
    territories
  }
}

export function doAICommanderPlacement(gameState: GameState, commanderType: 'land' | 'diplomat'): {
  success: boolean
  targetTerritory?: Territory
} {
  if (!gameState) return { success: false }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  if (!currentPlayer) return { success: false }
  
  console.log(`🤖 AI placing ${commanderType} commander`)
  
  // AI Strategy: Place on territory with most or second most units
  const playerTerritories = currentPlayer.territories
    .map(id => gameState?.territories[id])
    .filter(t => t && t.ownerId === currentPlayer.id)
    .sort((a, b) => (b?.machineCount || 0) - (a?.machineCount || 0))
  
  if (playerTerritories.length === 0) return { success: false }
  
  // Choose strongest or second strongest territory
  const targetTerritory = playerTerritories[Math.random() > 0.5 ? 0 : Math.min(1, playerTerritories.length - 1)]
  
  return {
    success: true,
    targetTerritory
  }
}

export function doAISpaceBasePlacement(gameState: GameState): {
  success: boolean
  targetTerritory?: Territory
} {
  if (!gameState) return { success: false }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  if (!currentPlayer) return { success: false }
  
  console.log(`🤖 AI placing space base`)
  
  const playerTerritories = currentPlayer.territories
    .map(id => gameState?.territories[id])
    .filter(t => t && t.ownerId === currentPlayer.id)
  
  if (playerTerritories.length === 0) return { success: false }
  
  // Prefer territories with commanders, otherwise random strong territory
  const territoriesWithCommanders = playerTerritories.filter(t => 
    t?.landCommander === currentPlayer.id || t?.diplomatCommander === currentPlayer.id
  )
  
  const targetTerritory = territoriesWithCommanders.length > 0 
    ? territoriesWithCommanders[Math.floor(Math.random() * territoriesWithCommanders.length)]
    : playerTerritories[Math.floor(Math.random() * Math.min(3, playerTerritories.length))]
  
  return {
    success: true,
    targetTerritory
  }
}

// AI EXECUTION FUNCTIONS
export function executeAIUnitPlacement(
  gameState: GameState, 
  placementInfo: ReturnType<typeof doAIUnitPlacement>,
  onStateUpdate: (state: GameState) => void,
  onComplete: () => void
): void {
  if (!placementInfo.success || !gameState) {
    console.log(`🤖 AI has no units to place or no territories`)
    setTimeout(onComplete, 500)
    return
  }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const territories = placementInfo.territories
  
  let delay = 0
  for (let i = 0; i < placementInfo.unitsToPlace; i++) {
    delay += 800
    
    setTimeout(() => {
      if (!gameState) return
      
      const randomTerritory = territories[Math.floor(Math.random() * territories.length)]
      const territory = gameState.territories[randomTerritory]
      
      if (territory && territory.ownerId === currentPlayer.id) {
        // Apply the placement directly
        territory.machineCount += 1
        currentPlayer.remainingUnitsToPlace = (currentPlayer.remainingUnitsToPlace || 0) - 1
        currentPlayer.unitsPlacedThisTurn = (currentPlayer.unitsPlacedThisTurn || 0) + 1
        
        console.log(`🤖 AI placed unit on ${territory.name} (${currentPlayer.unitsPlacedThisTurn}/3 this turn, ${currentPlayer.remainingUnitsToPlace} remaining)`)
        
        // Broadcast the update
        onStateUpdate(gameState)
        
        // Check if AI completed their turn
        if (currentPlayer.unitsPlacedThisTurn >= 3 || currentPlayer.remainingUnitsToPlace <= 0) {
          console.log(`🤖 AI completed unit placement turn`)
          setTimeout(onComplete, 600)
        }
      }
    }, delay)
  }
}

export function executeAICommanderPlacement(
  gameState: GameState,
  commanderType: 'land' | 'diplomat',
  placementInfo: ReturnType<typeof doAICommanderPlacement>,
  onStateUpdate: (state: GameState) => void,
  onComplete: (actionData: any) => void
): void {
  if (!placementInfo.success || !placementInfo.targetTerritory || !gameState) {
    console.log(`🤖 AI couldn't find territory for ${commanderType} commander`)
    return
  }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const targetTerritory = placementInfo.targetTerritory
  
  setTimeout(() => {
    if (!gameState) return
    
    // Apply the commander placement
    if (commanderType === 'land') {
      targetTerritory.landCommander = currentPlayer.id
    } else {
      targetTerritory.diplomatCommander = currentPlayer.id
    }
    
    console.log(`🤖 AI placed ${commanderType} commander on ${targetTerritory.name}`)
    
    // ✅ FIXED: Only ONE state update and completion call
    onStateUpdate(gameState)
    onComplete({ 
      type: 'place_commander',
      commanderType, 
      territoryId: targetTerritory.id 
    })
  }, 800)
}

export function executeAISpaceBasePlacement(
  gameState: GameState,
  placementInfo: ReturnType<typeof doAISpaceBasePlacement>,
  onStateUpdate: (state: GameState) => void,
  onComplete: (actionData: any) => void
): void {
  if (!placementInfo.success || !placementInfo.targetTerritory || !gameState) {
    console.log(`🤖 AI couldn't find territory for space base`)
    return
  }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const targetTerritory = placementInfo.targetTerritory
  
  setTimeout(() => {
    if (!gameState) return
    
    targetTerritory.spaceBase = currentPlayer.id
    
    console.log(`🤖 AI placed space base on ${targetTerritory.name}`)
    onStateUpdate(gameState)
    
    setTimeout(() => {
      onStateUpdate(gameState)
      onComplete({ territoryId: targetTerritory.id })
      
      // Final update
      setTimeout(() => {
        onStateUpdate(gameState)
      }, 300)
    }, 400)
  }, 700)
}

// SETUP ORCHESTRATION
export function orchestrateAISetupAction(
  gameState: GameState,
  onStateUpdate: (state: GameState) => void,
  onProgressionNeeded: (actionData: any) => void
): void {
  if (!gameState) return
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  console.log(`🤖 AI ${currentPlayer.name} doing ${gameState.setupPhase} action`)
  
  switch (gameState.setupPhase) {
    case 'units':
      const unitPlacement = doAIUnitPlacement(gameState)
      executeAIUnitPlacement(gameState, unitPlacement, onStateUpdate, () => {
        onProgressionNeeded({ 
          type: 'place_unit', 
          playerId: currentPlayer.id 
        })
      })
      break
      
    case 'land_commander':
      const landPlacement = doAICommanderPlacement(gameState, 'land')
      executeAICommanderPlacement(gameState, 'land', landPlacement, onStateUpdate, (actionData) => {
        onProgressionNeeded({ 
          type: 'place_commander', 
          playerId: currentPlayer.id,
          data: actionData
        })
      })
      break
      
    case 'diplomat_commander':
      const diplomatPlacement = doAICommanderPlacement(gameState, 'diplomat')
      executeAICommanderPlacement(gameState, 'diplomat', diplomatPlacement, onStateUpdate, (actionData) => {
        onProgressionNeeded({ 
          type: 'place_commander', 
          playerId: currentPlayer.id,
          data: actionData
        })
      })
      break
      
    case 'space_base':
      const spacePlacement = doAISpaceBasePlacement(gameState)
      executeAISpaceBasePlacement(gameState, spacePlacement, onStateUpdate, (actionData) => {
        onProgressionNeeded({ 
          type: 'place_space_base', 
          playerId: currentPlayer.id,
          data: actionData
        })
      })
      break
  }
}