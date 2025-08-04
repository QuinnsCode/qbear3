// ===== /app/services/game/aiService.ts =====
import type { GameState, Player } from '@/app/lib/GameState'
import { globalAIController } from '@/app/services/game/ADai'
import { orchestrateAISetupAction } from '@/app/services/game/setupFunctions'

export function isAIPlayer(playerId: string): boolean {
  return globalAIController.isAIPlayer(playerId)
}

export function addAIPlayer(playerId: string, difficulty: string): void {
  globalAIController.addAIPlayer(playerId, difficulty)
}

export function doAISetupAction(
  gameState: GameState,
  onStateUpdate: (state: GameState) => void,
  onProgressionNeeded: (actionData: any) => void
): void {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  if (!currentPlayer || !isAIPlayer(currentPlayer.id)) return
  
  console.log(`🤖 AI Setup Action - Status: ${gameState.status}, Phase: ${gameState.setupPhase}, Player: ${currentPlayer.name}`)
  
  orchestrateAISetupAction(gameState, onStateUpdate, onProgressionNeeded)
}

export function doAIBiddingAction(
  gameState: GameState,
  playerId: string,
  isAIPlayerFn: (id: string) => boolean,
  placeBidFn: (bidAmount: number) => Promise<void>,
  aiTurnSpeedMs: number
): void {
  console.log(`🤖 doAIBiddingAction called for player: ${playerId}`)
  
  if (gameState.status !== 'bidding') {
    console.log(`🤖 SAFEGUARD: Attempted to run bidding AI but game status is '${gameState.status}' - ABORTING`)
    return
  }
  
  const player = gameState.players.find(p => p.id === playerId)
  if (!player) {
    console.log(`🤖 SAFEGUARD: Player ${playerId} not found - ABORTING`)
    return
  }
  
  if (!isAIPlayerFn(player.id)) {
    console.log(`🤖 SAFEGUARD: Player ${playerId} is not an AI player - ABORTING`)
    return
  }

  if (gameState.bidding?.bidsSubmitted[playerId] !== undefined) {
    console.log(`🤖 SAFEGUARD: Player ${player.name} has already bid - ABORTING`)
    return
  }

  if (!gameState.bidding?.playersWaitingToBid?.includes(playerId)) {
    console.log(`🤖 SAFEGUARD: Player ${player.name} is not in waiting list - ABORTING`)
    return
  }
  
  console.log(`🤖 AI Bidding Action - Status: ${gameState.status}, Year: ${gameState.bidding?.year}, Player: ${player.name}`)
  
  const minBidPercent = 0.20
  const maxBidPercent = 0.40
  const randomPercent = minBidPercent + (Math.random() * (maxBidPercent - minBidPercent))
  const bidAmount = Math.floor(player.energy * randomPercent)
  
  console.log(`🤖 AI ${player.name} calculating bid: ${bidAmount} energy (${Math.round(randomPercent * 100)}% of ${player.energy})`)
  
  if (bidAmount > player.energy) {
    console.log(`🤖 ERROR: Bid amount ${bidAmount} exceeds player energy ${player.energy}`)
    return
  }
  
  setTimeout(async () => {
    console.log(`🤖 AI ${player.name} attempting to place bid...`)
    
    if (gameState.status !== 'bidding') {
      console.log(`🤖 TIMEOUT ABORT: Game state changed`)
      return
    }

    if (gameState.bidding?.bidsSubmitted[playerId] !== undefined) {
      console.log(`🤖 TIMEOUT ABORT: Player already bid`)
      return
    }
    
    try {
      await placeBidFn(bidAmount)
      console.log(`✅ AI ${player.name} successfully placed bid: ${bidAmount}`)
    } catch (error) {
      console.error(`❌ AI bidding error for ${player.name}:`, error)
    }
    
  }, aiTurnSpeedMs)
}

export function doAIMainGameAction(
  gameState: GameState,
  currentPlayer: Player,
  applyActionFn: (actionData: any) => Promise<void>,
  aiTurnSpeedMs: number
): void {
  if (!isAIPlayer(currentPlayer.id)) return
  
  console.log(`🤖 AI ${currentPlayer.name} doing Phase ${gameState.currentPhase} action`)
  
  switch (gameState.currentPhase) {
    case 1: 
      doAICollectAndDeploy(gameState, currentPlayer, applyActionFn, aiTurnSpeedMs)
      break
    case 2: 
    case 3: 
    case 4: 
    case 5: 
    case 6: 
      // For now, just advance phase for other phases
      setTimeout(async () => {
        if (gameState.status === 'playing') {
          await applyActionFn({
            type: 'advance_player_phase',
            playerId: currentPlayer.id,
            data: {}
          })
        }
      }, aiTurnSpeedMs)
      break
  }
}

function doAICollectAndDeploy(
  gameState: GameState,
  currentPlayer: Player,
  applyActionFn: (actionData: any) => Promise<void>,
  aiTurnSpeedMs: number
): void {
  console.log(`🤖 AI ${currentPlayer.name} doing Collect & Deploy phase`)
  
  // Calculate energy income
  const territoryCount = currentPlayer.territories.length
  const energyIncome = Math.max(3, Math.floor(territoryCount / 3))
  
  setTimeout(async () => {
    if (gameState.status !== 'playing') return
    
    console.log(`🤖 AI collecting ${energyIncome} energy`)
    await applyActionFn({
      type: 'collect_energy',
      playerId: currentPlayer.id,
      data: { amount: energyIncome }
    })
    
    // Place units
    const unitsToPlace = energyIncome
    const playerTerritories = currentPlayer.territories.filter(tId => 
      gameState.territories[tId]?.ownerId === currentPlayer.id
    )
    
    let unitsPlaced = 0
    const placeNextUnit = async () => {
      if (unitsPlaced >= unitsToPlace || gameState.status !== 'playing') {
        console.log(`🤖 AI completed Collect & Deploy, advancing phase`)
        setTimeout(async () => {
          if (gameState.status === 'playing') {
            await applyActionFn({
              type: 'advance_player_phase',
              playerId: currentPlayer.id,
              data: {}
            })
          }
        }, aiTurnSpeedMs)
        return
      }
      
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)]
      
      console.log(`🤖 AI placing unit ${unitsPlaced + 1}/${unitsToPlace} on territory ${randomTerritory}`)
      
      await applyActionFn({
        type: 'place_unit',
        playerId: currentPlayer.id,
        data: { territoryId: randomTerritory, count: 1 }
      })
      
      unitsPlaced++
      setTimeout(placeNextUnit, aiTurnSpeedMs)
    }
    
    setTimeout(placeNextUnit, aiTurnSpeedMs)
    
  }, aiTurnSpeedMs)
}