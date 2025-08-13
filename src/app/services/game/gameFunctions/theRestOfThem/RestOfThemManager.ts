// src/app/services/game/gameFunctions/theRestOfThem/RestOfThemManager.ts

import type { GameState, GameAction, Player, Territory } from '@/app/lib/GameState';
import { GameUtils } from '@/app/services/game/gameFunctions/utils/GameUtils';
import { GAME_CONFIG } from '@/app/services/game/gameSetup';
import { globalAIController } from '@/app/services/game/ADai';

export class RestOfThemManager {
  
  // ================================
  // MAIN GAME TURN PROGRESSION
  // ================================
  
  static advanceToNextMainGamePlayer(gameState: GameState): GameState {
    console.log(`🔄 ADVANCING TO NEXT PLAYER from index ${gameState.currentPlayerIndex}`);
    
    let newState = { ...gameState };
    newState.currentPhase = 1; // Reset to Phase 1 for next player
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    
    // Check if we completed a full round (back to player 0)
    if (newState.currentPlayerIndex === 0) {
      console.log(`🎯 FULL ROUND COMPLETED - advancing year from ${newState.currentYear}`);
      if (newState.currentYear < 5) {
        newState.currentYear = (newState.currentYear + 1) as any;
        newState.status = 'bidding'; // Start bidding for next year
      } else {
        newState.status = 'finished'; // Game over
      }
    }
    
    console.log(`🔄 Next player result:`, {
      newPlayerIndex: newState.currentPlayerIndex,
      newPlayer: newState.players[newState.currentPlayerIndex]?.name,
      newPhase: newState.currentPhase,
      newYear: newState.currentYear,
      newStatus: newState.status
    });
    
    return newState;
  }

  static advanceMainGameTurn(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    if (!newState) return newState;
    
    if (newState.currentYear >= 5) {
      newState.status = 'finished';
      console.log('🏁 Game finished after 5 turns!');
      return newState;
    }
    
    newState.currentYear = (newState.currentYear + 1) as any;
    newState.currentPhase = 1;
    
    const firstPlayerId = newState.activeTurnOrder[0];
    const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId);
    
    newState.players.forEach(p => p.isActive = false);
    newState.currentPlayerIndex = firstPlayerIndex;
    newState.players[firstPlayerIndex].isActive = true;
    
    // ✅ Auto-collect energy for AI players, reset counters for humans
    newState.activeTurnOrder.forEach(playerId => {
      const player = newState.players.find(p => p.id === playerId);
      if (player && globalAIController.isAIPlayer(player.id)) {
        const income = GameUtils.calculateTurnIncome(player, newState);
        player.energy += income;
        console.log(`💰 ${player.name} auto-collected ${income} energy (AI)`);
      } else if (player) {
        console.log(`⏳ ${player.name} will manually collect energy in Phase 1 (Human)`);
        player.unitsToPlaceThisTurn = 0;
        player.unitsPlacedThisTurn = 0;
      }
    });
    
    const firstPlayer = newState.players[firstPlayerIndex];
    console.log(`🎯 Turn ${newState.currentYear} begins! ${firstPlayer.name} starts Phase 1`);
    
    if (globalAIController.isAIPlayer(firstPlayer.id)) {
      console.log(`🤖 ${firstPlayer.name} is AI - will auto-collect and deploy`);
    } else {
      console.log(`👤 ${firstPlayer.name} is human - CollectDeployOverlay should appear`);
    }
    
    return newState;
  }

  // ================================
  // UTILITY METHODS
  // ================================
  
  static getBiddingPlayers(gameState: GameState): Player[] {
    if (!gameState) return [];
    
    return gameState.players.filter(player => 
      !player.name.includes('NPC') && player.name !== 'NPC'
    );
  }

  // ================================
  // PHASE PROGRESSION
  // ================================
  
  static advancePhase(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    if (newState.currentPhase === 6) {
      // Phase 6 is the last phase, advance to next turn/player
      return RestOfThemManager.advanceTurn(newState);
    } else {
      newState.currentPhase = (newState.currentPhase + 1) as any;
      newState.players = newState.players.map(p => ({
        ...p,
        pendingDecision: undefined
      }));

      if (newState.currentPhase === 2) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        newState.players[newState.currentPlayerIndex].isActive = true;
      }
    }
    
    return newState;
  }

  static advanceTurn(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    
    if (newState.currentPlayerIndex === 0) {
      newState.currentYear += 1;
      
      if (newState.currentYear > GAME_CONFIG.SETUP_MAX_GAME_YEARS) {
        newState.status = 'finished';
        return newState;
      }
    }
    
    newState.currentPhase = 1;
    
    newState.players = newState.players.map(p => ({
      ...p,
      pendingDecision: undefined,
      isActive: false
    }));
    
    newState.players[newState.currentPlayerIndex].isActive = true;
    
    return newState;
  }

  static advancePlayerPhase(gameState: GameState, action: GameAction): GameState {
    console.log(`📋 ADVANCE_PLAYER_PHASE called:`, {
      currentPhase: gameState.currentPhase,
      playerId: action.playerId,
      data: action.data
    });
    
    const { playerId, data } = action;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.warn(`📋 ❌ Invalid player for phase advance:`, {
        expectedPlayerId: currentPlayer?.id,
        receivedPlayerId: playerId
      });
      return gameState;
    }
    
    let newState = { ...gameState };
    
    switch (gameState.currentPhase) {
      case 1: // Collect & Deploy
        if (data?.deploymentComplete) {
          console.log(`📋 ✅ Phase 1 completed - advancing to Phase 2`);
          newState.currentPhase = 2;
        } else {
          console.log(`📋 ❌ Phase 1 not completed - missing deploymentComplete flag`);
        }
        break;
        
      case 2: // Build & Hire
        if (data?.phaseComplete) {
          console.log(`📋 ✅ Phase 2 completed - advancing to Phase 3`);
          newState.currentPhase = 3;
        } else {
          console.log(`📋 ❌ Phase 2 not completed - missing phaseComplete flag`);
        }
        break;
        
      case 3: // Buy Cards
        if (data?.phaseComplete) {
          console.log(`📋 ✅ Phase 3 completed - advancing to Phase 4`);
          newState.currentPhase = 4;
        } else {
          console.log(`📋 ❌ Phase 3 not completed - missing phaseComplete flag`);
        }
        break;
        
      case 4: // Play Cards
        if (data?.phaseComplete) {
          console.log(`📋 ✅ Phase 4 completed - advancing to Phase 5`);
          newState.currentPhase = 5;
        } else {
          console.log(`📋 ❌ Phase 4 not completed - missing phaseComplete flag`);
        }
        break;
        
      case 5: // Invade 
        if (data?.phaseComplete) {
          console.log(`📋 ✅ Phase 5 completed - advancing to Phase 6`);
          newState.currentPhase = 6;
        } else {
          console.log(`📋 ❌ Phase 5 not completed - missing phaseComplete flag`);
        }
        break;
      
      case 6: // Fortify (last phase)
        console.log(`📋 ✅ Phase 6 completed - advancing to next player`);
        newState = this.advanceToNextMainGamePlayer(newState);
        break;
    }
    
    console.log(`📋 📤 Phase advance result:`, {
      oldPhase: gameState.currentPhase,
      newPhase: newState.currentPhase,
      oldPlayerIndex: gameState.currentPlayerIndex,
      newPlayerIndex: newState.currentPlayerIndex
    });
    
    return newState;
  }

  static advanceToNextPlayer(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    const currentTurnIndex = newState.activeTurnOrder.indexOf(currentPlayer.id);
    
    const nextTurnIndex = (currentTurnIndex + 1) % newState.activeTurnOrder.length;
    
    if (nextTurnIndex === 0) {
      return RestOfThemManager.advanceGameTurn(newState);
    }
    
    const nextPlayerId = newState.activeTurnOrder[nextTurnIndex];
    const nextPlayerIndex = newState.players.findIndex(p => p.id === nextPlayerId);
    
    newState.players[newState.currentPlayerIndex].isActive = false;
    newState.currentPlayerIndex = nextPlayerIndex;
    newState.players[nextPlayerIndex].isActive = true;
    newState.currentPhase = 1;
    
    const nextPlayer = newState.players[nextPlayerIndex];
    console.log(`🔄 ${nextPlayer.name}'s turn → Phase 1: ${GAME_CONFIG.PLAYER_PHASES[1]?.name || 'Collect & Deploy'}`);
    
    return newState;
  }

  static advanceGameTurn(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    if (newState.currentYear >= 5) {
      newState.status = 'finished';
      console.log('🏁 Game finished after 5 turns!');
      return newState;
    }
    
    newState.currentYear = (newState.currentYear + 1) as any;
    newState.currentPhase = 1;
    
    const firstPlayerId = newState.activeTurnOrder[0];
    const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId);
    
    newState.players.forEach(p => p.isActive = false);
    newState.currentPlayerIndex = firstPlayerIndex;
    newState.players[firstPlayerIndex].isActive = true;
    
    const firstPlayer = newState.players[firstPlayerIndex];
    console.log(`🎯 Turn ${newState.currentYear} begins! ${firstPlayer.name} starts Phase 1`);
    
    return newState;
  }

  static startMainGame(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    console.log(`🎮 Starting main game with turn cycle!`);
    
    newState.status = 'playing';
    newState.currentYear = 1;
    newState.currentPhase = 1;
    
    const firstPlayerId = newState.activeTurnOrder[0];
    const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId);
    
    newState.currentPlayerIndex = firstPlayerIndex;
    newState.players.forEach(p => p.isActive = false);
    newState.players[firstPlayerIndex].isActive = true;
    
    console.log(`🎯 Turn 1, Phase 1: ${newState.players[firstPlayerIndex].name} starts`);
    
    return newState;
  }

  // ================================
  // PLAYER DECISIONS
  // ================================
  
  static handlePlayerDecision(gameState: GameState, action: GameAction): GameState {
    const newState = { ...gameState };
    const player = newState.players.find(p => p.id === action.playerId);
    
    if (!player?.pendingDecision) {
      return newState;
    }
    
    switch (player.pendingDecision.type) {
      case 'select_territory':
        const { territoryId } = action.data.decision;
        if (territoryId && newState.territories[territoryId]) {
          if (!player.territories.includes(territoryId)) {
            player.territories.push(territoryId);
            newState.territories[territoryId].ownerId = player.id;
          }
        }
        break;
      case 'play_card':
        break;
    }
    
    player.pendingDecision = undefined;
    
    return newState;
  }

  // ================================
  // COMBAT SYSTEM
  // ================================
  
  static attackTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, attackingUnits } = action.data;
    const newState = { ...gameState };
    
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    
    if (!fromTerritory || !toTerritory) {
      console.warn('Invalid territories for attack');
      return newState;
    }
    
    if (fromTerritory.ownerId !== action.playerId) {
      console.warn(`Player ${action.playerId} does not own attacking territory`);
      return newState;
    }
    
    if (toTerritory.ownerId === action.playerId) {
      console.warn('Cannot attack your own territory');
      return newState;
    }
    
    if (fromTerritory.machineCount <= attackingUnits) {
      console.warn('Not enough units to attack (must leave 1 behind)');
      return newState;
    }
    
    // ✅ Use GameUtils for combat resolution
    const combatResult = GameUtils.resolveCombat(
      attackingUnits,
      toTerritory.machineCount,
      action.playerId,
      toTerritory.ownerId || 'neutral'
    );
    
    fromTerritory.machineCount -= combatResult.attackerLosses;
    toTerritory.machineCount -= combatResult.defenderLosses;
    
    if (toTerritory.machineCount <= 0) {
      const oldOwnerId = toTerritory.ownerId;
      toTerritory.ownerId = action.playerId;
      toTerritory.machineCount = combatResult.attackerUnitsRemaining;
      
      const attacker = newState.players.find(p => p.id === action.playerId);
      const defender = newState.players.find(p => p.id === oldOwnerId);
      
      if (attacker && !attacker.territories.includes(toTerritoryId)) {
        attacker.territories.push(toTerritoryId);
      }
      
      if (defender) {
        defender.territories = defender.territories.filter(id => id !== toTerritoryId);
      }
      
      console.log(`🎯 ${fromTerritory.name} conquered ${toTerritory.name}!`);
    } else {
      console.log(`⚔️ Attack from ${fromTerritory.name} to ${toTerritory.name} repelled`);
    }
    
    return newState;
  }

  static fortifyTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, unitCount } = action.data;
    const newState = { ...gameState };
    
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    
    if (!fromTerritory || !toTerritory) {
      console.warn('Invalid territories for fortify');
      return newState;
    }
    
    if (fromTerritory.ownerId !== action.playerId || toTerritory.ownerId !== action.playerId) {
      console.warn('Player must own both territories to fortify');
      return newState;
    }
    
    if (fromTerritory.machineCount <= unitCount) {
      console.warn('Not enough units to fortify (must leave 1 behind)');
      return newState;
    }
    
    fromTerritory.machineCount -= unitCount;
    toTerritory.machineCount += unitCount;
    
    console.log(`🛡️ Fortified ${toTerritory.name} with ${unitCount} units from ${fromTerritory.name}`);
    return newState;
  }

  // ================================
  // COMBINED PURCHASE+PLACE SYSTEM
  // ================================
  // ✅ Handler for purchasing and placing commander in one action
  static purchaseAndPlaceCommander(gameState: GameState, action: GameAction): GameState {
    const { playerId, data } = action;
    const { territoryId, commanderType, cost } = data;
    
    const player = gameState.players.find(p => p.id === playerId);
    const territory = gameState.territories[territoryId];
    
    if (!player || !territory) {
      console.warn('Invalid player or territory for commander purchase');
      return gameState;
    }
    
    // Validate energy
    if (player.energy < cost) {
      console.warn(`Player ${player.name} doesn't have enough energy (${player.energy} < ${cost})`);
      return gameState;
    }
    
    // Validate territory ownership
    if (territory.ownerId !== playerId) {
      console.warn(`Player ${player.name} doesn't control territory ${territoryId}`);
      return gameState;
    }
    
    // Validate commander placement
    const commanderField = `${commanderType}Commander` as keyof Territory;
    if (territory[commanderField]) {
      console.warn(`Territory ${territoryId} already has a ${commanderType} commander`);
      return gameState;
    }
    
    // Check if player already owns this commander type
    const alreadyOwnsCommander = player.territories.some(tId => {
      const t = gameState.territories[tId];
      return t && t[commanderField] === playerId;
    });
    
    if (alreadyOwnsCommander) {
      console.warn(`Player ${player.name} already owns a ${commanderType} commander`);
      return gameState;
    }
    
    // ✅ All validations passed - execute purchase and placement
    const newState = { ...gameState };
    newState.players = gameState.players.map(p => 
      p.id === playerId 
        ? { ...p, energy: p.energy - cost }
        : p
    );
    
    newState.territories = {
      ...gameState.territories,
      [territoryId]: {
        ...territory,
        [commanderField]: playerId
      }
    };
    
    console.log(`✅ Player ${player.name} purchased and placed ${commanderType} commander on ${territory.name} for ${cost} energy`);
    
    return newState;
  }

  // ✅ Handler for purchasing and placing space base in one action
  static purchaseAndPlaceSpaceBase(gameState: GameState, action: GameAction): GameState {
    const { playerId, data } = action;
    const { territoryId, cost } = data;
    
    const player = gameState.players.find(p => p.id === playerId);
    const territory = gameState.territories[territoryId];
    
    if (!player || !territory) {
      console.warn('Invalid player or territory for space base purchase');
      return gameState;
    }
    
    // Validate energy
    if (player.energy < cost) {
      console.warn(`Player ${player.name} doesn't have enough energy (${player.energy} < ${cost})`);
      return gameState;
    }
    
    // Validate territory ownership
    if (territory.ownerId !== playerId) {
      console.warn(`Player ${player.name} doesn't control territory ${territoryId}`);
      return gameState;
    }
    
    // Validate space base placement
    if (territory.spaceBase) {
      console.warn(`Territory ${territoryId} already has a space base`);
      return gameState;
    }
    
    // ✅ All validations passed - execute purchase and placement
    const newState = { ...gameState };
    newState.players = gameState.players.map(p => 
      p.id === playerId 
        ? { ...p, energy: p.energy - cost }
        : p
    );
    
    newState.territories = {
      ...gameState.territories,
      [territoryId]: {
        ...territory,
        spaceBase: playerId
      }
    };
    
    console.log(`✅ Player ${player.name} purchased and placed space base on ${territory.name} for ${cost} energy`);
    
    return newState;
  }
  // ================================
  // BIDDING SYSTEM
  // ================================
  
  static placeBid(gameState: GameState, action: GameAction): GameState {
    const { bidAmount } = action.data;
    const newState = { ...gameState };
    
    if (newState.status !== 'bidding' || !newState.bidding) {
      console.log(`❌ Cannot place bid - game not in bidding state`);
      return newState;
    }
    
    const player = newState.players.find(p => p.id === action.playerId);
    if (!player) {
      console.log(`❌ Player not found: ${action.playerId}`);
      return newState;
    }
    
    // ✅ CHECK: Don't allow duplicate bids
    if (newState.bidding.bidsSubmitted[action.playerId] !== undefined) {
      console.log(`❌ Player ${player.name} has already bid`);
      return newState;
    }
    
    if (bidAmount > player.energy) {
      console.log(`❌ Bid amount ${bidAmount} exceeds player energy ${player.energy}`);
      return newState;
    }
    
    if (bidAmount < 0) {
      console.log(`❌ Invalid bid amount: ${bidAmount}`);
      return newState;
    }
    
    // Record the bid
    newState.bidding.bidsSubmitted[action.playerId] = bidAmount;
    player.currentBid = bidAmount;
    
    // ✅ FIX: Ensure player is removed from waiting list
    newState.bidding.playersWaitingToBid = 
      (newState.bidding.playersWaitingToBid || []).filter(id => id !== action.playerId);
    
    console.log(`💰 ${player.name} placed bid: ${bidAmount} energy`);
    console.log(`📊 Updated waiting list:`, newState.bidding.playersWaitingToBid);
    console.log(`📊 Total bids: ${Object.keys(newState.bidding.bidsSubmitted).length}`);
    
    return newState;
  }

  static revealBids(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    if (newState.status !== 'bidding' || !newState.bidding) {
      return newState;
    }
    
    newState.bidding.bidsRevealed = true;
    
    const bids = newState.bidding.bidsSubmitted;
    
    // ✅ FIX: Only consider bidding players for turn order
    const biddingPlayers = newState.players.filter(player => 
      !player.name.includes('NPC') && player.name !== 'NPC'
    );
    const playerIds = biddingPlayers.map(p => p.id).filter(id => id in bids);
    
    if (playerIds.length === 0) {
      console.log('❌ No valid bids found!');
      return newState;
    }
    
    const bidAmounts = playerIds.map(id => bids[id]);
    const maxBid = Math.max(...bidAmounts);
    
    // Find all players with the highest bid
    const winners = playerIds.filter(playerId => bids[playerId] === maxBid);
    
    if (winners.length === 1) {
      // Single winner
      newState.bidding.highestBidder = winners[0];
      newState.bidding.finalTurnOrder = [
        winners[0],
        ...playerIds.filter(id => id !== winners[0])
      ];
      console.log(`🏆 Bidding winner: ${newState.players.find(p => p.id === winners[0])?.name} with ${maxBid} energy`);
    } else {
      // Tie - need dice roll
      console.log(`🎲 Tie between ${winners.length} players - rolling dice...`);
      const tiebreakRolls: Record<string, number> = {};
      let highestRoll = 0;
      let rollWinner = winners[0];
      
      winners.forEach(playerId => {
        const roll = Math.floor(Math.random() * 20) + 1;
        tiebreakRolls[playerId] = roll;
        if (roll > highestRoll) {
          highestRoll = roll;
          rollWinner = playerId;
        }
      });
      
      newState.bidding.tiebreakRoll = tiebreakRolls;
      newState.bidding.highestBidder = rollWinner;
      newState.bidding.finalTurnOrder = [
        rollWinner,
        ...playerIds.filter(id => id !== rollWinner)
      ];
      
      console.log(`🎲 Tiebreak results:`, tiebreakRolls);
      console.log(`🏆 Winner: ${newState.players.find(p => p.id === rollWinner)?.name}`);
    }
    
    // Deduct energy from all bidding players
    playerIds.forEach(playerId => {
      const player = newState.players.find(p => p.id === playerId);
      if (player) {
        const bidAmount = bids[playerId];
        player.energy -= bidAmount;
        player.totalEnergySpentOnBids = (player.totalEnergySpentOnBids || 0) + bidAmount;
        console.log(`💸 ${player.name} spent ${bidAmount} energy (${player.energy} remaining)`);
      }
    });
    
    // ✅ FIX: Set turn order to only include bidding players
    if (!newState.yearlyTurnOrders) {
      newState.yearlyTurnOrders = {};
    }
    newState.yearlyTurnOrders[newState.bidding.year] = newState.bidding.finalTurnOrder;
    newState.activeTurnOrder = newState.bidding.finalTurnOrder;
    
    return newState;
  }

  static startYearTurns(gameState: GameState): GameState {
    const newState = { ...gameState };
    
    if (newState.status !== 'bidding' || !newState.bidding) {
      return newState;
    }
    
    const year = newState.bidding.year;
    const winnerOrder = newState.bidding.finalTurnOrder || [];
    
    console.log(`🎮 Starting main game for Year ${year}`);
    
    // Transition to playing
    newState.status = 'playing';
    newState.currentYear = year as any;
    newState.currentPhase = 1;
    
    // Set first player (bidding winner) as active
    if (winnerOrder.length > 0) {
      const firstPlayerId = winnerOrder[0];
      const firstPlayerIndex = newState.players.findIndex(p => p.id === firstPlayerId);
      newState.currentPlayerIndex = firstPlayerIndex;
      newState.players.forEach(p => p.isActive = false);
      newState.players[firstPlayerIndex].isActive = true;
    }
    
    // Clear bidding state
    newState.bidding = undefined;
    
    console.log(`🎯 Year ${year} begins! ${newState.players[newState.currentPlayerIndex].name} starts Phase 1`);
    
    return newState;
  }

  // ================================
  // CARD SYSTEM
  // ================================
  
  static playCard(gameState: GameState, action: GameAction): GameState {
    const { cardId, targets } = action.data;
    const newState = { ...gameState };
    const player = newState.players.find(p => p.id === action.playerId);
    
    if (!player) return newState;
    
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return newState;
    
    const card = player.cards[cardIndex];
    player.cards.splice(cardIndex, 1);
    
    // TODO: Implement specific card effects based on card type
    console.log(`🃏 ${player.name} played card: ${card.type || 'Unknown'}`);
    
    return newState;
  }
}