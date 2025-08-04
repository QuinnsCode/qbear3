
// ===== /app/services/game/biddingService.ts =====
import type { GameState, GameAction, Player } from '@/app/lib/GameState'

export function placeBid(gameState: GameState, action: GameAction): GameState {
  const { bidAmount } = action.data
  const newState = { ...gameState }
  
  if (newState.status !== 'bidding' || !newState.bidding) {
    console.log(`❌ Cannot place bid - game not in bidding state`)
    return newState
  }
  
  const player = newState.players.find(p => p.id === action.playerId)
  if (!player) {
    console.log(`❌ Player not found: ${action.playerId}`)
    return newState
  }
  
  if (newState.bidding.bidsSubmitted[action.playerId] !== undefined) {
    console.log(`❌ Player ${player.name} has already bid`)
    return newState
  }
  
  if (bidAmount > player.energy) {
    console.log(`❌ Bid amount ${bidAmount} exceeds player energy ${player.energy}`)
    return newState
  }
  
  if (bidAmount < 0) {
    console.log(`❌ Invalid bid amount: ${bidAmount}`)
    return newState
  }
  
  newState.bidding.bidsSubmitted[action.playerId] = bidAmount
  player.currentBid = bidAmount
  
  newState.bidding.playersWaitingToBid = 
    (newState.bidding.playersWaitingToBid || []).filter(id => id !== action.playerId)
  
  console.log(`💰 ${player.name} placed bid: ${bidAmount} energy`)
  console.log(`📊 Updated waiting list:`, newState.bidding.playersWaitingToBid)
  console.log(`📊 Total bids: ${Object.keys(newState.bidding.bidsSubmitted).length}`)
  
  return newState
}

export function revealBids(gameState: GameState, action: GameAction, getBiddingPlayersFn: (gameState: GameState) => Player[]): GameState {
  const newState = { ...gameState }
  
  if (newState.status !== 'bidding' || !newState.bidding) {
    return newState
  }
  
  newState.bidding.bidsRevealed = true
  
  const bids = newState.bidding.bidsSubmitted
  const biddingPlayers = getBiddingPlayersFn(newState)
  const playerIds = biddingPlayers.map(p => p.id).filter(id => id in bids)
  
  if (playerIds.length === 0) {
    console.log('❌ No valid bids found!')
    return newState
  }
  
  const bidAmounts = playerIds.map(id => bids[id])
  const maxBid = Math.max(...bidAmounts)
  
  const winners = playerIds.filter(playerId => bids[playerId] === maxBid)
  
  if (winners.length === 1) {
    newState.bidding.highestBidder = winners[0]
    newState.bidding.finalTurnOrder = [
      winners[0],
      ...playerIds.filter(id => id !== winners[0])
    ]
    console.log(`🏆 Bidding winner: ${newState.players.find(p => p.id === winners[0])?.name} with ${maxBid} energy`)
  } else {
    console.log(`🎲 Tie between ${winners.length} players - rolling dice...`)
    const tiebreakRolls: Record<string, number> = {}
    let highestRoll = 0
    let rollWinner = winners[0]
    
    winners.forEach(playerId => {
      const roll = Math.floor(Math.random() * 20) + 1
      tiebreakRolls[playerId] = roll
      if (roll > highestRoll) {
        highestRoll = roll
        rollWinner = playerId
      }
    })
    
    newState.bidding.tiebreakRoll = tiebreakRolls
    newState.bidding.highestBidder = rollWinner
    newState.bidding.finalTurnOrder = [
      rollWinner,
      ...playerIds.filter(id => id !== rollWinner)
    ]
    
    console.log(`🎲 Tiebreak results:`, tiebreakRolls)
    console.log(`🏆 Winner: ${newState.players.find(p => p.id === rollWinner)?.name}`)
  }
  
  playerIds.forEach(playerId => {
    const player = newState.players.find(p => p.id === playerId)
    if (player) {
      const bidAmount = bids[playerId]
      player.energy -= bidAmount
      player.totalEnergySpentOnBids = (player.totalEnergySpentOnBids || 0) + bidAmount
      console.log(`💸 ${player.name} spent ${bidAmount} energy (${player.energy} remaining)`)
    }
  })
  
  if (!newState.yearlyTurnOrders) {
    newState.yearlyTurnOrders = {}
  }
  newState.yearlyTurnOrders[newState.bidding.year] = newState.bidding.finalTurnOrder
  newState.activeTurnOrder = newState.bidding.finalTurnOrder
  
  return newState
}

export function startYearTurns(gameState: GameState, action: GameAction): GameState {
  const newState = { ...gameState }
  
  if (newState.status !== 'bidding' || !newState.bidding) {
    return newState
  }
  
  const year = newState.bidding.year
  const winnerOrder = newState.bidding.finalTurnOrder || []
  
  console.log(`🎮 Starting main game for Year ${year}`)
  
  newState.status = 'playing'
  newState.currentYear = year as any
  newState.currentPhase = 1
  
  if (winnerOrder.length > 0) {
    const firstPlayerId = winnerOrder[0]
    const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId)
    newState.currentPlayerIndex = firstPlayerIndex
    newState.players.forEach(p => p.isActive = false)
    newState.players[firstPlayerIndex].isActive = true
  }
  
  newState.bidding = undefined
  
  console.log(`🎯 Year ${year} begins! ${newState.players[newState.currentPlayerIndex].name} starts Phase 1`)
  
  return newState
}

export function getBiddingPlayers(gameState: GameState): Player[] {
  return gameState.players.filter(player => 
    !player.name.includes('NPC') && player.name !== 'NPC'
  )
}

export function handleBiddingProgression(
  gameState: GameState, 
  action: any, 
  getBiddingPlayersFn: (gameState: GameState) => Player[]
): { shouldAutoReveal: boolean } {
  if (gameState.status !== 'bidding' || action.type !== 'place_bid') {
    return { shouldAutoReveal: false }
  }

  const biddingPlayers = getBiddingPlayersFn(gameState)
  const totalBiddingPlayers = biddingPlayers.length
  const totalBids = Object.keys(gameState.bidding?.bidsSubmitted || {}).length
  const waitingCount = gameState.bidding?.playersWaitingToBid?.length || 0
  
  console.log(`📊 Bid count check: ${totalBids}/${totalBiddingPlayers} bids from real players, ${waitingCount} waiting`)
  
  return { shouldAutoReveal: totalBids >= totalBiddingPlayers || waitingCount === 0 }
}

export function checkAndTriggerAIBidding(
  gameState: GameState,
  isAIPlayerFn: (playerId: string) => boolean,
  scheduleAIAction: (playerId: string, delay: number) => void
): void {
  if (gameState.status !== 'bidding' || !gameState.bidding || gameState.bidding.bidsRevealed) {
    return
  }

  const waitingToBid = gameState.bidding.playersWaitingToBid || []
  const aiPlayersNeedingToBid = waitingToBid.filter(playerId => 
    isAIPlayerFn(playerId)
  )

  console.log(`🤖 AI players needing to bid:`, aiPlayersNeedingToBid.map(id => 
    gameState?.players.find(p => p.id === id)?.name
  ))

  if (aiPlayersNeedingToBid.length === 0) {
    return
  }

  aiPlayersNeedingToBid.forEach((playerId, index) => {
    const player = gameState?.players.find(p => p.id === playerId)
    if (player) {
      console.log(`🤖 Scheduling AI bid for ${player.name} (delay: ${200 + index * 100}ms)`)
      scheduleAIAction(playerId, 200 + (index * 100))
    }
  })
}
