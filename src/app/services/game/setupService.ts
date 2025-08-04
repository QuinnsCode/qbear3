// ===== /app/services/game/setupService.ts =====
import type { GameState, GameAction, Player, Territory } from '@/app/lib/GameState'
import { 
  handleSetupPhaseProgression as originalHandleSetupPhaseProgression,
  orchestrateAISetupAction as originalOrchestrateAISetupAction
} from '@/app/services/game/setupFunctions'

export function placeUnit(gameState: GameState, action: GameAction): GameState {
  const { territoryId, count } = action.data
  let newState = { ...gameState }
  
  const territory = newState.territories[territoryId]
  const player = newState.players.find(p => p.id === action.playerId)
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  
  if (!territory || !player) {
    console.log(`❌ Invalid territory or player`)
    return newState
  }
  
  if (territory.ownerId !== action.playerId) {
    console.log(`❌ Player doesn't own territory`)
    return newState
  }
  
  if (count !== 1) {
    console.log(`❌ Can only place 1 unit at a time`)
    return newState
  }
  
  if ((player.remainingUnitsToPlace || 0) <= 0) {
    console.log(`❌ Player has no units left to place`)
    return newState
  }
  
  if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
    console.log(`❌ ${player.name} tried to place unit but it's ${currentPlayer.name}'s turn`)
    return newState
  }
  
  const currentUnitsPlaced = player.unitsPlacedThisTurn || 0
  if (newState.setupPhase === 'units' && currentUnitsPlaced >= 3) {
    console.log(`❌ ${player.name} has already placed 3 units this turn`)
    return newState
  }
  
  territory.machineCount += 1
  player.remainingUnitsToPlace = (player.remainingUnitsToPlace || 0) - 1
  player.unitsPlacedThisTurn = currentUnitsPlaced + 1
  
  console.log(`✅ ${player.name} placed unit on ${territory.name} (${player.unitsPlacedThisTurn}/3 this turn, ${player.remainingUnitsToPlace} remaining)`)
  
  return newState
}

export function placeCommander(gameState: GameState, action: GameAction): GameState {
  const { territoryId, commanderType } = action.data
  const newState = { ...gameState }
  
  const territory = newState.territories[territoryId]
  const player = newState.players.find(p => p.id === action.playerId)
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  
  if (!territory || !player || territory.ownerId !== action.playerId) {
    return newState
  }
  
  if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
    console.log(`❌ ${player.name} tried to place commander but it's ${currentPlayer.name}'s turn`)
    return newState
  }
  
  if (commanderType === 'land') {
    territory.landCommander = action.playerId
    console.log(`📍 ${player.name} placed Land Commander on ${territory.name}`)
  } else if (commanderType === 'diplomat') {
    territory.diplomatCommander = action.playerId
    console.log(`📍 ${player.name} placed Diplomat Commander on ${territory.name}`)
  }
  
  return newState
}

export function placeSpaceBase(gameState: GameState, action: GameAction): GameState {
  const { territoryId } = action.data
  const newState = { ...gameState }
  
  const territory = newState.territories[territoryId]
  const player = newState.players.find(p => p.id === action.playerId)
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  
  if (!territory || !player || territory.ownerId !== action.playerId) {
    return newState
  }
  
  if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
    console.log(`❌ ${player.name} tried to place space base but it's ${currentPlayer.name}'s turn`)
    return newState
  }
  
  territory.spaceBase = action.playerId
  console.log(`🚀 ${player.name} placed Space Base on ${territory.name}`)
  
  return newState
}

export function handleSetupPhaseProgression(gameState: GameState, action: any) {
  return originalHandleSetupPhaseProgression(gameState, action)
}

export function orchestrateAISetupAction(
  gameState: GameState,
  onStateUpdate: (state: GameState) => void,
  onProgressionNeeded: (actionData: any) => void
): void {
  return originalOrchestrateAISetupAction(gameState, onStateUpdate, onProgressionNeeded)
}