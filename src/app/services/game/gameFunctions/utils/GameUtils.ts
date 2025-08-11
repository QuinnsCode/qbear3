// src/app/services/game/gameFunctions/utils/GameUtils.ts

// src/app/services/game/gameFunctions/utils/GameUtils.ts
import type { GameState, GameAction, Player, Territory, CommanderType } from '@/app/lib/GameState';
import { globalAIController } from '@/app/services/game/ADai';

export class GameUtils {
  
  // ================================
  // UNIT OPERATIONS
  // ================================
  
  static placeUnit(gameState: GameState, action: GameAction): GameState {
    const { territoryId, count } = action.data;
    let newState = { ...gameState };
    
    const territory = newState.territories[territoryId];
    const player = newState.players.find(p => p.id === action.playerId);
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    
    if (!territory || !player) {
      console.log(`❌ Invalid territory or player`);
      return newState;
    }
    
    if (territory.ownerId !== action.playerId) {
      console.log(`❌ Player doesn't own territory`);
      return newState;
    }
    
    if (count !== 1) {
      console.log(`❌ Can only place 1 unit at a time`);
      return newState;
    }
    
    // ✅ ENHANCED: Check both setup and playing mode placement limits
    if (newState.status === 'setup') {
      if ((player.remainingUnitsToPlace || 0) <= 0) {
        console.log(`❌ Player has no units left to place (setup)`);
        return newState;
      }
      
      if (currentPlayer.id !== action.playerId) {
        console.log(`❌ ${player.name} tried to place unit but it's ${currentPlayer.name}'s turn`);
        return newState;
      }
      
      const currentUnitsPlaced = player.unitsPlacedThisTurn || 0;
      if (newState.setupPhase === 'units' && currentUnitsPlaced >= 3) {
        console.log(`❌ ${player.name} has already placed 3 units this turn`);
        return newState;
      }
    } else if (newState.status === 'playing') {
      // ✅ PLAYING MODE: Check against unitsToPlaceThisTurn
      const unitsToPlace = player.unitsToPlaceThisTurn || 0;
      const unitsPlaced = player.unitsPlacedThisTurn || 0;
      
      if (unitsPlaced >= unitsToPlace) {
        console.log(`❌ ${player.name} has already placed all units this turn (${unitsPlaced}/${unitsToPlace})`);
        return newState;
      }
      
      if (currentPlayer.id !== action.playerId) {
        console.log(`❌ ${player.name} tried to place unit but it's ${currentPlayer.name}'s turn`);
        return newState;
      }
    }
    
    // ✅ Place the unit
    territory.machineCount += 1;
    
    // ✅ Update counters based on game mode
    if (newState.status === 'setup') {
      player.remainingUnitsToPlace = (player.remainingUnitsToPlace || 0) - 1;
      player.unitsPlacedThisTurn = (player.unitsPlacedThisTurn || 0) + 1;
      console.log(`✅ ${player.name} placed unit on ${territory.name} (${player.unitsPlacedThisTurn}/3 this turn, ${player.remainingUnitsToPlace} remaining)`);
    } else if (newState.status === 'playing') {
      player.unitsPlacedThisTurn = (player.unitsPlacedThisTurn || 0) + 1;
      const unitsToPlace = player.unitsToPlaceThisTurn || 0;
      console.log(`✅ ${player.name} placed unit on ${territory.name} (${player.unitsPlacedThisTurn}/${unitsToPlace} this turn)`);
    }
    
    return newState;
  }

  // ================================
  // COMMANDER OPERATIONS
  // ================================
  
  static placeCommander(gameState: GameState, action: GameAction): GameState {
    const { territoryId, commanderType } = action.data;
    const newState = { ...gameState };
    
    const territory = newState.territories[territoryId];
    const player = newState.players.find(p => p.id === action.playerId);
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    
    if (!territory || !player || territory.ownerId !== action.playerId) {
      return newState;
    }
    
    if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
      console.log(`❌ ${player.name} tried to place commander but it's ${currentPlayer.name}'s turn`);
      return newState;
    }
    
    if (commanderType === 'land') {
      territory.landCommander = action.playerId;
      console.log(`📍 ${player.name} placed Land Commander on ${territory.name}`);
    } else if (commanderType === 'diplomat') {
      territory.diplomatCommander = action.playerId;
      console.log(`📍 ${player.name} placed Diplomat Commander on ${territory.name}`);
    }
    
    return newState;
  }

  static getOwnedCommanders(player: Player, territories: Record<string, Territory>): CommanderType[] {
    const owned: CommanderType[] = [];
    
    player.territories.forEach(tId => {
      const territory = territories[tId];
      if (territory?.landCommander === player.id) owned.push('land');
      if (territory?.diplomatCommander === player.id) owned.push('diplomat');
      if (territory?.navalCommander === player.id) owned.push('naval');
      if (territory?.nuclearCommander === player.id) owned.push('nuclear');
    });
    
    return owned;
  }

  // ================================
  // SPACE BASE OPERATIONS
  // ================================
  
  static placeSpaceBase(gameState: GameState, action: GameAction): GameState {
    const { territoryId } = action.data;
    const newState = { ...gameState };
    
    const territory = newState.territories[territoryId];
    const player = newState.players.find(p => p.id === action.playerId);
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    
    if (!territory || !player || territory.ownerId !== action.playerId) {
      return newState;
    }
    
    if (newState.status === 'setup' && currentPlayer.id !== action.playerId) {
      console.log(`❌ ${player.name} tried to place space base but it's ${currentPlayer.name}'s turn`);
      return newState;
    }
    
    territory.spaceBase = action.playerId;
    console.log(`🚀 ${player.name} placed Space Base on ${territory.name}`);
    
    return newState;
  }

  static getSpaceBaseCount(player: Player, territories: Record<string, Territory>): number {
    return player.territories.filter(tId => 
      territories[tId]?.spaceBase === player.id
    ).length;
  }

  // ================================
  // ENERGY OPERATIONS
  // ================================
  
  static collectEnergy(gameState: GameState, action: GameAction): GameState {
    console.log('🎯 collectEnergy method called with:', {
      actionType: action.type,
      playerId: action.playerId,
      actionData: action.data,
      gameStatus: gameState.status,
      currentPhase: gameState.currentPhase
    });
    
    const { amount, unitsToPlace } = action.data;
    const newState = { ...gameState };
    const player = newState.players.find(p => p.id === action.playerId);
    
    if (!player) {
      console.log('❌ Player not found:', action.playerId);
      return newState;
    }
    
    // ✅ CRITICAL FIX: Calculate values fresh for playing mode
    let energyToAdd = amount;
    let unitsToPlaceThisTurn = unitsToPlace;
    
    if (newState.status === 'playing') {
      // For main game Phase 1, always calculate fresh values
      if (energyToAdd === undefined || energyToAdd === null) {
        energyToAdd = GameUtils.calculateTurnIncome(player, newState);
        console.log('🎯 Calculated fresh energy income:', energyToAdd);
      }
      
      if (unitsToPlaceThisTurn === undefined || unitsToPlaceThisTurn === null) {
        unitsToPlaceThisTurn = GameUtils.calculateUnitsToPlace(player, newState);
        console.log('🎯 Calculated fresh units to place:', unitsToPlaceThisTurn);
      }
    }
    
    // Add energy to player
    player.energy += energyToAdd;
    
    // ✅ CRITICAL: Set up unit placement counters for playing mode
    if (newState.status === 'playing' && newState.currentPhase === 1) {
      player.unitsToPlaceThisTurn = unitsToPlaceThisTurn || 0;
      player.unitsPlacedThisTurn = 0;
      
      console.log('🎯 Phase 1 unit placement setup:', {
        playerId: player.id,
        playerName: player.name,
        unitsToPlaceThisTurn: player.unitsToPlaceThisTurn,
        unitsPlacedThisTurn: player.unitsPlacedThisTurn,
        energyTotal: player.energy,
        isAI: globalAIController.isAIPlayer(player.id)
      });
    }
    
    console.log(`⚡ ${player.name} collected ${energyToAdd} energy (${player.energy} total)`);
    if (unitsToPlaceThisTurn && unitsToPlaceThisTurn > 0) {
      console.log(`📍 ${player.name} will place ${unitsToPlaceThisTurn} units this turn`);
    }
    
    return newState;
  }

  static spendEnergy(gameState: GameState, action: GameAction): GameState {
    const { amount } = action.data;
    const newState = { ...gameState };
    const player = newState.players.find(p => p.id === action.playerId);
    
    if (!player || player.energy < amount) {
      console.log(`❌ Player ${action.playerId} doesn't have enough energy`);
      return newState;
    }
    
    player.energy -= amount;
    console.log(`⚡ ${player.name} spent ${amount} energy (${player.energy} remaining)`);
    
    return newState;
  }

  // ================================
  // CALCULATION UTILITIES
  // ================================
  
  static calculateTurnIncome(player: Player, gameState: GameState): number {
    const baseIncome = 3; // Minimum
    const territoryIncome = Math.floor(player.territories.length / 3); // 1 per 3 territories
    
    // ✅ ADD: Continental bonuses (expand based on your continent logic)
    let continentalBonus = 0;
    // TODO: Add your continent control logic here
    
    return Math.max(baseIncome, territoryIncome + continentalBonus);
  }

  static calculateUnitsToPlace(player: Player, gameState: GameState): number {
    const baseUnits = GameUtils.calculateTurnIncome(player, gameState); // Same as energy income
    
    // ✅ Count space bases owned by this player
    const spaceBaseBonusUnits = player.territories.filter(tId => {
      const territory = gameState.territories[tId];
      return territory?.spaceBase === player.id;
    }).length;
    
    return baseUnits + spaceBaseBonusUnits;
  }

  // ================================
  // COMBAT UTILITIES
  // ================================
  
  static resolveCombat(
    attackingUnits: number,
    defendingUnits: number,
    attackerId: string,
    defenderId: string
  ): {
    attackerLosses: number,
    defenderLosses: number,
    attackerUnitsRemaining: number,
    victory: 'attacker' | 'defender'
  } {
    console.log(`⚔️ Combat: ${attackingUnits} attackers vs ${defendingUnits} defenders`);
    
    let attackerRemaining = attackingUnits;
    let defenderRemaining = defendingUnits;
    
    while (attackerRemaining > 0 && defenderRemaining > 0) {
      const attackerRoll = GameUtils.rollDice('d6');
      const defenderRoll = GameUtils.rollDice('d6');
      
      console.log(`🎲 Attacker rolls ${attackerRoll}, Defender rolls ${defenderRoll}`);
      
      if (attackerRoll > defenderRoll) {
        defenderRemaining--;
        console.log('🗡️ Defender loses 1 unit');
      } else {
        attackerRemaining--;
        console.log('🛡️ Attacker loses 1 unit');
      }
    }
    
    const result = {
      attackerLosses: attackingUnits - attackerRemaining,
      defenderLosses: defendingUnits - defenderRemaining,
      attackerUnitsRemaining: attackerRemaining,
      victory: defenderRemaining <= 0 ? 'attacker' : 'defender' as 'attacker' | 'defender'
    };
    
    console.log(`⚔️ Combat result:`, result);
    return result;
  }

  static rollDice(diceType: 'd6' | 'd8'): number {
    const max = diceType === 'd6' ? 6 : 8;
    return Math.floor(Math.random() * max) + 1;
  }

  // ================================
  // TERRITORY UTILITIES
  // ================================
  
  static deployMachines(gameState: GameState, action: GameAction): GameState {
    const { territoryId, count } = action.data;
    const newState = { ...gameState };
    
    if (newState.territories[territoryId]) {
      newState.territories[territoryId].machineCount += count;
    }
    
    return newState;
  }
}