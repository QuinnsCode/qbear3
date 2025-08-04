// ===== /app/services/game/mainGameService.ts =====
import type { GameState, GameAction, Player } from '@/app/lib/GameState'
import { GAME_CONFIG } from '@/app/services/game/gameSetup'

export function collectEnergy(gameState: GameState, action: GameAction): GameState {
  const { amount } = action.data
  const newState = { ...gameState }
  const player = newState.players.find(p => p.id === action.playerId)
  
  if (!player) return newState
  
  player.energy += amount
  console.log(`⚡ ${player.name} collected ${amount} energy (${player.energy} total)`)
  
  return newState
}

export function spendEnergy(gameState: GameState, action: GameAction): GameState {
  const { amount } = action.data
  const newState = { ...gameState }
  const player = newState.players.find(p => p.id === action.playerId)
  
  if (!player || player.energy < amount) {
    console.log(`❌ Player ${action.playerId} doesn't have enough energy`)
    return newState
  }
  
  player.energy -= amount
  console.log(`⚡ ${player.name} spent ${amount} energy (${player.energy} remaining)`)
  
  return newState
}

export function startMainGame(gameState: GameState, action: GameAction): GameState {
  const newState = { ...gameState }
  
  console.log(`🎮 Starting main game with turn cycle!`)
  
  newState.status = 'playing'
  newState.currentYear = 1
  newState.currentPhase = 1
  
  const firstPlayerId = newState.activeTurnOrder[0]
  const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
  
  newState.currentPlayerIndex = firstPlayerIndex
  newState.players.forEach(p => p.isActive = false)
  newState.players[firstPlayerIndex].isActive = true
  
  console.log(`🎯 Turn 1, Phase 1: ${newState.players[firstPlayerIndex].name} starts`)
  
  return newState
}

export function advancePlayerPhase(gameState: GameState, action: GameAction): GameState {
  const newState = { ...gameState }
  
  if (newState.status !== 'playing') {
    console.log('❌ Cannot advance phase - not in playing mode')
    return newState
  }
  
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  
  if (newState.currentPhase === 6) {
    console.log(`✅ ${currentPlayer.name} completed all 6 phases`)
    return advanceToNextPlayer(newState)
  } else {
    newState.currentPhase = (newState.currentPhase + 1) as any
    const phaseInfo = GAME_CONFIG.PLAYER_PHASES[newState.currentPhase]
    
    console.log(`📋 ${currentPlayer.name} → Phase ${newState.currentPhase}: ${phaseInfo.name}`)
  }
  
  return newState
}

function advanceToNextPlayer(gameState: GameState): GameState {
  const newState = { ...gameState }
  
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  const currentTurnIndex = newState.activeTurnOrder.indexOf(currentPlayer.id)
  
  const nextTurnIndex = (currentTurnIndex + 1) % newState.activeTurnOrder.length
  
  if (nextTurnIndex === 0) {
    return advanceGameTurn(newState)
  }
  
  const nextPlayerId = newState.activeTurnOrder[nextTurnIndex]
  const nextPlayerIndex = newState.players.findIndex(p => p.id === nextPlayerId)
  
  newState.players[newState.currentPlayerIndex].isActive = false
  newState.currentPlayerIndex = nextPlayerIndex
  newState.players[nextPlayerIndex].isActive = true
  newState.currentPhase = 1
  
  const nextPlayer = newState.players[nextPlayerIndex]
  console.log(`🔄 ${nextPlayer.name}'s turn → Phase 1: ${GAME_CONFIG.PLAYER_PHASES[1].name}`)
  
  return newState
}

function advanceGameTurn(gameState: GameState): GameState {
  const newState = { ...gameState }
  
  if (newState.currentYear >= 5) {
    newState.status = 'finished'
    console.log('🏁 Game finished after 5 turns!')
    return newState
  }
  
  newState.currentYear = (newState.currentYear + 1) as any
  newState.currentPhase = 1
  
  const firstPlayerId = newState.activeTurnOrder[0]
  const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
  
  newState.players.forEach(p => p.isActive = false)
  newState.currentPlayerIndex = firstPlayerIndex
  newState.players[firstPlayerIndex].isActive = true
  
  newState.activeTurnOrder.forEach(playerId => {
    const player = newState.players.find(p => p.id === playerId)
    if (player) {
      const income = calculateTurnIncome(player, newState)
      player.energy += income
      console.log(`💰 ${player.name} received ${income} energy (total: ${player.energy})`)
    }
  })
  
  const firstPlayer = newState.players[firstPlayerIndex]
  console.log(`🎯 Turn ${newState.currentYear} begins! ${firstPlayer.name} starts Phase 1`)
  
  return newState
}

export function calculateTurnIncome(player: Player, gameState: GameState): number {
  const baseIncome = 3
  const territoryIncome = player.territories.length
  return baseIncome + territoryIncome
}

export function playCard(gameState: GameState, action: GameAction): GameState {
  const { cardId, targets } = action.data
  const newState = { ...gameState }
  const player = newState.players.find(p => p.id === action.playerId)
  
  if (!player) return newState
  
  const cardIndex = player.cards.findIndex(c => c.id === cardId)
  if (cardIndex === -1) return newState
  
  const card = player.cards[cardIndex]
  player.cards.splice(cardIndex, 1)
  
  return newState
}

export function fortifyTerritory(gameState: GameState, action: GameAction): GameState {
  const { fromTerritoryId, toTerritoryId, unitCount } = action.data
  const newState = { ...gameState }
  
  const fromTerritory = newState.territories[fromTerritoryId]
  const toTerritory = newState.territories[toTerritoryId]
  
  if (!fromTerritory || !toTerritory) {
    console.warn('Invalid territories for fortify')
    return newState
  }
  
  if (fromTerritory.ownerId !== action.playerId || toTerritory.ownerId !== action.playerId) {
    console.warn('Player must own both territories to fortify')
    return newState
  }
  
  if (fromTerritory.machineCount <= unitCount) {
    console.warn('Not enough units to fortify (must leave 1 behind)')
    return newState
  }
  
  fromTerritory.machineCount -= unitCount
  toTerritory.machineCount += unitCount
  
  console.log(`🛡️ Fortified ${toTerritory.name} with ${unitCount} units from ${fromTerritory.name}`)
  return newState
}

export function attackTerritory(
  gameState: GameState, 
  action: GameAction,
  resolveCombatFn: (attackingUnits: number, defendingUnits: number, attackerId: string, defenderId: string) => any
): GameState {
  const { fromTerritoryId, toTerritoryId, attackingUnits } = action.data
  const newState = { ...gameState }
  
  const fromTerritory = newState.territories[fromTerritoryId]
  const toTerritory = newState.territories[toTerritoryId]
  
  if (!fromTerritory || !toTerritory) {
    console.warn('Invalid territories for attack')
    return newState
  }
  
  if (fromTerritory.ownerId !== action.playerId) {
    console.warn(`Player ${action.playerId} does not own attacking territory`)
    return newState
  }
  
  if (toTerritory.ownerId === action.playerId) {
    console.warn('Cannot attack your own territory')
    return newState
  }
  
  if (fromTerritory.machineCount <= attackingUnits) {
    console.warn('Not enough units to attack (must leave 1 behind)')
    return newState
  }
  
  const combatResult = resolveCombatFn(
    attackingUnits,
    toTerritory.machineCount,
    action.playerId,
    toTerritory.ownerId || 'neutral'
  )
  
  fromTerritory.machineCount -= combatResult.attackerLosses
  toTerritory.machineCount -= combatResult.defenderLosses
  
  if (toTerritory.machineCount <= 0) {
    toTerritory.ownerId = action.playerId
    toTerritory.machineCount = combatResult.attackerUnitsRemaining
    
    const attacker = newState.players.find(p => p.id === action.playerId)
    const defender = newState.players.find(p => p.id === toTerritory.ownerId)
    
    if (attacker && !attacker.territories.includes(toTerritoryId)) {
      attacker.territories.push(toTerritoryId)
    }
    
    if (defender) {
      defender.territories = defender.territories.filter(id => id !== toTerritoryId)
    }
    
    console.log(`🎯 ${fromTerritory.name} conquered ${toTerritory.name}!`)
  } else {
    console.log(`⚔️ Attack from ${fromTerritory.name} to ${toTerritory.name} repelled`)
  }
  
  return newState
}

export function handleMainGameProgression(
  gameState: GameState, 
  action: any, 
  calculateTurnIncomeFn: (player: Player, gameState: GameState) => number
): { stateChanged: boolean, newState: GameState, shouldScheduleAI: boolean } {
  if (gameState.status !== 'playing') {
    return { stateChanged: false, newState: gameState, shouldScheduleAI: false }
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  let shouldAdvancePhase = false
  let shouldAdvanceTurn = false
  
  console.log(`📍 Handling main game progression - Turn: ${gameState.currentYear}, Phase: ${gameState.currentPhase}, Player: ${currentPlayer.name}`)
  
  let phaseCompleted = false
  
  switch (gameState.currentPhase) {
    case 1: // Collect & Deploy
      if (action.type === 'collect_energy' || action.type === 'deploy_mods' || action.type === 'advance_player_phase') {
        phaseCompleted = true
      }
      break
    case 2: // Build & Hire  
      if (action.type === 'hire_commander' || action.type === 'build_station' || action.type === 'advance_player_phase') {
        phaseCompleted = true
      }
      break
    case 3: // Buy Cards
      if (action.type === 'buy_card' || action.type === 'advance_player_phase') {
        phaseCompleted = true
      }
      break
    case 4: // Play Cards
      if (action.type === 'play_card' || action.type === 'advance_player_phase') {
        phaseCompleted = true
      }
      break
    case 5: // Invade
      if (action.type === 'attack_territory' || action.type === 'advance_player_phase') {
        phaseCompleted = true
      }
      break
    case 6: // Fortify
      if (action.type === 'fortify_territory' || action.type === 'advance_player_phase') {
        phaseCompleted = true
      }
      break
  }
  
  if (!phaseCompleted) {
    return { stateChanged: false, newState: gameState, shouldScheduleAI: false }
  }
  
  let newState = { ...gameState }
  
  console.log(`✅ ${currentPlayer.name} completed Phase ${newState.currentPhase}`)
  
  if (newState.currentPhase === 6) {
    console.log(`🎯 ${currentPlayer.name} completed all phases - advancing to next player`)
    newState = advanceToNextMainGamePlayer(newState, calculateTurnIncomeFn)
    shouldAdvanceTurn = true
  } else {
    newState.currentPhase = (newState.currentPhase + 1) as any
    const phaseInfo = GAME_CONFIG.PLAYER_PHASES[newState.currentPhase]
    console.log(`📋 ${currentPlayer.name} advanced to Phase ${newState.currentPhase}: ${phaseInfo.name}`)
    shouldAdvancePhase = true
  }

  return { 
    stateChanged: shouldAdvancePhase || shouldAdvanceTurn, 
    newState, 
    shouldScheduleAI: shouldAdvancePhase || shouldAdvanceTurn 
  }
}

function advanceToNextMainGamePlayer(gameState: GameState, calculateTurnIncomeFn: (player: Player, gameState: GameState) => number): GameState {
  const newState = { ...gameState }
  
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  const currentTurnIndex = newState.activeTurnOrder.indexOf(currentPlayer.id)
  
  const nextTurnIndex = (currentTurnIndex + 1) % newState.activeTurnOrder.length
  
  if (nextTurnIndex === 0) {
    console.log(`🔄 All players completed Turn ${newState.currentYear} - advancing to next turn`)
    return advanceMainGameTurn(newState, calculateTurnIncomeFn)
  } else {
    const nextPlayerId = newState.activeTurnOrder[nextTurnIndex]
    const nextPlayerIndex = newState.players.findIndex(p => p.id === nextPlayerId)
    
    newState.players[newState.currentPlayerIndex].isActive = false
    newState.currentPlayerIndex = nextPlayerIndex
    newState.players[nextPlayerIndex].isActive = true
    newState.currentPhase = 1
    
    const nextPlayer = newState.players[nextPlayerIndex]
    console.log(`🔄 Turn advanced to: ${nextPlayer.name} - Phase 1`)
    
    return newState
  }
}

function advanceMainGameTurn(gameState: GameState, calculateTurnIncomeFn: (player: Player, gameState: GameState) => number): GameState {
  const newState = { ...gameState }
  
  if (newState.currentYear >= 5) {
    newState.status = 'finished'
    console.log('🏁 Game finished after 5 turns!')
    return newState
  }
  
  newState.currentYear = (newState.currentYear + 1) as any
  newState.currentPhase = 1
  
  const firstPlayerId = newState.activeTurnOrder[0]
  const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
  
  newState.players.forEach(p => p.isActive = false)
  newState.currentPlayerIndex = firstPlayerIndex
  newState.players[firstPlayerIndex].isActive = true
  
  newState.activeTurnOrder.forEach(playerId => {
    const player = newState.players.find(p => p.id === playerId)
    if (player) {
      const income = calculateTurnIncomeFn(player, newState)
      player.energy += income
      console.log(`💰 ${player.name} received ${income} energy (total: ${player.energy})`)
    }
  })
  
  const firstPlayer = newState.players[firstPlayerIndex]
  console.log(`🎯 Turn ${newState.currentYear} begins! ${firstPlayer.name} starts Phase 1`)
  
  return newState
}
