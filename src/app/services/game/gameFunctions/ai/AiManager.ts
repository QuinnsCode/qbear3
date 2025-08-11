// src/app/services/game/gameFunctions/ai/AiManager.ts
import type { GameState, Player, Territory, CommanderType, PurchaseStrategy } from '@/app/lib/GameState';
import { globalAIController } from '@/app/services/game/ADai';

export class AiManager {
  private aiTurnTimeouts = new Map<string, any>();
  private AI_TURN_SPEED_MS = 500;
  private AI_TURN_SPEED_LONGACTION_MS = 800;

  constructor(
    private applyAction: (action: any) => Promise<GameState>,
    private getGameState: () => GameState | null
  ) {}

  clearAllTimeouts(): void {
    this.aiTurnTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.aiTurnTimeouts.clear();
  }

  clearPlayerTimeout(playerId: string): void {
    if (this.aiTurnTimeouts.has(playerId)) {
      clearTimeout(this.aiTurnTimeouts.get(playerId));
      this.aiTurnTimeouts.delete(playerId);
    }
  }

  doAISetupAction(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    // ✅ CRITICAL SAFEGUARD: Don't run setup AI if no longer in setup
    if (gameState.status !== 'setup') {
      console.log(`🤖 SAFEGUARD: Attempted to run setup AI but game status is '${gameState.status}' - ABORTING`);
      return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    // ✅ FIXED: Clear any existing timeout for this player to prevent overlaps
    this.clearPlayerTimeout(currentPlayer.id);
    
    console.log(`🤖 AI Setup Action - Status: ${gameState.status}, Phase: ${gameState.setupPhase}, Player: ${currentPlayer.name}`);
    
    // ✅ FIXED: Actually execute the setup action based on phase
    switch (gameState.setupPhase) {
      case 'units':
        this.doAISetupUnits(currentPlayer);
        break;
      case 'land_commander':
        this.doAISetupCommander(currentPlayer, 'land');
        break;
      case 'diplomat_commander':
        this.doAISetupCommander(currentPlayer, 'diplomat');
        break;
      case 'space_base':
        this.doAISetupSpaceBase(currentPlayer);
        break;
    }
  }

  private doAISetupUnits(player: Player): void {
    const gameState = this.getGameState();
    if (!gameState) return;

    console.log(`🤖 AI ${player.name} placing units in setup phase`);
    
    // Place 3 units (setup requirement)
    let unitsPlaced = 0;
    const maxUnits = 3;
    
    const placeNextUnit = async () => {
      if (unitsPlaced >= maxUnits) return;
      
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'setup') return;
      
      // Pick random territory owned by this player
      const playerTerritories = player.territories.filter(tId => 
        currentGameState.territories[tId]?.ownerId === player.id
      );
      
      if (playerTerritories.length === 0) return;
      
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
      
      try {
        await this.applyAction({
          type: 'place_unit',
          playerId: player.id,
          data: { territoryId: randomTerritory, count: 1 }
        });
        
        unitsPlaced++;
        console.log(`🤖 AI placed unit ${unitsPlaced}/${maxUnits}`);
        
        if (unitsPlaced < maxUnits) {
          setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS);
        }
        
      } catch (error) {
        console.error('🤖 AI unit placement error:', error);
      }
    };
    
    setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS);
  }

  private doAISetupCommander(player: Player, commanderType: 'land' | 'diplomat'): void {
    const gameState = this.getGameState();
    if (!gameState) return;

    console.log(`🤖 AI ${player.name} placing ${commanderType} commander`);
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'setup') return;
      
      // Pick random territory owned by this player
      const playerTerritories = player.territories.filter(tId => 
        currentGameState.territories[tId]?.ownerId === player.id
      );
      
      if (playerTerritories.length === 0) return;
      
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
      
      try {
        await this.applyAction({
          type: 'place_commander',
          playerId: player.id,
          data: { territoryId: randomTerritory, commanderType }
        });
        
        console.log(`🤖 AI placed ${commanderType} commander`);
        
      } catch (error) {
        console.error(`🤖 AI ${commanderType} commander placement error:`, error);
      }
    }, this.AI_TURN_SPEED_MS);
  }

  private doAISetupSpaceBase(player: Player): void {
    const gameState = this.getGameState();
    if (!gameState) return;

    console.log(`🤖 AI ${player.name} placing space base`);
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'setup') return;
      
      // Pick random territory owned by this player
      const playerTerritories = player.territories.filter(tId => 
        currentGameState.territories[tId]?.ownerId === player.id
      );
      
      if (playerTerritories.length === 0) return;
      
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
      
      try {
        await this.applyAction({
          type: 'place_space_base',
          playerId: player.id,
          data: { territoryId: randomTerritory }
        });
        
        console.log(`🤖 AI placed space base`);
        
      } catch (error) {
        console.error('🤖 AI space base placement error:', error);
      }
    }, this.AI_TURN_SPEED_MS);
  }

  doAIMainGameAction(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Phase ${gameState.currentPhase} action`);
    
    switch (gameState.currentPhase) {
      case 1: this.doAICollectAndDeploy(); break;
      case 2: this.doAIBuildAndHire(); break;
      case 3: this.doAIBuyCards(); break;
      case 4: this.doAIPlayCards(); break;
      case 5: this.doAIInvade(); break;
      case 6: this.doAIFortify(); break;
    }
  }

  private doAICollectAndDeploy(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Collect & Deploy phase`);
    
    // ✅ Calculate fresh values for AI turn
    const energyIncome = this.calculateTurnIncome(currentPlayer, gameState);
    const unitsToPlace = this.calculateUnitsToPlace(currentPlayer, gameState);
    
    console.log(`🤖 AI ${currentPlayer.name} will collect ${energyIncome} energy and place ${unitsToPlace} units`);
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing') return;
      
      // ✅ STEP 1: Collect energy and set up deployment
      console.log(`🤖 AI collecting energy and starting deployment`);
      await this.applyAction({
        type: 'collect_energy',
        playerId: currentPlayer.id,
        data: { amount: energyIncome, unitsToPlace }
      });
      
      // ✅ STEP 2: Start unit placement sequence
      this.doAIUnitPlacement(currentPlayer.id, unitsToPlace);
      
    }, this.AI_TURN_SPEED_MS);
  }

  private calculateUnitsToPlace(player: Player, gameState: GameState): number {
    const baseUnits = this.calculateTurnIncome(player, gameState); // Same as energy income
    
    // ✅ Count space bases owned by this player
    const spaceBaseBonusUnits = player.territories.filter(tId => {
      const territory = gameState.territories[tId];
      return territory?.spaceBase === player.id;
    }).length;
    
    return baseUnits + spaceBaseBonusUnits;
  }

  private doAIUnitPlacement(playerId: string, totalUnitsToPlace: number): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !globalAIController.isAIPlayer(player.id)) return;
    
    const playerTerritories = player.territories.filter(tId => 
      gameState?.territories[tId]?.ownerId === player.id
    );
    
    if (playerTerritories.length === 0) {
      console.log(`🤖 ${player.name} has no territories to place units on`);
      return;
    }
    
    let unitsPlaced = 0;
    
    const placeNextUnit = async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing') {
        console.log(`🤖 Game state changed, stopping AI placement`);
        return;
      }
      
      if (unitsPlaced >= totalUnitsToPlace) {
        // ✅ All units placed - confirm deployment complete
        console.log(`🤖 AI ${player.name} completed unit placement, confirming deployment`);
        setTimeout(async () => {
          const finalGameState = this.getGameState();
          if (finalGameState?.status === 'playing') {
            await this.applyAction({
              type: 'advance_player_phase',
              playerId: player.id,
              data: { deploymentComplete: true }
            });
          }
        }, this.AI_TURN_SPEED_MS);
        return;
      }
      
      // ✅ Pick random territory to place unit on
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
      
      console.log(`🤖 AI placing unit ${unitsPlaced + 1}/${totalUnitsToPlace} on territory ${randomTerritory}`);
      
      try {
        await this.applyAction({
          type: 'place_unit',
          playerId: player.id,
          data: { territoryId: randomTerritory, count: 1 }
        });
        
        unitsPlaced++;
        
        // ✅ Continue to next unit after delay
        setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS);
        
      } catch (error) {
        console.error(`🤖 AI unit placement error:`, error);
      }
    };
    
    // ✅ Start placing units
    setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS);
  }

  private doAIBuildAndHire(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Build & Hire phase (${currentPlayer.energy} energy)`);
    
    // ✅ STEP 1: Calculate purchase strategy
    const strategy = this.calculateAIPurchaseStrategy(currentPlayer, gameState);
    
    console.log(`🤖 AI strategy:`, strategy);
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing') return;
      
      // ✅ STEP 2: Execute purchases in sequence
      this.executeAIPurchases(currentPlayer.id, strategy);
      
    }, this.AI_TURN_SPEED_MS);
  }

  private calculateAIPurchaseStrategy(player: Player, gameState: GameState): PurchaseStrategy {
    const availableEnergy = player.energy;
    const ownedCommanders = this.getOwnedCommanders(player, gameState.territories);
    const spaceBaseCount = this.getSpaceBaseCount(player, gameState.territories);
    
    const missingCommanders = (['land', 'diplomat', 'naval', 'nuclear'] as CommanderType[])
      .filter(cmd => !ownedCommanders.includes(cmd));
    
    let strategy: PurchaseStrategy = {
      commanders: [],
      spaceBases: 0,
      totalCost: 0,
      priority: 'mixed'
    };
    
    let remainingEnergy = availableEnergy;
    
    // AI Priority: Get 1-2 commanders first, then space bases
    const commandersToGet = Math.min(2, missingCommanders.length);
    
    for (let i = 0; i < commandersToGet && remainingEnergy >= 3; i++) {
      const commander = missingCommanders[i];
      strategy.commanders.push(commander);
      remainingEnergy -= 3;
      strategy.totalCost += 3;
    }
    
    // Then buy space bases with remaining energy (max 1-2)
    const maxSpaceBases = Math.min(2, Math.floor(remainingEnergy / 5));
    if (maxSpaceBases > 0 && spaceBaseCount < 2) {
      strategy.spaceBases = Math.min(maxSpaceBases, 2 - spaceBaseCount);
      strategy.totalCost += strategy.spaceBases * 5;
    }
    
    return strategy;
  }

  private executeAIPurchases(playerId: string, strategy: PurchaseStrategy): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !globalAIController.isAIPlayer(player.id)) return;
    
    let purchaseIndex = 0;
    const totalPurchases = strategy.commanders.length + strategy.spaceBases;
    
    if (totalPurchases === 0) {
      // No purchases - advance immediately
      console.log(`🤖 AI ${player.name} has nothing to buy - advancing phase`);
      setTimeout(() => this.completeAIBuildHire(playerId), this.AI_TURN_SPEED_MS);
      return;
    }
    
    const makeNextPurchase = async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing') {
        console.log(`🤖 Game state changed, stopping AI purchases`);
        return;
      }
      
      if (purchaseIndex >= totalPurchases) {
        // All purchases complete
        console.log(`🤖 AI ${player.name} completed all purchases`);
        setTimeout(() => this.completeAIBuildHire(playerId), this.AI_TURN_SPEED_MS);
        return;
      }
      
      try {
        if (purchaseIndex < strategy.commanders.length) {
          // Buy and place commander
          const commander = strategy.commanders[purchaseIndex];
          console.log(`🤖 AI purchasing commander ${purchaseIndex + 1}/${strategy.commanders.length}: ${commander}`);
          
          await this.applyAction({
            type: 'purchase_commander',
            playerId: player.id,
            data: { commanderType: commander, cost: 3 }
          });
          
          // Place it after a short delay
          setTimeout(async () => {
            await this.placeAIPurchasedCommander(playerId, commander);
            purchaseIndex++;
            // Continue to next purchase
            setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
          }, this.AI_TURN_SPEED_MS);
          
        } else {
          // Buy and place space base
          const spaceBaseIndex = purchaseIndex - strategy.commanders.length + 1;
          console.log(`🤖 AI purchasing space base ${spaceBaseIndex}/${strategy.spaceBases}`);
          
          await this.applyAction({
            type: 'purchase_space_base',
            playerId: player.id,
            data: { cost: 5 }
          });
          
          // Place it after a short delay
          setTimeout(async () => {
            await this.placeAIPurchasedSpaceBase(playerId);
            purchaseIndex++;
            // Continue to next purchase
            setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
          }, this.AI_TURN_SPEED_MS);
        }
        
      } catch (error) {
        console.error(`🤖 AI purchase error:`, error);
        // Skip this purchase and continue
        purchaseIndex++;
        setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
      }
    };
    
    // Start the purchase sequence
    setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
  }

  private async placeAIPurchasedCommander(playerId: string, commanderType: CommanderType): Promise<void> {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const availableTerritories = player.territories.filter(tId => {
      const territory = gameState?.territories[tId];
      return territory?.ownerId === playerId;
    });
    
    if (availableTerritories.length > 0) {
      const randomTerritory = availableTerritories[Math.floor(Math.random() * availableTerritories.length)];
      
      await this.applyAction({
        type: 'place_commander_game',
        playerId,
        data: { territoryId: randomTerritory, commanderType }
      });
      
      console.log(`🤖 AI placed ${commanderType} commander on ${randomTerritory}`);
    }
  }

  private async placeAIPurchasedSpaceBase(playerId: string): Promise<void> {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const availableTerritories = player.territories.filter(tId => {
      const territory = gameState?.territories[tId];
      return territory?.ownerId === playerId && !territory.spaceBase;
    });
    
    if (availableTerritories.length > 0) {
      const randomTerritory = availableTerritories[Math.floor(Math.random() * availableTerritories.length)];
      
      await this.applyAction({
        type: 'place_space_base_game',
        playerId,
        data: { territoryId: randomTerritory }
      });
      
      console.log(`🤖 AI placed space base on ${randomTerritory}`);
    }
  }

  private completeAIBuildHire(playerId: string): void {
    setTimeout(async () => {
      const gameState = this.getGameState();
      if (gameState && gameState.status === 'playing' && gameState.currentPhase === 2) {
        console.log(`🤖 AI completing Build & Hire phase`);
        await this.applyAction({
          type: 'advance_player_phase',
          playerId,
          data: { phaseComplete: true }
        });
      }
    }, this.AI_TURN_SPEED_MS);
  }

  private getOwnedCommanders(player: Player, territories: Record<string, Territory>): CommanderType[] {
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

  private getSpaceBaseCount(player: Player, territories: Record<string, Territory>): number {
    return player.territories.filter(tId => 
      territories[tId]?.spaceBase === player.id
    ).length;
  }

  private doAIBuyCards(): void {
    setTimeout(async () => {
      const gameState = this.getGameState();
      if (gameState) {
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: gameState.players[gameState.currentPlayerIndex].id,
          data: {}
        });
      }
    }, this.AI_TURN_SPEED_MS);
  }

  private doAIPlayCards(): void {
    setTimeout(async () => {
      const gameState = this.getGameState();
      if (gameState) {
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: gameState.players[gameState.currentPlayerIndex].id,
          data: {}
        });
      }
    }, this.AI_TURN_SPEED_MS);
  }

  private doAIInvade(): void {
    setTimeout(async () => {
      const gameState = this.getGameState();
      if (gameState) {
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: gameState.players[gameState.currentPlayerIndex].id,
          data: {}
        });
      }
    }, this.AI_TURN_SPEED_MS);
  }

  private doAIFortify(): void {
    setTimeout(async () => {
      const gameState = this.getGameState();
      if (gameState) {
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: gameState.players[gameState.currentPlayerIndex].id,
          data: {}
        });
      }
    }, this.AI_TURN_SPEED_MS);
  }

  doAIBiddingAction(playerId: string): void {
    console.log(`🤖 doAIBiddingAction called for player: ${playerId}`);
    
    const gameState = this.getGameState();
    if (!gameState) {
      console.log(`🤖 ABORT: No game state`);
      return;
    }
    
    // ✅ CRITICAL SAFEGUARD: Don't run bidding AI if no longer in bidding
    if (gameState.status !== 'bidding') {
      console.log(`🤖 SAFEGUARD: Attempted to run bidding AI but game status is '${gameState.status}' - ABORTING`);
      return;
    }
    
    // Find the specific player by ID instead of using currentPlayerIndex
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.log(`🤖 SAFEGUARD: Player ${playerId} not found - ABORTING`);
      return;
    }
    
    if (!globalAIController.isAIPlayer(player.id)) {
      console.log(`🤖 SAFEGUARD: Player ${playerId} is not an AI player - ABORTING`);
      return;
    }

    // Check if player has already bid
    if (gameState.bidding?.bidsSubmitted[playerId] !== undefined) {
      console.log(`🤖 SAFEGUARD: Player ${player.name} has already bid - ABORTING`);
      return;
    }

    // Check if player is still in waiting list
    if (!gameState.bidding?.playersWaitingToBid?.includes(playerId)) {
      console.log(`🤖 SAFEGUARD: Player ${player.name} is not in waiting list - ABORTING`);
      return;
    }
    
    // ✅ FIXED: Clear any existing timeout for this player to prevent overlaps
    this.clearPlayerTimeout(player.id);
    
    console.log(`🤖 AI Bidding Action - Status: ${gameState.status}, Year: ${gameState.bidding?.year}, Player: ${player.name}`);
    console.log(`🤖 Player energy: ${player.energy}, Already bid: ${gameState.bidding?.bidsSubmitted[playerId] || 'none'}`);
    
    // Simple AI bidding strategy: 20-40% of available energy
    const minBidPercent = 0.20;
    const maxBidPercent = 0.40;
    const randomPercent = minBidPercent + (Math.random() * (maxBidPercent - minBidPercent));
    const bidAmount = Math.floor(player.energy * randomPercent);
    
    console.log(`🤖 AI ${player.name} calculating bid: ${bidAmount} energy (${Math.round(randomPercent * 100)}% of ${player.energy})`);
    
    // Add immediate validation before timeout
    if (bidAmount > player.energy) {
      console.log(`🤖 ERROR: Bid amount ${bidAmount} exceeds player energy ${player.energy}`);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      console.log(`🤖 AI ${player.name} attempting to place bid...`);
      
      // Double-check state before placing bid
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'bidding') {
        console.log(`🤖 TIMEOUT ABORT: Game state changed`);
        return;
      }

      // Check if player still needs to bid
      if (currentGameState.bidding?.bidsSubmitted[playerId] !== undefined) {
        console.log(`🤖 TIMEOUT ABORT: Player already bid`);
        return;
      }
      
      try {
        await this.applyAction({
          type: 'place_bid',
          playerId: player.id,
          data: { bidAmount }
        });
        
        console.log(`✅ AI ${player.name} successfully placed bid: ${bidAmount}`);
        
      } catch (error) {
        console.error(`❌ AI bidding error for ${player.name}:`, error);
      }
      
    }, this.AI_TURN_SPEED_MS);
    
    this.aiTurnTimeouts.set(player.id, timeoutId);
  }

  checkAndTriggerAIBidding(): void {
    const gameState = this.getGameState();
    if (!gameState || gameState.status !== 'bidding') return;

    console.log(`🔍 Checking AI bidding state...`);
    console.log(`📊 Bidding state:`, {
      year: gameState.bidding?.year,
      playersWaitingToBid: gameState.bidding?.playersWaitingToBid,
      bidsSubmitted: gameState.bidding?.bidsSubmitted,
      bidsRevealed: gameState.bidding?.bidsRevealed
    });

    if (!gameState.bidding || gameState.bidding.bidsRevealed) {
      console.log(`🤖 Bidding already revealed or no bidding state - skipping AI`);
      return;
    }

    // Find AI players who haven't bid yet
    const waitingToBid = gameState.bidding.playersWaitingToBid || [];
    const aiPlayersNeedingToBid = waitingToBid.filter(playerId => 
      globalAIController.isAIPlayer(playerId)
    );

    console.log(`🤖 AI players needing to bid:`, aiPlayersNeedingToBid.map(id => 
      gameState?.players.find(p => p.id === id)?.name
    ));

    if (aiPlayersNeedingToBid.length === 0) {
      console.log(`🤖 No AI players need to bid`);
      return;
    }

    // Clear any existing AI timeouts to prevent conflicts
    aiPlayersNeedingToBid.forEach(playerId => {
      this.clearPlayerTimeout(playerId);
    });

    // Schedule immediate bidding for all AI players
    aiPlayersNeedingToBid.forEach((playerId, index) => {
      const player = gameState?.players.find(p => p.id === playerId);
      if (player) {
        console.log(`🤖 Scheduling AI bid for ${player.name} (delay: ${200 + index * 100}ms)`);
        
        const timeoutId = setTimeout(() => {
          this.doAIBiddingAction(playerId);
        }, 200 + (index * 100)); // Stagger slightly to avoid conflicts
        
        this.aiTurnTimeouts.set(playerId, timeoutId);
      }
    });
  }

  scheduleAISetupAction(playerId: string): void {
    const timeoutId = setTimeout(() => {
      this.doAISetupAction();
    }, this.AI_TURN_SPEED_MS);
    
    this.aiTurnTimeouts.set(playerId, timeoutId);
  }

  scheduleAIMainGameAction(playerId: string): void {
    const timeoutId = setTimeout(() => {
      this.doAIMainGameAction();
    }, this.AI_TURN_SPEED_MS);
    
    this.aiTurnTimeouts.set(playerId, timeoutId);
  }

  private calculateTurnIncome(player: Player, gameState: GameState): number {
    const baseIncome = 3; // Minimum
    const territoryIncome = Math.floor(player.territories.length / 3); // 1 per 3 territories
    
    // ✅ ADD: Continental bonuses (expand based on your continent logic)
    let continentalBonus = 0;
    // TODO: Add your continent control logic here
    
    return Math.max(baseIncome, territoryIncome + continentalBonus);
  }
}