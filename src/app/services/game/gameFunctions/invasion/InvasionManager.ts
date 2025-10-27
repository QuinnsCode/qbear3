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
import { CardManager } from '@/app/services/game/gameFunctions/cards/CardManager';

export class InvasionManager {
  
  // ================================
  // SAFE UNIT OPERATIONS - PREVENT NEGATIVES
  // ================================

  /**
   * Safely deduct units from a territory with validation
   */
  static safeDeductUnits(territory: Territory, amount: number, operation: string): void {
    if (amount < 0) {
      throw new Error(`Invalid negative deduction: ${amount} for ${operation}`);
    }
    
    if (territory.machineCount < amount) {
      throw new Error(`Cannot ${operation}: Territory ${territory.name} has ${territory.machineCount} units, cannot deduct ${amount}`);
    }
    
    const newCount = territory.machineCount - amount;
    if (newCount < 0) {
      throw new Error(`${operation} would result in negative units: ${territory.machineCount} - ${amount} = ${newCount}`);
    }
    
    territory.machineCount = newCount;
    console.log(`Safe deduction: ${territory.name} now has ${territory.machineCount} units after ${operation}`);
  }

  /**
   * Safely add units to a territory
   */
  static safeAddUnits(territory: Territory, amount: number, operation: string): void {
    if (amount < 0) {
      throw new Error(`Invalid negative addition: ${amount} for ${operation}`);
    }
    
    territory.machineCount += amount;
    console.log(`Safe addition: ${territory.name} now has ${territory.machineCount} units after ${operation}`);
  }

  /**
   * Validate territory state to ensure no negative units
   */
  static validateTerritoryState(territory: Territory, context: string): void {
    if (territory.machineCount < 0) {
      console.error(`CRITICAL ERROR: Territory ${territory.name} has negative units (${territory.machineCount}) in context: ${context}`);
      throw new Error(`Invalid state: Territory cannot have negative units (${territory.machineCount})`);
    }
  }

  // ================================
  // PHASE 1: RESOLVE COMBAT (Show Dice Results) - FIXED WITH SAFE OPERATIONS
  // ================================

  static resolveCombat(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, attackingUnits, commanderTypes = [] } = action.data;
    const playerId = action.playerId;
    
    console.log('Combat action:', {
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

    // ================================
    // VALIDATION
    // ================================
    if (!fromTerritory || !toTerritory || !player) {
      throw new Error('Invalid territories or player for combat');
    }

    if (fromTerritory.ownerId !== playerId) {
      throw new Error('Player does not own attacking territory');
    }

    if (toTerritory.ownerId === playerId) {
      throw new Error('Cannot attack your own territory');
    }

    // ENHANCED VALIDATION: Check if territory has enough units for attack
    if (fromTerritory.machineCount <= attackingUnits) {
      throw new Error(`Territory ${fromTerritory.name} has ${fromTerritory.machineCount} units, cannot attack with ${attackingUnits} (must leave 1 behind)`);
    }

    if (commanderTypes.length > attackingUnits) {
      throw new Error('Cannot have more commanders than total attacking units');
    }

    // Validate initial states
    this.validateTerritoryState(fromTerritory, 'pre-combat attacking territory');
    this.validateTerritoryState(toTerritory, 'pre-combat defending territory');

    // ================================
    // INITIALIZE INVASION STATS
    // ================================
    if (!player.invasionStats) {
      player.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [],
        lastInvasionResults: []
      };
    }

    // ================================
    // NAVAL COMMANDER REQUIREMENT
    // ================================
    if (toTerritory.type === 'water') {
      const hasNavalCommander = commanderTypes.includes('naval') || 
                              fromTerritory.navalCommander === playerId;
      if (!hasNavalCommander) {
        throw new Error('Naval commander required for water territories');
      }
    }

    // ================================
    // COMBAT SETUP
    // ================================
    const wasContested = toTerritory.machineCount > 0;
    const originalDefenderCount = toTerritory.machineCount;

    console.log(`Combat setup: ${attackingUnits} attackers vs ${originalDefenderCount} defenders`);
    console.log(`Attacking commanders: [${commanderTypes.join(', ')}]`);

    // ================================
    // RESOLVE COMBAT WITH DICE
    // ================================
    const combatResult = this.resolveCombatWithDice(
      fromTerritory,
      toTerritory, 
      attackingUnits,
      commanderTypes,
      playerId,
      newState
    );

    console.log(`Combat result: ${combatResult.attackerLosses} attacker losses, ${combatResult.defenderLosses} defender losses`);

    // ================================
    // CALCULATE SURVIVORS
    // ================================
    const survivingAttackers = attackingUnits - combatResult.attackerLosses;
    const survivingDefenders = toTerritory.machineCount - combatResult.defenderLosses;

    console.log(`Survivors: ${survivingAttackers} attackers, ${survivingDefenders} defenders`);

    // SAFETY CHECK: Ensure we have valid survivor counts
    if (survivingAttackers < 0) {
      throw new Error(`Invalid combat result: Cannot have negative surviving attackers (${survivingAttackers})`);
    }
    if (survivingDefenders < 0) {
      console.log('Defenders eliminated - territory will be conquered');
    }

    // ================================
    // TERRITORY CONQUEST CHECK
    // ================================
    if (survivingDefenders <= 0) {
      // CONQUEST: Territory conquered!
      console.log(`Territory conquered! ${survivingAttackers} survivors will move in.`);
      
      // STEP 1: Apply attacker casualties to territory unit count (SAFE)
      this.safeDeductUnits(fromTerritory, combatResult.attackerLosses, 'attacker casualties');
      
      // STEP 2: Handle attacking commander deaths (territory-based protection)
      this.handleAttackerCommanderDeaths(
        fromTerritory, 
        combatResult.attackerLosses, 
        commanderTypes,
        playerId
      );
      
      // STEP 3: Calculate available units for additional move-in (SAFE)
      const unitsAfterCasualties = fromTerritory.machineCount;
      const maxAdditionalMoveIn = Math.max(0, unitsAfterCasualties - 1); // Must leave 1 behind
      
      // STEP 4: Set up pending conquest (two-phase system)
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
        availableForAdditionalMoveIn: maxAdditionalMoveIn, // Additional available (safely calculated)
        showDiceResults: true
      };
      
      console.log(`Pending conquest created - awaiting move-in selection`);
      console.log(`Available for additional move-in: ${maxAdditionalMoveIn} units`);
      
      // DEFERRED: Don't change territory ownership yet - that happens in confirmConquest
      // DEFERRED: Don't apply defender casualties yet - that happens in confirmConquest
      
    } else {
      // FAILED ATTACK: Defenders held the territory
      this.safeDeductUnits(fromTerritory, combatResult.attackerLosses, 'failed attack casualties');
      
      // Apply defender casualties (FIXED: Only deduct units once)
      this.safeDeductUnits(toTerritory, combatResult.defenderLosses, 'defender casualties in failed attack');
      
      this.handleAttackerCommanderDeaths(
        fromTerritory, 
        combatResult.attackerLosses, 
        commanderTypes,
        playerId
      );
      
      // Apply defender commander losses (FIXED: Only handle commander elimination, not unit deduction)
      this.applyDefenderLosses(toTerritory, combatResult.defenderLosses);
    }

    // Validate final states
    this.validateTerritoryState(fromTerritory, 'post-combat attacking territory');
    this.validateTerritoryState(toTerritory, 'post-combat defending territory');

    // ================================
    // CREATE ATTACK RESULT FOR UI
    // ================================
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

    // ================================
    // UPDATE INVASION STATS
    // ================================
    player.invasionStats.lastInvasionResults.unshift(attackResult);
    player.invasionStats.lastInvasionResults = player.invasionStats.lastInvasionResults.slice(0, 5);

    console.log(`Attack result recorded in invasion stats`);
    console.log(`Combat resolution complete`);

    return newState;
  }

  // ================================
  // TERRITORY-BASED COMMANDER DEATH LOGIC - ENHANCED WITH SAFETY
  // ================================

  static handleAttackerCommanderDeaths(
    territory: Territory, 
    losses: number, 
    attackingCommanders: string[], 
    playerId: string
  ): void {
    if (losses <= 0) {
      console.log(`No attacker casualties`);
      return;
    }

    if (attackingCommanders.length === 0) {
      console.log(`No attacking commanders to potentially eliminate`);
      return;
    }

    // Validate territory state before processing
    this.validateTerritoryState(territory, 'before commander death processing');

    // Check ALL units in territory after casualties applied
    const allCommandersInTerritory = this.getPlayerCommandersInTerritory(territory, playerId);
    const totalUnitsInTerritory = territory.machineCount; // After casualties already applied
    const regularUnitsInTerritory = totalUnitsInTerritory - allCommandersInTerritory.length;
    
    console.log(`Handling ${losses} attacker casualties:`);
    console.log(`- Territory now has ${totalUnitsInTerritory} total units (${regularUnitsInTerritory} regular + ${allCommandersInTerritory.length} commanders)`);
    console.log(`- Attacking commanders at risk: [${attackingCommanders.join(', ')}]`);
    
    let remainingLosses = losses;
    
    // RULE: Regular units in territory die first, commanders only when no regular units left
    const regularUnitsKilled = Math.min(remainingLosses, regularUnitsInTerritory);
    remainingLosses -= regularUnitsKilled;
    
    console.log(`- Regular units killed: ${regularUnitsKilled}`);
    console.log(`- Regular units remaining in territory: ${regularUnitsInTerritory - regularUnitsKilled}`);
    console.log(`- Remaining losses for commanders: ${remainingLosses}`);
    
    // Only kill commanders if NO regular units remain in territory
    if (remainingLosses > 0 && (regularUnitsInTerritory - regularUnitsKilled) <= 0) {
      console.log(`All regular units in territory eliminated - attacking commanders can now die`);
      
      const eliminatedCommanders: string[] = [];
      
      // Remove attacking commanders in priority order (worst die first)
      const commanderPriority = ['diplomat', 'land', 'naval', 'nuclear']; // Worst to best
      
      for (const commanderType of commanderPriority) {
        if (remainingLosses <= 0) break;
        
        // Only eliminate commanders that were actually attacking
        if (attackingCommanders.includes(commanderType)) {
          const commanderField = `${commanderType}Commander` as keyof Territory;
          if (territory[commanderField] === playerId) {
            delete territory[commanderField];
            remainingLosses--;
            eliminatedCommanders.push(commanderType);
            console.log(`Attacking ${commanderType} commander eliminated (no regular units left in territory)`);
          }
        }
      }
      
      console.log(`Commanders eliminated: [${eliminatedCommanders.join(', ')}]`);
    } else {
      console.log(`All attacking commanders protected - ${regularUnitsInTerritory - regularUnitsKilled} regular units remain in territory`);
    }
    
    if (remainingLosses > 0) {
      console.error(`ERROR: Could not apply all casualties! Remaining: ${remainingLosses}`);
      throw new Error(`Commander casualty validation failed: ${remainingLosses} losses could not be applied`);
    }
    
    console.log(`Territory-based commander protection worked correctly`);
  }

  // ================================
  // HELPER METHOD - GET PLAYER COMMANDERS IN TERRITORY
  // ================================

  static getPlayerCommandersInTerritory(territory: Territory, playerId: string): string[] {
    const commanders: string[] = [];
    
    if (territory.landCommander === playerId) commanders.push('land');
    if (territory.diplomatCommander === playerId) commanders.push('diplomat');
    if (territory.navalCommander === playerId) commanders.push('naval');
    if (territory.nuclearCommander === playerId) commanders.push('nuclear');
    
    return commanders;
  }

  // ================================
  // PHASE 2: CONFIRM CONQUEST (Move-in Selection) - ENHANCED WITH SAFETY
  // ================================

   static confirmConquest(gameState: GameState, action: GameAction): GameState {
    const { additionalUnits } = action.data;
    const playerId = action.playerId;
    
    console.log('CONFIRM_CONQUEST action:', {
      additionalUnits,
      playerId
    });

    const newState = { ...gameState };
    const pendingConquest = newState.pendingConquest;

    // Validation
    if (!pendingConquest || pendingConquest.playerId !== playerId) {
      throw new Error('No valid pending conquest found');
    }

    if (additionalUnits < 0) {
      throw new Error(`Invalid negative additional units: ${additionalUnits}`);
    }

    if (additionalUnits > pendingConquest.availableForAdditionalMoveIn) {
      throw new Error(`Cannot move ${additionalUnits} additional units, only ${pendingConquest.availableForAdditionalMoveIn} available`);
    }

    const fromTerritory = newState.territories[pendingConquest.fromTerritoryId];
    const toTerritory = newState.territories[pendingConquest.toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    if (!fromTerritory || !toTerritory || !player) {
      throw new Error('Invalid territories or player for conquest confirmation');
    }

    // Validate pre-conquest states
    this.validateTerritoryState(fromTerritory, 'pre-conquest confirmation - attacking territory');
    this.validateTerritoryState(toTerritory, 'pre-conquest confirmation - defending territory');

    // VALIDATION: Pre-conquest state logging
    console.log(`Pre-conquest validation:`);
    console.log(`- From territory: ${fromTerritory.name} (${fromTerritory.machineCount} units)`);
    console.log(`- To territory: ${toTerritory.name} (${toTerritory.machineCount} units, owner: ${toTerritory.ownerId})`);
    console.log(`- Minimum move-in: ${pendingConquest.minimumMoveIn}`);
    console.log(`- Additional units: ${additionalUnits}`);
    console.log(`- Attacking commanders: [${pendingConquest.attackingCommanders.join(', ')}]`);

    // ENHANCED VALIDATION: Ensure we can actually move the requested units
    const totalMoveIn = pendingConquest.minimumMoveIn + additionalUnits;
    const unitsAfterMoveOut = fromTerritory.machineCount - additionalUnits;
    
    if (unitsAfterMoveOut < 1) {
      throw new Error(`Cannot move ${additionalUnits} additional units - would leave ${unitsAfterMoveOut} units (must leave at least 1)`);
    }

    // Apply defender casualties first (SAFE)
    this.safeDeductUnits(toTerritory, pendingConquest.combatResult.defenderLosses, 'defender casualties in conquest');
    
    // Change ownership BEFORE setting unit count
    toTerritory.ownerId = playerId;
    
    // Then set new occupying force (SAFE)
    toTerritory.machineCount = totalMoveIn;
    console.log(`Territory ${toTerritory.name} now has ${totalMoveIn} occupying units`);

    // Move attacking commanders with validation
    this.moveCommandersAfterConquest(
      fromTerritory, 
      toTerritory, 
      pendingConquest.attackingCommanders, 
      pendingConquest.combatResult, 
      playerId
    );

    // Move additional units if requested (SAFE)
    if (additionalUnits > 0) {
      this.safeDeductUnits(fromTerritory, additionalUnits, 'additional move-in units');
      console.log(`Moved ${additionalUnits} additional units to ${toTerritory.name}`);
    }

    // Update player territories
    if (!player.territories.includes(pendingConquest.toTerritoryId)) {
      player.territories.push(pendingConquest.toTerritoryId);
    }

    // Remove from old owner
    if (pendingConquest.oldOwnerId) {
      const oldOwner = newState.players.find(p => p.id === pendingConquest.oldOwnerId);
      if (oldOwner) {
        oldOwner.territories = oldOwner.territories.filter(id => id !== pendingConquest.toTerritoryId);
      }
    }

    // CHECK FOR SCOUT FORCES TRIGGERS
    CardManager.checkScoutForcesConquest(newState, playerId, pendingConquest.toTerritoryId);

    // Update invasion stats
    if (pendingConquest.wasContested) {
      player.invasionStats!.contestedTerritoriesTaken++;
    } else {
      player.invasionStats!.emptyTerritoriesClaimed++;
    }

    // Check for conquest bonus (3+ contested territories)
    if (player.invasionStats!.contestedTerritoriesTaken >= 3 && !player.invasionStats!.conquestBonusEarned) {
      player.invasionStats!.conquestBonusEarned = true;
      player.energy += 3;
      console.log(`${player.name} earned conquest bonus! +3 energy`);
    }

    // Lock the conquered territory
    if (!player.invasionStats!.territoriesAttackedFrom.includes(pendingConquest.toTerritoryId)) {
      player.invasionStats!.territoriesAttackedFrom.push(pendingConquest.toTerritoryId);
      console.log(`Newly conquered territory ${pendingConquest.toTerritoryId} locked from attacking this turn`);
    }

    // Validate final states
    this.validateTerritoryState(fromTerritory, 'post-conquest confirmation - attacking territory');
    this.validateTerritoryState(toTerritory, 'post-conquest confirmation - defending territory');

    // VALIDATION: Post-conquest state verification
    console.log(`Post-conquest validation:`);
    console.log(`- From territory: ${fromTerritory.name} (${fromTerritory.machineCount} units remaining)`);
    console.log(`- To territory: ${toTerritory.name} (${toTerritory.machineCount} units, owner: ${toTerritory.ownerId})`);
    console.log(`- Territory ownership updated: ${toTerritory.ownerId === playerId ? 'YES' : 'NO'}`);

    console.log(`Conquest confirmed! ${toTerritory.name} conquered with ${toTerritory.machineCount} total units.`);

    // Clear pending conquest
    delete newState.pendingConquest;

    return newState;
  }

  static applyDefenderLosses(territory: Territory, losses: number): void {
    if (losses <= 0) return;

    // Validate before processing
    this.validateTerritoryState(territory, 'before applying defender losses');

    let remainingLosses = losses;
    
    // Calculate defending forces properly
    const defendingCommanders = this.getDefendingCommandersList(territory);
    const totalDefenders = territory.machineCount;
    const regularUnits = totalDefenders - defendingCommanders.length;
    
    console.log(`Applying ${losses} defender losses. Regular units: ${regularUnits}, Commanders: ${defendingCommanders.length}`);
    
    // RULE: Regular units die first
    const regularUnitsLost = Math.min(remainingLosses, regularUnits);
    remainingLosses -= regularUnitsLost;
    
    console.log(`${regularUnitsLost} regular units eliminated`);
    
    // RULE: Commanders only die if no regular units left to die
    if (remainingLosses > 0) {
      console.log(`${remainingLosses} commanders must die (no regular units left)`);
      
      // Priority: worst commanders die first  
      const commanderPriority = ['diplomat', 'land', 'naval', 'nuclear'];
      
      for (const commanderType of commanderPriority) {
        if (remainingLosses <= 0) break;
        
        const commanderField = `${commanderType}Commander` as keyof Territory;
        if (territory[commanderField] && remainingLosses > 0) {
          delete territory[commanderField];
          remainingLosses--;
          console.log(`Defending ${commanderType} commander eliminated`);
        }
      }
    }
    
    // FIXED: Only deduct units once - this function only handles commander elimination
    // Unit deduction should be handled by caller with safeDeductUnits()
    console.log(`Commander elimination complete. Territory unit count unchanged by this function.`);
    
    // Validate after processing
    this.validateTerritoryState(territory, 'after applying defender losses');
  }

  // ================================
  // AUTO-DEFENDER SELECTION
  // ================================

  static selectBestDefenders(territory: Territory, maxDefenders: number = 2): {
    regularUnits: number;
    commanders: number;
    selectedCommanders: string[];
  } {
    // Validate territory state
    this.validateTerritoryState(territory, 'auto-defender selection');

    const totalDefenders = territory.machineCount;
    const availableCommanders = this.getDefendingCommandersList(territory);
    const regularUnits = totalDefenders - availableCommanders.length;
    
    // SPACE BASE DETECTION: Enhanced logging
    const hasSpaceBase = !!territory.spaceBase;
    
    console.log(`Auto-selecting defenders: ${totalDefenders} total, ${regularUnits} regular, ${availableCommanders.length} commanders`);
    
    if (hasSpaceBase) {
      console.log(`SPACE BASE ADVANTAGE: All defenders get d8 dice!`);
    }
    
    // Priority order: best defenders first (space base > terrain commanders > regular commanders > units)
    const commanderPriority = ['nuclear', 'naval', 'land', 'diplomat']; // Best to worst
    const prioritizedCommanders: string[] = [];
    
    // Sort available commanders by priority (best first)
    for (const commanderType of commanderPriority) {
      if (availableCommanders.includes(commanderType)) {
        prioritizedCommanders.push(commanderType);
      }
    }
    
    let selectedRegularUnits = 0;
    let selectedCommanders = 0;
    let selectedCommanderTypes: string[] = [];
    
    // Selection strategy: pick best defenders up to maxDefenders
    let remainingSlots = Math.min(maxDefenders, totalDefenders);
    
    if (hasSpaceBase) {
      console.log(`Space base strategy: Regular units are now viable defenders (d8)`);
    }
    
    // PRIORITY 1: Always prefer commanders over regular units (they may have special abilities)
    for (const commanderType of prioritizedCommanders) {
      if (remainingSlots > 0) {
        selectedCommanderTypes.push(commanderType);
        selectedCommanders++;
        remainingSlots--;
        
        if (hasSpaceBase) {
          console.log(`Selected ${commanderType} commander (d8 with space base bonus)`);
        } else {
          console.log(`Selected ${commanderType} commander (priority defender)`);
        }
      }
    }
    
    // PRIORITY 2: Fill remaining slots with regular units
    if (remainingSlots > 0 && regularUnits > 0) {
      selectedRegularUnits = Math.min(remainingSlots, regularUnits);
      
      if (hasSpaceBase) {
        console.log(`Selected ${selectedRegularUnits} regular unit(s) (d8 with space base bonus)`);
      } else {
        console.log(`Selected ${selectedRegularUnits} regular unit(s) (d6)`);
      }
    }
    
    const diceAdvantage = hasSpaceBase ? " (ALL GET D8!)" : "";
    console.log(`Final selection: ${selectedRegularUnits} regular + ${selectedCommanders} commanders${diceAdvantage}`);
    
    return {
      regularUnits: selectedRegularUnits,
      commanders: selectedCommanders,
      selectedCommanders: selectedCommanderTypes
    };
  }

  // ================================
  // COMMANDER MOVEMENT - ENHANCED WITH SAFETY
  // ================================

  static moveCommandersAfterConquest(
    fromTerritory: Territory,
    toTerritory: Territory,
    attackingCommanderTypes: string[],
    combatResult: CombatResult,
    playerId: string
  ): void {
    console.log(`Moving attacking commanders after conquest...`);
    console.log(`Attacking commanders: [${attackingCommanderTypes.join(', ')}]`);
    console.log(`Combat losses: ${combatResult.attackerLosses} attackers lost`);
    
    // Validate territories
    this.validateTerritoryState(fromTerritory, 'commander movement - source territory');
    this.validateTerritoryState(toTerritory, 'commander movement - target territory');
    
    // VALIDATION: Calculate which commanders should have survived
    const totalAttackingUnits = attackingCommanderTypes.length + (combatResult.attackerUnitsRemaining + combatResult.attackerLosses - attackingCommanderTypes.length);
    const survivingAttackers = combatResult.attackerUnitsRemaining;
    
    console.log(`Total attacking units: ${totalAttackingUnits}, Survivors: ${survivingAttackers}`);
    
    // RULE: Attacking commanders MUST move in with conquering force (if they survived)
    let commandersMoved = 0;
    let commandersSurvived = 0;
    
    attackingCommanderTypes.forEach(commanderType => {
      const commanderField = `${commanderType}Commander` as keyof Territory;
      
      // VALIDATION: Check if commander still exists in source territory
      if (fromTerritory[commanderField] === playerId) {
        commandersSurvived++;
        
        // VALIDATION: Ensure commander moves to conquered territory
        if (toTerritory[commanderField]) {
          console.warn(`WARNING: ${commanderType} commander slot already occupied in target territory!`);
          console.warn(`Existing commander: ${toTerritory[commanderField]}, Incoming: ${playerId}`);
          
          // Override - attacking commander takes precedence
          console.log(`Overriding existing ${commanderType} commander in conquered territory`);
        }
        
        // Move commander to conquered territory
        delete fromTerritory[commanderField];
        (toTerritory as any)[commanderField] = playerId;
        commandersMoved++;
        
        console.log(`${commanderType} commander moved to conquered territory ${toTerritory.name}`);
      } else {
        // VALIDATION: Commander was eliminated during combat
        console.log(`${commanderType} commander was eliminated during combat - cannot move`);
      }
    });
    
    // VALIDATION: Verify commander movement consistency
    console.log(`Commander movement summary: ${commandersSurvived} survived, ${commandersMoved} moved`);
    
    if (commandersSurvived !== commandersMoved) {
      console.error(`VALIDATION ERROR: Commander movement inconsistency!`);
      console.error(`Expected ${commandersSurvived} commanders to move, but ${commandersMoved} actually moved`);
      throw new Error(`Commander movement validation failed: ${commandersSurvived} survived but ${commandersMoved} moved`);
    }
    
    // VALIDATION: Ensure survivors can actually move (enough surviving units)
    if (survivingAttackers < commandersSurvived) {
      console.error(`VALIDATION ERROR: Not enough surviving units for commanders!`);
      console.error(`Surviving attackers: ${survivingAttackers}, Commanders to move: ${commandersSurvived}`);
      throw new Error(`Invalid conquest: ${survivingAttackers} survivors cannot move ${commandersSurvived} commanders`);
    }
    
    console.log(`Commander survival validation passed: ${commandersMoved} commanders successfully moved`);
  }

  // ================================
  // COMBAT RESOLUTION
  // ================================

  static resolveCombatWithDice(
    fromTerritory: Territory,
    toTerritory: Territory,
    attackingUnits: number,
    commanderTypes: string[],
    attackerId: string,
    gameState: GameState
  ): CombatResult {
    // Validate territories before combat
    this.validateTerritoryState(fromTerritory, 'combat resolution - attacking territory');
    this.validateTerritoryState(toTerritory, 'combat resolution - defending territory');

    const attackingCommanders = commanderTypes.length;
    const attackingRegularUnits = attackingUnits - attackingCommanders;

    if (attackingRegularUnits < 0) {
      throw new Error(`Invalid attack: ${attackingUnits} total units cannot include ${attackingCommanders} commanders`);
    }

    const totalDefenders = toTerritory.machineCount;
    console.log(`Combat: ${attackingUnits} attackers vs ${totalDefenders} defenders`);

    // FIXED: Defenders can NEVER roll more than 2 dice
    const maxDefenderDice = Math.min(2, totalDefenders);

    // FIXED: Use auto-defender selection (prioritizes best defenders)
    const defenderSelection = this.selectBestDefenders(toTerritory, maxDefenderDice);

    const attackerDice = this.rollAttackerDice(
      attackingRegularUnits,
      attackingCommanders,
      commanderTypes,
      fromTerritory,
      toTerritory
    );

    // FIXED: Use selected defenders instead of backwards priority
    const defenderDice = this.rollDefenderDice(
      defenderSelection.regularUnits,
      defenderSelection.commanders,
      toTerritory
    );

    // CRITICAL FIX: Limit dice properly
    const finalAttackerDice = attackerDice.slice(0, Math.min(3, attackingUnits)).sort((a, b) => b - a);
    const finalDefenderDice = defenderDice.slice(0, maxDefenderDice).sort((a, b) => b - a);

    console.log(`Final dice - Attackers: [${finalAttackerDice.join(',')}], Defenders: [${finalDefenderDice.join(',')}]`);

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
  // HELPER METHODS
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

    // SPACE BASE DEFENSE BONUS: Check if territory has space base
    const hasSpaceBase = !!territory.spaceBase;
    
    if (hasSpaceBase) {
      console.log(`Space base defense bonus: All defenders get d8 in ${territory.name}`);
    }

    // Roll dice for regular units
    for (let i = 0; i < regularUnits; i++) {
      if (hasSpaceBase) {
        // SPACE BASE BONUS: Regular units get d8 instead of d6
        dice.push(Math.floor(Math.random() * 8) + 1);
      } else {
        // Normal d6 for regular units
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
    }

    // Roll dice for commanders
    for (let i = 0; i < commanders; i++) {
      if (hasSpaceBase) {
        // SPACE BASE BONUS: All commanders get d8 (overrides normal commander die type)
        dice.push(Math.floor(Math.random() * 8) + 1);
      } else {
        // Normal commander die type (could be d6 or d8 depending on commander/terrain)
        const dieType = this.getDefenderCommanderDieType(territory);
        if (dieType === 8) {
          dice.push(Math.floor(Math.random() * 8) + 1);
        } else {
          dice.push(Math.floor(Math.random() * 6) + 1);
        }
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
        console.log(`Attacker ${attackerDice[i]} beats Defender ${defenderDice[i]}`);
      } else {
        attackerLosses++;
        console.log(`Defender ${defenderDice[i]} beats/ties Attacker ${attackerDice[i]}`);
      }
    }

    console.log(`Combat result: Attacker loses ${attackerLosses}, Defender loses ${defenderLosses}`);
    return { attackerLosses, defenderLosses };
  }

  static getCommanderDieType(
    commanderType: string,
    fromTerritory: Territory,
    toTerritory: Territory,
    action: 'attack' | 'defend'
  ): number {
    // Naval commander gets d8 on water territories
    if (commanderType === 'naval' && toTerritory.type === 'water') {
      return 8;
    }
    
    // Naval commander gets d8 on coastal territories (connected to water)
    if (commanderType === 'naval' && toTerritory.type === 'land') {
      const isCoastal = this.isCoastalTerritory(toTerritory);
      if (isCoastal) {
        console.log(`Naval commander gets d8 on coastal territory: ${toTerritory.name}`);
        return 8;
      }
    }
    
    // Other commander bonuses
    if (commanderType === 'land' && toTerritory.type === 'land') return 8;
    if (commanderType === 'nuclear') return 8;
    if (commanderType === 'diplomat') return 6;
    
    return 6;
  }

  static getDefenderCommanderDieType(territory: Territory): number {
    // SPACE BASE OVERRIDE: If territory has space base, all defenders get d8
    if (territory.spaceBase) {
      console.log(`Space base override: All defenders get d8 in ${territory.name}`);
      return 8;
    }

    // Naval commander gets d8 defending water territories
    if (territory.type === 'water' && territory.navalCommander) {
      return 8;
    }
    
    // Naval commander gets d8 defending coastal territories
    if (territory.type === 'land' && territory.navalCommander) {
      const isCoastal = this.isCoastalTerritory(territory);
      if (isCoastal) {
        console.log(`Naval commander gets d8 defending coastal territory: ${territory.name}`);
        return 8;
      }
    }
    
    // Land commander gets d8 defending land territories
    if (territory.type === 'land' && territory.landCommander) {
      return 8;
    }
    
    // Nuclear commander always gets d8
    if (territory.nuclearCommander) {
      return 8;
    }
    
    // Default d6 for diplomat commander or no commander bonus
    return 6;
  }

  // ================================
  // COASTAL TERRITORY HELPER
  // ================================

  private static readonly COASTAL_TERRITORY_IDS = [2, 8, 12, 39, 30, 27, 24, 10, 3, 13, 28, 23, 41];

  static isCoastalTerritory(territory: Territory): boolean {
    // Only land territories can be coastal
    if (territory.type !== 'land') return false;
    
    // Convert territory ID to number for comparison
    const territoryId = parseInt(territory.id);
    
    // Fast lookup using static list
    const isCoastal = this.COASTAL_TERRITORY_IDS.includes(territoryId);
    
    if (isCoastal) {
      console.log(`Territory ${territory.name} (${territoryId}) is coastal - naval commander gets d8`);
    }
    
    return isCoastal;
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
  // ENHANCED ATTACK VALIDATION METHODS
  // ================================

  static canAttackFromTerritory(gameState: GameState, playerId: string, territoryId: string): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    const territory = gameState.territories[territoryId];
    
    if (!player || !territory) {
      console.log(`Cannot attack: Invalid player or territory`);
      return false;
    }
    
    if (territory.ownerId !== playerId) {
      console.log(`Cannot attack: Player ${playerId} does not own territory ${territoryId}`);
      return false;
    }
    
    // ENHANCED: Validate territory state
    try {
      this.validateTerritoryState(territory, 'attack validation');
    } catch (error) {
      console.log(`Cannot attack: Territory state invalid - ${error.message}`);
      return false;
    }
    
    if (territory.machineCount <= 1) {
      console.log(`Cannot attack: Territory ${territoryId} has ${territory.machineCount} units (must leave 1 behind)`);
      return false;
    }
    
    // Check if THIS territory was conquered this turn (can't attack from newly conquered territories)
    if (player.invasionStats?.territoriesAttackedFrom.includes(territoryId)) {
      console.log(`Spoking prevention: Territory ${territoryId} was conquered this turn - cannot attack from it`);
      return false;
    }
    
    console.log(`Can attack from territory ${territoryId} - spoking out allowed`);
    return true;
  }

  static canAttackTerritory(gameState: GameState, playerId: string, fromTerritoryId: string, toTerritoryId: string): boolean {
    const fromTerritory = gameState.territories[fromTerritoryId];
    const toTerritory = gameState.territories[toTerritoryId];
    
    if (!fromTerritory || !toTerritory) {
      console.log(`Cannot attack: Invalid territories`);
      return false;
    }

    // ENHANCED: Validate both territory states
    try {
      this.validateTerritoryState(fromTerritory, 'attack validation - source territory');
      this.validateTerritoryState(toTerritory, 'attack validation - target territory');
    } catch (error) {
      console.log(`Cannot attack: Territory state invalid - ${error.message}`);
      return false;
    }
    
    if (toTerritory.ownerId === playerId) {
      console.log(`Cannot attack: Cannot attack your own territory`);
      return false;
    }
    
    if (!fromTerritory.connections.includes(toTerritoryId)) {
      console.log(`Cannot attack: Territories not connected`);
      return false;
    }
    
    // Naval commander requirement for water territories
    if (toTerritory.type === 'water') {
      const hasNavalCommander = fromTerritory.navalCommander === playerId;
      if (!hasNavalCommander) {
        console.log(`Cannot attack: Naval commander required for water territories`);
        return false;
      }
    }
    
    // ANTI-MARAUDING: Use the enhanced canAttackFromTerritory check
    const canAttackFrom = this.canAttackFromTerritory(gameState, playerId, fromTerritoryId);
    if (!canAttackFrom) {
      console.log(`Cannot attack: Source territory ${fromTerritoryId} cannot attack (anti-marauding or other restrictions)`);
      return false;
    }
    
    console.log(`Can attack territory ${toTerritoryId} from ${fromTerritoryId}`);
    return true;
  }

  // ================================
  // ENHANCED MOVEMENT METHOD
  // ================================

  static moveIntoEmptyTerritory(gameState: GameState, action: GameAction): GameState {
    const { fromTerritoryId, toTerritoryId, movingUnits } = action.data;
    const playerId = action.playerId;
    
    const newState = { ...gameState };
    const fromTerritory = newState.territories[fromTerritoryId];
    const toTerritory = newState.territories[toTerritoryId];
    const player = newState.players.find(p => p.id === playerId);

    if (!fromTerritory || !toTerritory || !player) {
      throw new Error('Invalid territories or player for movement');
    }

    // Validate territory states
    this.validateTerritoryState(fromTerritory, 'empty territory movement - source');
    this.validateTerritoryState(toTerritory, 'empty territory movement - target');

    if (fromTerritory.ownerId !== playerId) {
      throw new Error('Player does not own source territory');
    }

    if (toTerritory.machineCount > 0) {
      throw new Error('Target territory is not empty');
    }

    if (movingUnits <= 0) {
      throw new Error(`Invalid moving units: ${movingUnits} (must be positive)`);
    }

    if (fromTerritory.machineCount <= movingUnits) {
      throw new Error(`Not enough units to move: ${fromTerritory.machineCount} available, ${movingUnits} requested (must leave 1 behind)`);
    }

    // ANTI-MARAUDING: Check if source territory can attack
    if (!this.canAttackFromTerritory(gameState, playerId, fromTerritoryId)) {
      throw new Error('Cannot move from this territory (anti-marauding protection or insufficient units)');
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

    // Apply movement (SAFE)
    this.safeDeductUnits(fromTerritory, movingUnits, 'empty territory movement');
    this.safeAddUnits(toTerritory, movingUnits, 'empty territory occupation');
    toTerritory.ownerId = playerId;

    if (!player.territories.includes(toTerritoryId)) {
      player.territories.push(toTerritoryId);
    }

    // 🆕 CHECK SCOUT FORCES BONUS
    CardManager.checkScoutForcesConquest(newState, playerId, toTerritoryId);

    player.invasionStats.emptyTerritoriesClaimed++;

    // WRONG LOGIC to lock source territory but keep in for player's game settings to change things in futurue
    // if (!player.invasionStats.territoriesAttackedFrom.includes(fromTerritoryId)) {
    //   player.invasionStats.territoriesAttackedFrom.push(fromTerritoryId);
    //   console.log(`Anti-marauding: Territory ${fromTerritoryId} locked from further attacks this turn`);
    // }

    // ANTI-MARAUDING: Lock newly claimed territory
    if (!player.invasionStats.territoriesAttackedFrom.includes(toTerritoryId)) {
      player.invasionStats.territoriesAttackedFrom.push(toTerritoryId);
      console.log(`Anti-marauding: Newly claimed territory ${toTerritoryId} locked from attacks this turn`);
    }

    // Validate final states
    this.validateTerritoryState(fromTerritory, 'post-movement source territory');
    this.validateTerritoryState(toTerritory, 'post-movement target territory');

    return newState;
  }

  // ================================
  // PHASE MANAGEMENT
  // ================================

  static startInvasionPhase(gameState: GameState, action: GameAction): GameState {
    const playerId = action.playerId;
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      throw new Error('Player not found for invasion phase start');
    }

    const newState = { ...gameState };
    const updatedPlayer = newState.players.find(p => p.id === playerId);

    if (updatedPlayer) {
      // RESET: Clear lockdown at start of each invasion phase
      updatedPlayer.invasionStats = {
        contestedTerritoriesTaken: 0,
        emptyTerritoriesClaimed: 0,
        conquestBonusEarned: false,
        territoriesAttackedFrom: [], // This clears all locks
        lastInvasionResults: []
      };
      
      console.log(`All territories unlocked for player ${playerId} - new invasion phase started`);
    }

    return newState;
  }

  // ================================
  // UTILITY METHODS
  // ================================

  static getAttackableTerritories(gameState: GameState, playerId: string): Territory[] {
    return Object.values(gameState.territories).filter(territory => {
      if (territory.ownerId !== playerId) return false;
      
      try {
        return this.canAttackFromTerritory(gameState, playerId, territory.id);
      } catch (error) {
        console.warn(`Territory ${territory.id} failed attack validation: ${error.message}`);
        return false;
      }
    });
  }

  static isTerritoryLockedFromAttacking(gameState: GameState, playerId: string, territoryId: string): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    return player?.invasionStats?.territoriesAttackedFrom.includes(territoryId) || false;
  }

  // ================================
  // GLOBAL STATE VALIDATION
  // ================================

  static validateGameState(gameState: GameState, context: string): void {
    console.log(`Validating game state: ${context}`);
    
    const errors: string[] = [];
    
    // Validate all territories
    Object.values(gameState.territories).forEach(territory => {
      try {
        this.validateTerritoryState(territory, `game state validation - ${territory.name}`);
      } catch (error) {
        errors.push(`Territory ${territory.name}: ${error.message}`);
      }
    });
    
    if (errors.length > 0) {
      console.error(`Game state validation failed in ${context}:`);
      errors.forEach(error => console.error(`- ${error}`));
      throw new Error(`Game state validation failed: ${errors.length} errors found`);
    }
    
    console.log(`Game state validation passed: ${context}`);
  }

  // ================================
  // LEGACY COMPATIBILITY
  // ================================

  static invadeTerritory(gameState: GameState, action: GameAction): GameState {
    // Legacy method - redirect to new two-phase system
    console.warn('invadeTerritory is deprecated - use resolveCombat instead');
    return this.resolveCombat(gameState, action);
  }
}