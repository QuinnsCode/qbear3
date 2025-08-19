// src/app/services/game/gameFunctions/invasion/InvasionManager.ts

import type { GameState, GameAction, Player, Territory, AttackResult } from '@/app/lib/GameState';
import { GameUtils } from '@/app/services/game/gameFunctions/utils/GameUtils';

export class InvasionManager {
  
  // ================================
  // INVASION SYSTEM
  // ================================

  static invadeTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, attackingUnits, commanderTypes } = action.data;
    const playerId = action.playerId;
    
    console.log('🎯 INVADE_TERRITORY action:', {
      fromTerritoryId,
      toTerritoryId,
      attackingUnits,
      commanderTypes,
      playerId
    });

    const newState = { ...gameState };
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    // Validation
    if (!fromTerritory || !toTerritory || !player) {
      console.error('❌ Invalid territories or player for invasion');
      throw new Error('Invalid territories or player for invasion');
    }

    if (fromTerritory.ownerId !== playerId) {
      console.error('❌ Player does not own attacking territory');
      throw new Error('Player does not own attacking territory');
    }

    if (toTerritory.ownerId === playerId) {
      console.error('❌ Cannot attack your own territory');
      throw new Error('Cannot attack your own territory');
    }

    if (fromTerritory.machineCount <= attackingUnits) {
      console.error('❌ Not enough units to attack (must leave 1 behind)');
      throw new Error('Not enough units to attack (must leave 1 behind)');
    }

    // ✅ FIXED: Check if CONQUERED territory is locked, not attacking territory
    if (!player.invasionStats) {
      player.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [], // Territories that moved units OUT (can't attack again)
        lastInvasionResults: []
      };
    }

    // ✅ REMOVED: No longer check if attacking territory is locked
    // Can attack from same territory multiple times as long as you have units

    // Naval commander requirement for water territories
    if (toTerritory.type === 'water') {
      const hasNavalCommander = commanderTypes.includes('naval') || 
                              fromTerritory.navalCommander === playerId;
      if (!hasNavalCommander) {
        console.error('❌ Naval commander required for water territories');
        throw new Error('Naval commander required for water territories');
      }
    }

    const wasContested = toTerritory.machineCount > 0;

    // ✅ Use proper combat resolution with dice mechanics
    const combatResult = this.resolveCombatWithDice(
      fromTerritory,
      toTerritory, 
      attackingUnits,
      commanderTypes,
      playerId,
      newState
    );

    // ✅ Apply losses to both sides
    fromTerritory.machineCount -= combatResult.attackerLosses;
    toTerritory.machineCount -= combatResult.defenderLosses;

    let territoryConquered = false;
    let oldOwnerId = toTerritory.ownerId;
    let attackerSurvivors = attackingUnits - combatResult.attackerLosses;

    // Check if territory was conquered (defenders eliminated)
    if (toTerritory.machineCount <= 0) {
      territoryConquered = true;
      
      // ✅ FIXED: Only the minimum required force moves in initially
      // Remove attacking units from source (they ALL participated in attack)
      fromTerritory.machineCount -= (attackingUnits - combatResult.attackerLosses);
      
      // Only survivors occupy the conquered territory initially
      toTerritory.ownerId = playerId;
      toTerritory.machineCount = attackerSurvivors;

      // ✅ Move commanders that were part of conquering force
      this.moveCommandersAfterConquest(fromTerritory, toTerritory, commanderTypes, combatResult, playerId);

      // Update player territories
      if (!player.territories.includes(toTerritoryId)) {
        player.territories.push(toTerritoryId);
      }

      // Remove from old owner
      if (oldOwnerId) {
        const oldOwner = newState.players.find(p => p.id === oldOwnerId);
        if (oldOwner) {
          oldOwner.territories = oldOwner.territories.filter(id => id !== toTerritoryId);
        }
      }

      // Update invasion stats
      if (wasContested) {
        player.invasionStats.contestedTerritoriesTaken++;
      } else {
        player.invasionStats.emptyTerritoriesClaimed++;
      }

      // Check for conquest bonus (3+ contested territories)
      if (player.invasionStats.contestedTerritoriesTaken >= 3 && !player.invasionStats.conquestBonusEarned) {
        player.invasionStats.conquestBonusEarned = true;
        player.energy += 3;
        console.log(`🏆 ${player.name} earned conquest bonus! +3 energy`);
      }

      console.log(`🎯 ${fromTerritory.name} conquered ${toTerritory.name}! ${attackerSurvivors} survivors moved in.`);
      
      // ✅ FIXED: Lock the CONQUERED territory, not the attacking territory
      // This prevents immediate counter-attacks on newly conquered territory
      if (!player.invasionStats.territoriesAttackedFrom.includes(toTerritoryId)) {
        player.invasionStats.territoriesAttackedFrom.push(toTerritoryId);
      }
      
      // ✅ IMPORTANT: Set a flag to trigger move-in selection in UI
      newState.pendingMoveIn = {
        fromTerritoryId,
        toTerritoryId,
        playerId,
        minOccupation: attackerSurvivors,
        availableUnits: fromTerritory.machineCount - 1 // Must leave 1 behind
      };
      
    } else {
      // ✅ Attack failed - attacking units stay in source territory
      // No territory locking - can attack again from same territory
      console.log(`⚔️ Attack from ${fromTerritory.name} to ${toTerritory.name} repelled. ${combatResult.attackerLosses} attackers lost.`);
    }

    // Create attack result for UI feedback
    const attackResult: AttackResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      fromTerritoryId,
      toTerritoryId,
      attackingUnits,
      defendingUnits: toTerritory.machineCount + combatResult.defenderLosses,
      commandersUsed: commanderTypes,
      attackerDice: combatResult.attackerDice || [],
      defenderDice: combatResult.defenderDice || [],
      attackerLosses: combatResult.attackerLosses,
      defenderLosses: combatResult.defenderLosses,
      territoryConquered,
      wasContested
    };

    // Add to invasion results
    player.invasionStats.lastInvasionResults.unshift(attackResult);
    // Keep only last 5 results
    player.invasionStats.lastInvasionResults = player.invasionStats.lastInvasionResults.slice(0, 5);

    return newState;
  }

  // ================================
  // POST-CONQUEST MOVE-IN SYSTEM
  // ================================

  static confirmAdditionalMoveIn(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, additionalUnits } = action.data;
    const playerId = action.playerId;
    
    console.log('📦 CONFIRM_ADDITIONAL_MOVE_IN action:', {
      fromTerritoryId,
      toTerritoryId,
      additionalUnits,
      playerId
    });

    const newState = { ...gameState };
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    // Validation
    if (!fromTerritory || !toTerritory || !player) {
      console.error('❌ Invalid territories or player for additional move-in');
      throw new Error('Invalid territories or player for additional move-in');
    }

    if (fromTerritory.ownerId !== playerId || toTerritory.ownerId !== playerId) {
      console.error('❌ Player must own both territories for additional move-in');
      throw new Error('Player must own both territories for additional move-in');
    }

    if (additionalUnits < 0) {
      console.error('❌ Cannot move negative units');
      throw new Error('Cannot move negative units');
    }

    if (additionalUnits > 0) {
      // Validate enough units available (must leave 1 behind)
      if (fromTerritory.machineCount <= additionalUnits) {
        console.error('❌ Not enough units available for additional move-in (must leave 1 behind)');
        throw new Error('Not enough units available for additional move-in (must leave 1 behind)');
      }

      // Move additional units
      fromTerritory.machineCount -= additionalUnits;
      toTerritory.machineCount += additionalUnits;

      console.log(`📦 Moved ${additionalUnits} additional units from ${fromTerritory.name} to ${toTerritory.name}`);
    } else {
      console.log(`📦 No additional units moved - minimum force only`);
    }

    // ✅ FIXED: Lock the attacking territory ONLY after move-in is complete
    // Now it can't attack again this turn since units have moved
    if (!player.invasionStats.territoriesAttackedFrom.includes(fromTerritoryId)) {
      player.invasionStats.territoriesAttackedFrom.push(fromTerritoryId);
    }

    // Clear pending move-in state
    delete newState.pendingMoveIn;

    console.log(`🔒 Source territory ${fromTerritory.name} locked from further attacks this turn (completed move-in)`);

    return newState;
  }

  // ================================
  // TERRITORY LOCKING CHECKS
  // ================================

  static canAttackFromTerritory(gameState: GameState, playerId: string, territoryId: string): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    const territory = gameState.territories[territoryId];
    
    if (!player || !territory) return false;
    if (territory.ownerId !== playerId) return false;
    if (territory.machineCount <= 1) return false; // Must leave 1 behind
    
    // ✅ FIXED: Only check if this territory has completed a move-in this turn
    // Can attack multiple times from same territory until units are moved
    if (player.invasionStats?.territoriesAttackedFrom.includes(territoryId)) {
      return false; // Territory already moved units and is locked
    }
    
    return true;
  }

  static canAttackTerritory(gameState: GameState, playerId: string, fromTerritoryId: string, toTerritoryId: string): boolean {
    const fromTerritory = gameState.territories[fromTerritoryId];
    const toTerritory = gameState.territories[toTerritoryId];
    
    if (!fromTerritory || !toTerritory) return false;
    if (toTerritory.ownerId === playerId) return false; // Can't attack own territory
    if (!fromTerritory.connections.includes(toTerritoryId)) return false; // Must be connected
    
    // Check naval commander requirement for water territories
    if (toTerritory.type === 'water') {
      const hasNavalCommander = fromTerritory.navalCommander === playerId;
      if (!hasNavalCommander) return false;
    }
    
    return this.canAttackFromTerritory(gameState, playerId, fromTerritoryId);
  }

  // ================================
  // ADVANCED COMBAT RESOLUTION
  // ================================

  static resolveCombatWithDice(
    fromTerritory: Territory,
    toTerritory: Territory,
    attackingUnits: number,
    commanderTypes: string[],
    attackerId: string,
    gameState: GameState
  ) {
    // ✅ Commanders are INCLUDED in attacking unit count, not additional
    const attackingCommanders = commanderTypes.length;
    const attackingRegularUnits = attackingUnits - attackingCommanders;

    if (attackingRegularUnits < 0) {
      throw new Error(`Invalid attack composition: ${attackingUnits} units cannot include ${attackingCommanders} commanders`);
    }

    // Determine defending force composition  
    const defendingCommanders = this.countDefendingCommanders(toTerritory);
    const defendingRegularUnits = Math.max(0, toTerritory.machineCount - defendingCommanders);

    console.log(`⚔️ Combat: ${attackingUnits} attackers (${attackingCommanders} commanders) vs ${toTerritory.machineCount} defenders (${defendingCommanders} commanders)`);

    // Roll dice for attackers
    const attackerDice = this.rollAttackerDice(
      attackingRegularUnits,
      attackingCommanders,
      commanderTypes,
      fromTerritory,
      toTerritory
    );

    // Roll dice for defenders (auto-maximize)
    const defenderDice = this.rollDefenderDice(
      defendingRegularUnits,
      defendingCommanders,
      toTerritory
    );

    // Resolve combat matches (highest vs highest)
    const { attackerLosses, defenderLosses } = this.resolveDiceMatches(attackerDice, defenderDice);

    return {
      attackerLosses,
      defenderLosses,
      attackerDice,
      defenderDice,
      attackerUnitsRemaining: attackingUnits - attackerLosses
    };
  }

  static rollAttackerDice(
    regularUnits: number,
    commanders: number,
    commanderTypes: string[],
    fromTerritory: Territory,
    toTerritory: Territory
  ): number[] {
    const dice: number[] = [];

    // Regular units roll d6
    for (let i = 0; i < regularUnits; i++) {
      dice.push(Math.floor(Math.random() * 6) + 1);
    }

    // Commanders roll based on type and terrain
    commanderTypes.forEach(commanderType => {
      const dieType = this.getCommanderDieType(commanderType, fromTerritory, toTerritory, 'attack');
      if (dieType === 8) {
        dice.push(Math.floor(Math.random() * 8) + 1);
      } else {
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
    });

    return dice.sort((a, b) => b - a); // Sort highest to lowest
  }

  static rollDefenderDice(
    regularUnits: number,
    commanders: number,
    territory: Territory
  ): number[] {
    const dice: number[] = [];

    // Regular units roll d6
    for (let i = 0; i < regularUnits; i++) {
      dice.push(Math.floor(Math.random() * 6) + 1);
    }

    // Defending commanders roll based on terrain
    for (let i = 0; i < commanders; i++) {
      const dieType = this.getDefenderCommanderDieType(territory);
      if (dieType === 8) {
        dice.push(Math.floor(Math.random() * 8) + 1);
      } else {
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
    }

    return dice.sort((a, b) => b - a); // Sort highest to lowest
  }

  static resolveDiceMatches(attackerDice: number[], defenderDice: number[]): {
    attackerLosses: number;
    defenderLosses: number;
  } {
    let attackerLosses = 0;
    let defenderLosses = 0;

    const maxMatches = Math.min(attackerDice.length, defenderDice.length);

    for (let i = 0; i < maxMatches; i++) {
      if (attackerDice[i] > defenderDice[i]) {
        defenderLosses++;
        console.log(`🎯 Attacker ${attackerDice[i]} beats Defender ${defenderDice[i]}`);
      } else {
        attackerLosses++;
        console.log(`🛡️ Defender ${defenderDice[i]} beats/ties Attacker ${attackerDice[i]} (ties go to defender)`);
      }
    }

    console.log(`📊 Combat result: Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}`);
    return { attackerLosses, defenderLosses };
  }

  static getCommanderDieType(
    commanderType: string,
    fromTerritory: Territory,
    toTerritory: Territory,
    action: 'attack' | 'defend'
  ): number {
    // Land commander gets d8 when attacking/defending land territories
    if (commanderType === 'land' && toTerritory.type === 'land') {
      return 8;
    }

    // Naval commander gets d8 when attacking/defending water territories  
    if (commanderType === 'naval' && toTerritory.type === 'water') {
      return 8;
    }

    // Nuclear commander gets d8 always
    if (commanderType === 'nuclear') {
      return 8;
    }

    // Diplomat commander gets d6 in most conditions
    if (commanderType === 'diplomat') {
      return 6;
    }

    return 6; // Default to d6
  }

  static getDefenderCommanderDieType(territory: Territory): number {
    // Defending commanders get d8 in their preferred terrain
    if (territory.type === 'land' && territory.landCommander) {
      return 8;
    }
    if (territory.type === 'water' && territory.navalCommander) {
      return 8;
    }
    if (territory.nuclearCommander) {
      return 8;
    }
    return 6; // Default
  }

  static countDefendingCommanders(territory: Territory): number {
    let count = 0;
    if (territory.landCommander) count++;
    if (territory.navalCommander) count++;
    if (territory.nuclearCommander) count++;
    if (territory.diplomatCommander) count++;
    return count;
  }

  static moveCommandersAfterConquest(
    fromTerritory: Territory,
    toTerritory: Territory,
    attackingCommanderTypes: string[],
    combatResult: any,
    playerId: string
  ): void {
    // Only move commanders if conquest happened and they were attacking
    attackingCommanderTypes.forEach(commanderType => {
      const commanderField = `${commanderType}Commander` as keyof Territory;
      
      if (fromTerritory[commanderField] === playerId) {
        // Move commander to conquered territory
        delete fromTerritory[commanderField];
        (toTerritory as any)[commanderField] = playerId;
        console.log(`🎖️ ${commanderType} commander moved to conquered territory`);
      }
    });
  }

  // ================================
  // EMPTY TERRITORY MOVEMENT
  // ================================

  static moveIntoEmptyTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, movingUnits } = action.data;
    const playerId = action.playerId;
    
    console.log('🚶 MOVE_INTO_EMPTY_TERRITORY action:', {
      fromTerritoryId,
      toTerritoryId,
      movingUnits,
      playerId
    });

    const newState = { ...gameState };
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    // Validation
    if (!fromTerritory || !toTerritory || !player) {
      console.error('❌ Invalid territories or player for movement');
      throw new Error('Invalid territories or player for movement');
    }

    if (fromTerritory.ownerId !== playerId) {
      console.error('❌ Player does not own source territory');
      throw new Error('Player does not own source territory');
    }

    if (toTerritory.machineCount > 0) {
      console.error('❌ Target territory is not empty');
      throw new Error('Target territory is not empty - use invasion instead');
    }

    if (fromTerritory.machineCount <= movingUnits) {
      console.error('❌ Not enough units to move (must leave 1 behind)');
      throw new Error('Not enough units to move (must leave 1 behind)');
    }

    // Initialize invasion stats if needed
    if (!player.invasionStats) {
      player.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [],
        lastInvasionResults: []
      };
    }

    // Move units
    fromTerritory.machineCount -= movingUnits;
    toTerritory.machineCount = movingUnits;
    toTerritory.ownerId = playerId;

    // Update player territories
    if (!player.territories.includes(toTerritoryId)) {
      player.territories.push(toTerritoryId);
    }

    // Update invasion stats
    player.invasionStats.emptyTerritoriesClaimed++;

    // ✅ Lock the source territory since units moved
    if (!player.invasionStats.territoriesAttackedFrom.includes(fromTerritoryId)) {
      player.invasionStats.territoriesAttackedFrom.push(fromTerritoryId);
    }

    console.log(`✅ ${player.name} moved ${movingUnits} units from ${fromTerritory.name} to ${toTerritory.name}`);

    return newState;
  }

  static startInvasionPhase(gameState: GameState, action: GameAction): GameState {
    const playerId = action.playerId;
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      console.error('❌ Player not found for invasion phase start');
      throw new Error('Player not found for invasion phase start');
    }

    console.log(`⚔️ Starting invasion phase for ${player.name}`);

    const newState = { ...gameState };
    const updatedPlayer = newState.players.find(p => p.id === playerId);

    if (updatedPlayer) {
      // Reset invasion stats for this turn
      updatedPlayer.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [],
        lastInvasionResults: []
      };
    }

    console.log(`✅ Invasion phase started - stats reset for ${player.name}`);

    return newState;
  }

  // ================================
  // UTILITY METHODS
  // ================================

  static getAttackableTargets(gameState: GameState, playerId: string, fromTerritoryId: string): string[] {
    const fromTerritory = gameState.territories[fromTerritoryId];
    
    if (!this.canAttackFromTerritory(gameState, playerId, fromTerritoryId)) {
      return [];
    }
    
    return fromTerritory.connections.filter(targetId => 
      this.canAttackTerritory(gameState, playerId, fromTerritoryId, targetId)
    );
  }

  static getAttackingSources(gameState: GameState, playerId: string, targetTerritoryId: string): string[] {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return [];
    
    return player.territories.filter(territoryId => 
      this.canAttackTerritory(gameState, playerId, territoryId, targetTerritoryId)
    );
  }

  static calculateInvasionPotential(gameState: GameState, playerId: string): {
    totalAttackingPower: number;
    vulnerableEnemyTerritories: string[];
    emptyTerritories: string[];
  } {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { totalAttackingPower: 0, vulnerableEnemyTerritories: [], emptyTerritories: [] };
    }

    let totalAttackingPower = 0;
    const vulnerableEnemyTerritories: string[] = [];
    const emptyTerritories: string[] = [];

    // Calculate total attacking power
    player.territories.forEach(territoryId => {
      const territory = gameState.territories[territoryId];
      if (territory && territory.machineCount > 1) {
        totalAttackingPower += territory.machineCount - 1; // Must leave 1 behind
      }
    });

    // Find vulnerable enemy territories and empty territories
    Object.values(gameState.territories).forEach(territory => {
      if (territory.ownerId !== playerId) {
        const attackingSources = this.getAttackingSources(gameState, playerId, territory.id);
        
        if (attackingSources.length > 0) {
          if (territory.machineCount === 0) {
            emptyTerritories.push(territory.id);
          } else {
            vulnerableEnemyTerritories.push(territory.id);
          }
        }
      }
    });

    return {
      totalAttackingPower,
      vulnerableEnemyTerritories,
      emptyTerritories
    };
  }

  static estimateAttackSuccess(attackingUnits: number, defendingUnits: number): number {
    if (defendingUnits === 0) return 1.0; // Always win against empty territory
    if (attackingUnits <= 0) return 0.0; // Can't attack with 0 units
    
    // Simplified probability calculation
    const ratio = attackingUnits / defendingUnits;
    
    if (ratio >= 3) return 0.9;  // Overwhelming force
    if (ratio >= 2) return 0.75; // Strong advantage
    if (ratio >= 1.5) return 0.6; // Moderate advantage
    if (ratio >= 1) return 0.45;  // Even odds, slight disadvantage (defender wins ties)
    if (ratio >= 0.5) return 0.25; // Underdog
    
    return 0.1; // Very unlikely
  }

  // ================================
  // DEFENDER DEATH ORDER (Hard-coded priority)
  // ================================
  
  static applyDefenderLosses(territory: Territory, losses: number): void {
    // TODO: Come back to this for advanced AI - should be based on commander cards/quality
    // Hard-coded priority: Regular units die first, then commanders in priority order
    
    let remainingLosses = losses;
    const totalUnits = territory.machineCount;
    const commanders = this.getDefendingCommandersList(territory);
    const regularUnits = totalUnits - commanders.length;
    
    // First, remove regular units
    const regularUnitsLost = Math.min(remainingLosses, regularUnits);
    remainingLosses -= regularUnitsLost;
    
    // If still have losses, remove commanders in priority order
    if (remainingLosses > 0) {
      // Priority: Nuclear > Space > Naval > Land > Diplomat
      const commanderPriority = ['diplomat', 'land', 'naval', 'nuclear']; // Reverse order (worst die first)
      
      for (const commanderType of commanderPriority) {
        if (remainingLosses <= 0) break;
        
        const commanderField = `${commanderType}Commander` as keyof Territory;
        if (territory[commanderField] && remainingLosses > 0) {
          delete territory[commanderField];
          remainingLosses--;
          console.log(`💀 ${commanderType} commander eliminated (defender death priority)`);
        }
      }
    }
  }
  
  static getDefendingCommandersList(territory: Territory): string[] {
    const commanders: string[] = [];
    if (territory.landCommander) commanders.push('land');
    if (territory.navalCommander) commanders.push('naval');
    if (territory.nuclearCommander) commanders.push('nuclear');
    if (territory.diplomatCommander) commanders.push('diplomat');
    return commanders;
  }

  // Legacy compatibility
  static attackTerritory(gameState: GameState, action: GameAction): GameState {
    // Legacy method - keep for compatibility
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
}