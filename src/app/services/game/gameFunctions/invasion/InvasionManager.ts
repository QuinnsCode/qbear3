// src/app/services/game/gameFunctions/invasion/InvasionManager.ts

import type { 
  GameState, 
  GameAction, 
  Player, 
  Territory, 
  AttackResult, 
  PendingConquest,
  CombatResult 
} from '@/app/lib/GameState';

export class InvasionManager {
  
  // ================================
  // PHASE 1: RESOLVE COMBAT (Show Dice Results)
  // ================================

  static resolveCombat(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, attackingUnits, commanderTypes = [] } = action.data;
    const playerId = action.playerId;
    
    console.log('🎯 RESOLVE_COMBAT action:', {
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
      throw new Error('Invalid territories or player for combat');
    }

    if (fromTerritory.ownerId !== playerId) {
      throw new Error('Player does not own attacking territory');
    }

    if (toTerritory.ownerId === playerId) {
      throw new Error('Cannot attack your own territory');
    }

    if (fromTerritory.machineCount <= attackingUnits) {
      throw new Error('Not enough units to attack (must leave 1 behind)');
    }

    if (commanderTypes.length > attackingUnits) {
      throw new Error('Cannot have more commanders than total attacking units');
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

    // Naval commander requirement for water territories
    if (toTerritory.type === 'water') {
      const hasNavalCommander = commanderTypes.includes('naval') || 
                              fromTerritory.navalCommander === playerId;
      if (!hasNavalCommander) {
        throw new Error('Naval commander required for water territories');
      }
    }

    const wasContested = toTerritory.machineCount > 0;
    const originalDefenderCount = toTerritory.machineCount;

    // ✅ Calculate combat results with dice mechanics
    const combatResult = this.resolveCombatWithDice(
      fromTerritory,
      toTerritory, 
      attackingUnits,
      commanderTypes,
      playerId,
      newState
    );

    console.log(`⚔️ Combat result: ${combatResult.attackerLosses} attacker losses, ${combatResult.defenderLosses} defender losses`);

    // ✅ FIXED: Apply casualties first, then determine outcome
    const survivingAttackers = attackingUnits - combatResult.attackerLosses;
    const survivingDefenders = toTerritory.machineCount - combatResult.defenderLosses;

    // Check if territory was conquered (all defenders eliminated)
    if (survivingDefenders <= 0) {
      // ✅ Territory conquered!
      console.log(`🎯 Territory conquered! ${survivingAttackers} survivors will move in.`);
      
      // Remove all attacking units from source (they're committed to the attack)
      fromTerritory.machineCount -= attackingUnits;
      
      // Territory will be conquered - set up pending conquest
      newState.pendingConquest = {
        fromTerritoryId,
        toTerritoryId,
        playerId,
        originalAttackingUnits: attackingUnits,
        attackingCommanders: commanderTypes,
        combatResult,
        oldOwnerId: toTerritory.ownerId,
        wasContested,
        minimumMoveIn: survivingAttackers,  // Survivors must move in
        availableForAdditionalMoveIn: fromTerritory.machineCount - 1, // Additional available (must leave 1)
        showDiceResults: true
      };
      
      // Don't change territory ownership yet - that happens in confirmConquest
      // Don't apply defender losses yet - that happens in confirmConquest
      
    } else {
      // ✅ Attack failed - defenders held the territory
      console.log(`⚔️ Attack failed. Territory defended successfully.`);
      
      // Remove only the attacking unit casualties from source
      fromTerritory.machineCount -= combatResult.attackerLosses;
      
      // Apply defender casualties to defending territory
      toTerritory.machineCount -= combatResult.defenderLosses;
      
      // Apply defender losses (including commander deaths)
      this.applyDefenderLosses(toTerritory, combatResult.defenderLosses);
      
      // Handle attacker commander deaths (if any died)
      this.handleAttackerCommanderDeaths(
        fromTerritory, 
        combatResult.attackerLosses, 
        commanderTypes, 
        playerId
      );
    }

    // Create attack result for UI feedback
    const attackResult: AttackResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      fromTerritoryId,
      toTerritoryId,
      attackingUnits,
      defendingUnits: originalDefenderCount,
      commandersUsed: commanderTypes,
      attackerDice: combatResult.attackerDice || [],
      defenderDice: combatResult.defenderDice || [],
      attackerLosses: combatResult.attackerLosses,
      defenderLosses: combatResult.defenderLosses,
      territoryConquered: !!newState.pendingConquest,
      wasContested
    };

    // Add to invasion results
    player.invasionStats.lastInvasionResults.unshift(attackResult);
    player.invasionStats.lastInvasionResults = player.invasionStats.lastInvasionResults.slice(0, 5);

    return newState;
  }

  // ================================
  // PHASE 2: CONFIRM CONQUEST (Move-in Selection)
  // ================================

  static confirmConquest(gameState: GameState, action: GameAction): GameState {
    const { additionalUnits } = action.data;
    const playerId = action.playerId;
    
    console.log('📦 CONFIRM_CONQUEST action:', {
      additionalUnits,
      playerId
    });

    const newState = { ...gameState };
    const pendingConquest = newState.pendingConquest;

    // Validation
    if (!pendingConquest || pendingConquest.playerId !== playerId) {
      throw new Error('No valid pending conquest found');
    }

    if (additionalUnits < 0 || additionalUnits > pendingConquest.availableForAdditionalMoveIn) {
      throw new Error('Invalid additional units for move-in');
    }

    const fromTerritory = newState.territories[pendingConquest.fromTerritoryId];
    const toTerritory = newState.territories[pendingConquest.toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    if (!fromTerritory || !toTerritory || !player) {
      throw new Error('Invalid territories or player for conquest confirmation');
    }

    // ✅ APPLY TERRITORY OWNERSHIP CHANGE
    toTerritory.ownerId = playerId;
    toTerritory.machineCount = pendingConquest.minimumMoveIn + additionalUnits;

    // ✅ MOVE IN ATTACKING COMMANDERS (MUST move)
    this.moveCommandersAfterConquest(
      fromTerritory, 
      toTerritory, 
      pendingConquest.attackingCommanders, 
      pendingConquest.combatResult, 
      playerId
    );

    // ✅ Apply defender losses & commander deaths
    this.applyDefenderLosses(toTerritory, pendingConquest.combatResult.defenderLosses);

    // ✅ Move additional units if requested
    if (additionalUnits > 0) {
      fromTerritory.machineCount -= additionalUnits;
      console.log(`📦 Moved ${additionalUnits} additional units to ${toTerritory.name}`);
    }

    // ✅ Update player territories
    if (!player.territories.includes(pendingConquest.toTerritoryId)) {
      player.territories.push(pendingConquest.toTerritoryId);
    }

    // ✅ Remove from old owner
    if (pendingConquest.oldOwnerId) {
      const oldOwner = newState.players.find(p => p.id === pendingConquest.oldOwnerId);
      if (oldOwner) {
        oldOwner.territories = oldOwner.territories.filter(id => id !== pendingConquest.toTerritoryId);
      }
    }

    // ✅ Update invasion stats
    if (pendingConquest.wasContested) {
      player.invasionStats!.contestedTerritoriesTaken++;
    } else {
      player.invasionStats!.emptyTerritoriesClaimed++;
    }

    // ✅ Check for conquest bonus (3+ contested territories)
    if (player.invasionStats!.contestedTerritoriesTaken >= 3 && !player.invasionStats!.conquestBonusEarned) {
      player.invasionStats!.conquestBonusEarned = true;
      player.energy += 3;
      console.log(`🏆 ${player.name} earned conquest bonus! +3 energy`);
    }

    // ✅ Lock attacking territory
    if (!player.invasionStats!.territoriesAttackedFrom.includes(pendingConquest.fromTerritoryId)) {
      player.invasionStats!.territoriesAttackedFrom.push(pendingConquest.fromTerritoryId);
    }

    console.log(`✅ Conquest confirmed! ${toTerritory.name} conquered with ${toTerritory.machineCount} total units.`);

    // ✅ Clear pending conquest
    delete newState.pendingConquest;

    return newState;
  }

  // ================================
  // COMMANDER DEATH LOGIC
  // ================================

  static handleAttackerCommanderDeaths(
    territory: Territory, 
    losses: number, 
    attackingCommanders: string[], 
    playerId: string
  ): void {
    if (losses <= 0 || attackingCommanders.length === 0) return;

    let remainingLosses = losses;
    
    // Count attacking regular units vs commanders
    const attackingCommanderCount = attackingCommanders.length;
    
    // Regular units die first, then commanders
    if (remainingLosses > 0) {
      // Remove attacking commanders in priority order (worst first)
      const commanderPriority = ['diplomat', 'land', 'naval', 'nuclear']; // Worst to best
      
      for (const commanderType of commanderPriority) {
        if (remainingLosses <= 0) break;
        
        if (attackingCommanders.includes(commanderType)) {
          const commanderField = `${commanderType}Commander` as keyof Territory;
          if (territory[commanderField] === playerId) {
            delete territory[commanderField];
            remainingLosses--;
            console.log(`💀 Attacking ${commanderType} commander eliminated`);
          }
        }
      }
    }
  }

  static applyDefenderLosses(territory: Territory, losses: number): void {
    if (losses <= 0) return;

    let remainingLosses = losses;
    const commanders = this.getDefendingCommandersList(territory);
    const regularUnits = territory.machineCount - commanders.length;
    
    // First, remove regular units
    const regularUnitsLost = Math.min(remainingLosses, regularUnits);
    remainingLosses -= regularUnitsLost;
    
    // If still have losses, remove commanders in priority order
    if (remainingLosses > 0) {
      // Priority: worst commanders die first
      const commanderPriority = ['diplomat', 'land', 'naval', 'nuclear'];
      
      for (const commanderType of commanderPriority) {
        if (remainingLosses <= 0) break;
        
        const commanderField = `${commanderType}Commander` as keyof Territory;
        if (territory[commanderField] && remainingLosses > 0) {
          delete territory[commanderField];
          remainingLosses--;
          console.log(`💀 Defending ${commanderType} commander eliminated`);
        }
      }
    }
  }

  // ================================
  // COMMANDER MOVEMENT
  // ================================

  static moveCommandersAfterConquest(
    fromTerritory: Territory,
    toTerritory: Territory,
    attackingCommanderTypes: string[],
    combatResult: CombatResult,
    playerId: string
  ): void {
    // ✅ RULE: Attacking commanders MUST move in with conquering force (if they survived)
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
  // COMBAT RESOLUTION (Unchanged)
  // ================================

  static resolveCombatWithDice(
    fromTerritory: Territory,
    toTerritory: Territory,
    attackingUnits: number,
    commanderTypes: string[],
    attackerId: string,
    gameState: GameState
  ): CombatResult {
    const attackingCommanders = commanderTypes.length;
    const attackingRegularUnits = attackingUnits - attackingCommanders;

    if (attackingRegularUnits < 0) {
      throw new Error(`Invalid attack: ${attackingUnits} total units cannot include ${attackingCommanders} commanders`);
    }

    const defendingCommanders = this.countDefendingCommanders(toTerritory);
    const defendingRegularUnits = Math.max(0, toTerritory.machineCount - defendingCommanders);
    const totalDefenders = toTerritory.machineCount;

    console.log(`⚔️ Combat: ${attackingUnits} attackers vs ${totalDefenders} defenders`);

    // ✅ CRITICAL FIX: Defenders can NEVER roll more than 2 dice
    const maxDefenderDice = Math.min(2, totalDefenders);

    const attackerDice = this.rollAttackerDice(
      attackingRegularUnits,
      attackingCommanders,
      commanderTypes,
      fromTerritory,
      toTerritory
    );

    const defenderDice = this.rollDefenderDice(
      Math.min(defendingRegularUnits, maxDefenderDice),
      Math.min(defendingCommanders, Math.max(0, maxDefenderDice - defendingRegularUnits)),
      toTerritory
    );

    // ✅ CRITICAL FIX: Limit dice properly
    const finalAttackerDice = attackerDice.slice(0, Math.min(3, attackingUnits)).sort((a, b) => b - a);
    const finalDefenderDice = defenderDice.slice(0, maxDefenderDice).sort((a, b) => b - a);

    console.log(`🎲 Final dice - Attackers: [${finalAttackerDice.join(',')}], Defenders: [${finalDefenderDice.join(',')}]`);

    const { attackerLosses, defenderLosses } = this.resolveDiceMatches(finalAttackerDice, finalDefenderDice);

    return {
      attackerLosses,
      defenderLosses,
      attackerDice: finalAttackerDice,
      defenderDice: finalDefenderDice,
      attackerUnitsRemaining: attackingUnits - attackerLosses
    };
  }

  // ================================
  // HELPER METHODS (Unchanged from existing)
  // ================================

  static rollAttackerDice(
    regularUnits: number,
    commanders: number,
    commanderTypes: string[],
    fromTerritory: Territory,
    toTerritory: Territory
  ): number[] {
    const dice: number[] = [];

    for (let i = 0; i < regularUnits; i++) {
      dice.push(Math.floor(Math.random() * 6) + 1);
    }

    commanderTypes.forEach(commanderType => {
      const dieType = this.getCommanderDieType(commanderType, fromTerritory, toTerritory, 'attack');
      if (dieType === 8) {
        dice.push(Math.floor(Math.random() * 8) + 1);
      } else {
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
    });

    return dice.sort((a, b) => b - a);
  }

  static rollDefenderDice(regularUnits: number, commanders: number, territory: Territory): number[] {
    const dice: number[] = [];

    for (let i = 0; i < regularUnits; i++) {
      dice.push(Math.floor(Math.random() * 6) + 1);
    }

    for (let i = 0; i < commanders; i++) {
      const dieType = this.getDefenderCommanderDieType(territory);
      if (dieType === 8) {
        dice.push(Math.floor(Math.random() * 8) + 1);
      } else {
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
    }

    return dice.sort((a, b) => b - a);
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
        console.log(`🛡️ Defender ${defenderDice[i]} beats/ties Attacker ${attackerDice[i]}`);
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
    if (commanderType === 'land' && toTerritory.type === 'land') return 8;
    if (commanderType === 'naval' && toTerritory.type === 'water') return 8;
    if (commanderType === 'nuclear') return 8;
    if (commanderType === 'diplomat') return 6;
    return 6;
  }

  static getDefenderCommanderDieType(territory: Territory): number {
    if (territory.type === 'land' && territory.landCommander) return 8;
    if (territory.type === 'water' && territory.navalCommander) return 8;
    if (territory.nuclearCommander) return 8;
    return 6;
  }

  static countDefendingCommanders(territory: Territory): number {
    let count = 0;
    if (territory.landCommander) count++;
    if (territory.navalCommander) count++;
    if (territory.nuclearCommander) count++;
    if (territory.diplomatCommander) count++;
    return count;
  }

  static getDefendingCommandersList(territory: Territory): string[] {
    const commanders: string[] = [];
    if (territory.landCommander) commanders.push('land');
    if (territory.navalCommander) commanders.push('naval');
    if (territory.nuclearCommander) commanders.push('nuclear');
    if (territory.diplomatCommander) commanders.push('diplomat');
    return commanders;
  }

  // ================================
  // UTILITY METHODS (Unchanged)
  // ================================

  static canAttackFromTerritory(gameState: GameState, playerId: string, territoryId: string): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    const territory = gameState.territories[territoryId];
    
    if (!player || !territory) return false;
    if (territory.ownerId !== playerId) return false;
    if (territory.machineCount <= 1) return false;
    
    if (player.invasionStats?.territoriesAttackedFrom.includes(territoryId)) {
      return false;
    }
    
    return true;
  }

  static canAttackTerritory(gameState: GameState, playerId: string, fromTerritoryId: string, toTerritoryId: string): boolean {
    const fromTerritory = gameState.territories[fromTerritoryId];
    const toTerritory = gameState.territories[toTerritoryId];
    
    if (!fromTerritory || !toTerritory) return false;
    if (toTerritory.ownerId === playerId) return false;
    if (!fromTerritory.connections.includes(toTerritoryId)) return false;
    
    if (toTerritory.type === 'water') {
      const hasNavalCommander = fromTerritory.navalCommander === playerId;
      if (!hasNavalCommander) return false;
    }
    
    return this.canAttackFromTerritory(gameState, playerId, fromTerritoryId);
  }

  // ================================
  // KEEP EXISTING METHODS (for compatibility)
  // ================================

  static moveIntoEmptyTerritory(gameState: GameState, action: GameAction): GameState {
    // Keep existing implementation unchanged
    const { fromTerritoryId, toTerritoryId, movingUnits } = action.data;
    const playerId = action.playerId;
    
    const newState = { ...gameState };
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    if (!fromTerritory || !toTerritory || !player) {
      throw new Error('Invalid territories or player for movement');
    }

    if (fromTerritory.ownerId !== playerId) {
      throw new Error('Player does not own source territory');
    }

    if (toTerritory.machineCount > 0) {
      throw new Error('Target territory is not empty');
    }

    if (fromTerritory.machineCount <= movingUnits) {
      throw new Error('Not enough units to move (must leave 1 behind)');
    }

    if (!player.invasionStats) {
      player.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [],
        lastInvasionResults: []
      };
    }

    fromTerritory.machineCount -= movingUnits;
    toTerritory.machineCount = movingUnits;
    toTerritory.ownerId = playerId;

    if (!player.territories.includes(toTerritoryId)) {
      player.territories.push(toTerritoryId);
    }

    player.invasionStats.emptyTerritoriesClaimed++;

    if (!player.invasionStats.territoriesAttackedFrom.includes(fromTerritoryId)) {
      player.invasionStats.territoriesAttackedFrom.push(fromTerritoryId);
    }

    return newState;
  }

  static startInvasionPhase(gameState: GameState, action: GameAction): GameState {
    // Keep existing implementation unchanged
    const playerId = action.playerId;
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      throw new Error('Player not found for invasion phase start');
    }

    const newState = { ...gameState };
    const updatedPlayer = newState.players.find(p => p.id === playerId);

    if (updatedPlayer) {
      updatedPlayer.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [],
        lastInvasionResults: []
      };
    }

    return newState;
  }

  // ================================
  // LEGACY COMPATIBILITY
  // ================================

  static invadeTerritory(gameState: GameState, action: GameAction): GameState {
    // Legacy method - redirect to new two-phase system
    console.warn('⚠️ invadeTerritory is deprecated - use resolveCombat instead');
    return this.resolveCombat(gameState, action);
  }
}