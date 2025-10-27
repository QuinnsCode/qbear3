// src/app/services/game/gameFunctions/ai/AiManager.ts - CLEANED VERSION
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
    
    if (gameState.status !== 'setup') {
      console.log(`🤖 SAFEGUARD: Attempted to run setup AI but game status is '${gameState.status}' - ABORTING`);
      return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    this.clearPlayerTimeout(currentPlayer.id);
    
    console.log(`🤖 AI Setup Action - Status: ${gameState.status}, Phase: ${gameState.setupPhase}, Player: ${currentPlayer.name}`);
    
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
    
    let unitsPlaced = 0;
    const maxUnits = 3;
    
    const placeNextUnit = async () => {
      if (unitsPlaced >= maxUnits) return;
      
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'setup') return;
      
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
    
    const energyIncome = this.calculateTurnIncome(currentPlayer, gameState);
    const unitsToPlace = this.calculateUnitsToPlace(currentPlayer, gameState);
    
    console.log(`🤖 AI ${currentPlayer.name} will collect ${energyIncome} energy and place ${unitsToPlace} units`);
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing') return;
      
      if (currentGameState.currentPhase !== 1) {
        console.log(`🤖 ❌ Not in phase 1 anymore (phase ${currentGameState.currentPhase}), aborting collect & deploy`);
        return;
      }
      
      console.log(`🤖 AI collecting energy and starting deployment`);
      await this.applyAction({
        type: 'collect_energy',
        playerId: currentPlayer.id,
        data: { amount: energyIncome, unitsToPlace }
      });
      
      this.doAIUnitPlacement(currentPlayer.id, unitsToPlace);
      
    }, this.AI_TURN_SPEED_MS);
  }

  private calculateUnitsToPlace(player: Player, gameState: GameState): number {
    const baseUnits = this.calculateTurnIncome(player, gameState);
    
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
    
    console.log(`🤖 🔢 AI UNIT PLACEMENT START: ${player.name} placing ${totalUnitsToPlace} units`);
    
    let unitsPlaced = 0;
    
    const placeNextUnit = async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing') {
        console.log(`🤖 ❌ Game state changed during placement, stopping`);
        return;
      }
      
      if (currentGameState.currentPhase !== 1) {
        console.log(`🤖 ❌ Phase changed during placement (now ${currentGameState.currentPhase}), stopping`);
        return;
      }
      
      if (unitsPlaced >= totalUnitsToPlace) {
        console.log(`🤖 ✅ ALL UNITS PLACED (${unitsPlaced}/${totalUnitsToPlace})`);
        console.log(`🤖 📤 Advancing to next phase...`);
        
        setTimeout(async () => {
          const finalGameState = this.getGameState();
          console.log(`🤖 🔍 Pre-advance state check:`, {
            status: finalGameState?.status,
            phase: finalGameState?.currentPhase,
            player: finalGameState?.players[finalGameState?.currentPlayerIndex]?.name
          });
          
          if (finalGameState?.status === 'playing' && finalGameState?.currentPhase === 1) {
            try {
              console.log(`🤖 📨 SENDING: advance_player_phase for phase completion`);
              
              await this.applyAction({
                type: 'advance_player_phase',
                playerId: player.id,
                data: { deploymentComplete: true, phaseComplete: true }
              });
              
              console.log(`🤖 ✅ advance_player_phase action sent successfully`);
              
            } catch (error) {
              console.error(`🤖 ❌ ERROR sending advance_player_phase:`, error);
            }
          } else {
            console.log(`🤖 ❌ Game state invalid for advance:`, {
              status: finalGameState?.status,
              phase: finalGameState?.currentPhase
            });
          }
        }, this.AI_TURN_SPEED_MS);
        return;
      }
      
      const playerTerritories = player.territories.filter(tId => 
        currentGameState?.territories[tId]?.ownerId === player.id
      );
      
      if (playerTerritories.length === 0) {
        console.log(`🤖 ❌ No territories available for unit placement`);
        return;
      }
      
      const randomTerritory = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
      
      console.log(`🤖 📍 Placing unit ${unitsPlaced + 1}/${totalUnitsToPlace} on ${randomTerritory}`);
      
      try {
        await this.applyAction({
          type: 'place_unit',
          playerId: player.id,
          data: { territoryId: randomTerritory, count: 1 }
        });
        
        unitsPlaced++;
        console.log(`🤖 ✅ Unit placed successfully (${unitsPlaced}/${totalUnitsToPlace})`);
        
        setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS);
        
      } catch (error) {
        console.error(`🤖 ❌ ERROR placing unit:`, error);
      }
    };
    
    setTimeout(placeNextUnit, this.AI_TURN_SPEED_MS);
  }

  private doAIBuildAndHire(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Build & Hire phase (${currentPlayer.energy} energy)`);
    
    if (gameState.currentPhase !== 2) {
      console.log(`🤖 ❌ Not in phase 2 anymore (phase ${gameState.currentPhase}), aborting build & hire`);
      return;
    }
    
    const strategy = this.calculateAIPurchaseStrategy(currentPlayer, gameState);
    
    console.log(`🤖 AI strategy:`, strategy);
    
    if (strategy.totalCost === 0) {
      console.log(`🤖 AI ${currentPlayer.name} has nothing to buy - advancing phase`);
      setTimeout(() => this.completeAIBuildHire(currentPlayer.id), this.AI_TURN_SPEED_MS);
      return;
    }
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing' || currentGameState.currentPhase !== 2) {
        console.log(`🤖 ❌ Game state invalid for build & hire`);
        return;
      }
      
      this.executeAIPurchases(currentPlayer.id, strategy);
      
    }, this.AI_TURN_SPEED_MS);
  }

  // ✅ SINGLE VERSION: Build & Hire completion
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

  private calculateAIPurchaseStrategy(player: Player, gameState: GameState): PurchaseStrategy {
    const availableEnergy = player.energy;
    const ownedCommanders = this.getOwnedCommanders(player, gameState.territories);
    
    console.log(`🤖 AI ${player.name} analyzing situation:`, {
      energy: availableEnergy,
      ownedCommanders,
      startingCommanders: ['land', 'diplomat']
    });
    
    const missingCommanders = (['naval', 'nuclear'] as CommanderType[])
      .filter(cmd => !ownedCommanders.includes(cmd));
    
    console.log(`🤖 Missing commanders available for purchase:`, missingCommanders);
    
    const threatAnalysis = this.analyzeStrategicThreats(player, gameState);
    console.log(`🤖 Threat analysis:`, threatAnalysis);
    
    let strategy: PurchaseStrategy = {
      commanders: [],
      spaceBases: 0,
      totalCost: 0,
      priority: 'mixed'
    };
    
    let remainingEnergy = availableEnergy;
    
    if (missingCommanders.includes('naval') && remainingEnergy >= 3) {
      if (threatAnalysis.shouldGetNaval) {
        strategy.commanders.push('naval');
        remainingEnergy -= 3;
        strategy.totalCost += 3;
        console.log(`🤖 Priority: Getting naval commander (water threat detected)`);
      }
    }
    
    if (missingCommanders.includes('nuclear') && remainingEnergy >= 3) {
      if (threatAnalysis.shouldGetNuclear) {
        strategy.commanders.push('nuclear');
        remainingEnergy -= 3;
        strategy.totalCost += 3;
        console.log(`🤖 Priority: Getting nuclear commander (offensive/defensive needs)`);
      }
    }
    
    if (remainingEnergy >= 3 && strategy.commanders.length === 0) {
      if (missingCommanders.length > 0) {
        const fallbackCommander = missingCommanders[0];
        strategy.commanders.push(fallbackCommander);
        remainingEnergy -= 3;
        strategy.totalCost += 3;
        console.log(`🤖 Fallback: Getting ${fallbackCommander} commander for future flexibility`);
      }
    }
    
    const shouldSaveForCards = remainingEnergy >= 2 && remainingEnergy <= 5;
    if (shouldSaveForCards) {
      console.log(`🤖 Saving ${remainingEnergy} energy for card purchases next phase`);
    }
    
    console.log(`🤖 Final strategy: ${strategy.commanders.join(', ')} (${strategy.totalCost} energy spent, ${remainingEnergy} saved)`);
    
    return strategy;
  }

  private analyzeStrategicThreats(player: Player, gameState: GameState): {
    shouldGetNaval: boolean;
    shouldGetNuclear: boolean;
    waterTerritoryThreat: boolean;
    enemyNavalCommanders: number;
    enemyNuclearCommanders: number;
    reasoning: string[];
  } {
    const threats = {
      shouldGetNaval: false,
      shouldGetNuclear: false,
      waterTerritoryThreat: false,
      enemyNavalCommanders: 0,
      enemyNuclearCommanders: 0,
      reasoning: [] as string[]
    };
    
    gameState.players.forEach(otherPlayer => {
      if (otherPlayer.id === player.id) return;
      
      const enemyCommanders = this.getOwnedCommanders(otherPlayer, gameState.territories);
      if (enemyCommanders.includes('naval')) {
        threats.enemyNavalCommanders++;
      }
      if (enemyCommanders.includes('nuclear')) {
        threats.enemyNuclearCommanders++;
      }
    });
    
    const nearbyWaterTerritories = this.findNearbyWaterTerritories(player, gameState);
    threats.waterTerritoryThreat = nearbyWaterTerritories.length > 0;
    
    if (threats.enemyNavalCommanders > 0) {
      threats.shouldGetNaval = true;
      threats.reasoning.push(`Enemy has ${threats.enemyNavalCommanders} naval commander(s) - need naval to compete for water`);
    } else if (threats.waterTerritoryThreat && nearbyWaterTerritories.length >= 2) {
      threats.shouldGetNaval = true;
      threats.reasoning.push(`${nearbyWaterTerritories.length} water territories nearby - get naval for expansion`);
    }
    
    if (threats.enemyNavalCommanders > 0 && !threats.shouldGetNaval) {
      threats.shouldGetNuclear = true;
      threats.reasoning.push(`Enemy has naval control - get nuclear to counter with nuke cards`);
    } else if (threats.enemyNuclearCommanders > 0) {
      threats.shouldGetNuclear = true;
      threats.reasoning.push(`Nuclear arms race - match enemy nuclear capability`);
    } else if (player.territories.length >= 8) {
      threats.shouldGetNuclear = true;
      threats.reasoning.push(`Strong position (${player.territories.length} territories) - get nuclear for offense`);
    }
    
    return threats;
  }

  private findNearbyWaterTerritories(player: Player, gameState: GameState): string[] {
    const waterTerritories: string[] = [];
    
    player.territories.forEach(territoryId => {
      const territory = gameState.territories[territoryId];
      if (!territory) return;
      
      territory.connections.forEach(connectedId => {
        const connectedTerritory = gameState.territories[connectedId];
        if (!connectedTerritory) return;
        
        if (connectedTerritory.type === 'water' && !waterTerritories.includes(connectedId)) {
          waterTerritories.push(connectedId);
        }
      });
    });
    
    return waterTerritories;
  }

  private canPlaceCommanderOnTerritory(territory: Territory, commanderType: CommanderType): boolean {
    switch (commanderType) {
      case 'land':
        return !territory.landCommander;
      case 'diplomat':
        return !territory.diplomatCommander;
      case 'naval':
        return !territory.navalCommander;
      case 'nuclear':
        return !territory.nuclearCommander;
      default:
        return false;
    }
  }

  private executeAIPurchases(playerId: string, strategy: PurchaseStrategy): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !globalAIController.isAIPlayer(player.id)) return;
    
    let purchaseIndex = 0;
    const totalPurchases = strategy.commanders.length + strategy.spaceBases;
    
    console.log(`🤖 AI ${player.name} starting ${totalPurchases} purchases`);
    
    const makeNextPurchase = async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing' || currentGameState.currentPhase !== 2) {
        console.log(`🤖 Game state changed, stopping AI purchases`);
        return;
      }
      
      if (purchaseIndex >= totalPurchases) {
        console.log(`🤖 AI ${player.name} completed all purchases`);
        setTimeout(() => this.completeAIBuildHire(playerId), this.AI_TURN_SPEED_MS);
        return;
      }
      
      try {
        if (purchaseIndex < strategy.commanders.length) {
          const commander = strategy.commanders[purchaseIndex];
          console.log(`🤖 AI purchasing and placing commander: ${commander}`);
          
          const availableTerritories = player.territories.filter(tId => {
            const territory = currentGameState?.territories[tId];
            return territory?.ownerId === playerId && this.canPlaceCommanderOnTerritory(territory, commander);
          });
          
          if (availableTerritories.length === 0) {
            console.log(`🤖 No available territories for ${commander} commander - skipping`);
            purchaseIndex++;
            setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
            return;
          }
          
          const randomTerritory = availableTerritories[Math.floor(Math.random() * availableTerritories.length)];
          
          await this.applyAction({
            type: 'purchase_and_place_commander',
            playerId: playerId,
            data: { 
              territoryId: randomTerritory, 
              commanderType: commander, 
              cost: 3 
            }
          });
          
          console.log(`🤖 AI placed ${commander} commander on ${randomTerritory}`);
          
        } else {
          const availableTerritories = player.territories.filter(tId => {
            const territory = currentGameState?.territories[tId];
            return territory?.ownerId === playerId && !territory.spaceBase;
          });
          
          if (availableTerritories.length === 0) {
            console.log(`🤖 No territories for space base - skipping`);
            purchaseIndex++;
            setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
            return;
          }
          
          const randomTerritory = availableTerritories[0];
          
          await this.applyAction({
            type: 'purchase_and_place_space_base',
            playerId: playerId,
            data: { 
              territoryId: randomTerritory, 
              cost: 5 
            }
          });
        }
        
        purchaseIndex++;
        setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
        
      } catch (error) {
        console.error(`🤖 Purchase error:`, error);
        purchaseIndex++;
        setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
      }
    };
    
    setTimeout(makeNextPurchase, this.AI_TURN_SPEED_MS);
  }

  // ✅ SINGLE VERSION: Buy Cards phase
  private doAIBuyCards(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Buy Cards phase (${currentPlayer.energy} energy)`);
    
    if (gameState.currentPhase !== 3) {
      console.log(`🤖 ❌ Not in phase 3 anymore (phase ${gameState.currentPhase}), aborting buy cards`);
      return;
    }
    
    setTimeout(async () => {
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'playing' || currentGameState.currentPhase !== 3) {
        console.log(`🤖 ❌ Game state invalid for buy cards`);
        return;
      }
      
      const cardStrategy = this.calculateAICardStrategy(currentPlayer, currentGameState);
      
      console.log(`🤖 AI card strategy:`, cardStrategy);
      
      if (cardStrategy.selectedCards.length === 0) {
        console.log(`🤖 AI ${currentPlayer.name} has no cards to buy - advancing phase`);
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: currentPlayer.id,
          data: { phaseComplete: true }
        });
        return;
      }
      
      try {
        await this.applyAction({
          type: 'purchase_cards',
          playerId: currentPlayer.id,
          data: { selectedCards: cardStrategy.selectedCards }
        });
        
        console.log(`🤖 AI purchased ${cardStrategy.selectedCards.length} card(s)`);
        
        setTimeout(async () => {
          const finalGameState = this.getGameState();
          if (finalGameState?.status === 'playing' && finalGameState?.currentPhase === 3) {
            await this.applyAction({
              type: 'advance_player_phase',
              playerId: currentPlayer.id,
              data: { phaseComplete: true }
            });
          }
        }, this.AI_TURN_SPEED_MS);
        
      } catch (error) {
        console.error(`🤖 AI card purchase error:`, error);
        
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: currentPlayer.id,
          data: { phaseComplete: true }
        });
      }
      
    }, this.AI_TURN_SPEED_MS);
  }

  private calculateAICardStrategy(player: Player, gameState: GameState): {
    selectedCards: Array<{ card: any; quantity: number }>;
    totalCost: number;
    reasoning: string[];
  } {
    const availableEnergy = player.energy;
    const ownedCommanders = this.getOwnedCommanders(player, gameState.territories);
    
    console.log(`🤖 AI ${player.name} card buying analysis:`, {
      energy: availableEnergy,
      ownedCommanders
    });
    
    const strategy = {
      selectedCards: [] as Array<{ card: any; quantity: number }>,
      totalCost: 0,
      reasoning: [] as string[]
    };
    
    if (availableEnergy >= 2) {
      const mockCard = {
        cardTitle: "AI Strategic Card",
        cardCost: 2,
        commanderType: ownedCommanders[0] || 'land',
        cardText: "AI-selected strategic advantage"
      };
      
      strategy.selectedCards.push({ card: mockCard, quantity: 1 });
      strategy.totalCost += 2;
      strategy.reasoning.push(`Purchased strategic card for ${mockCard.commanderType} commander`);
    }
    
    if (availableEnergy >= 4 && ownedCommanders.length > 1) {
      const mockCard2 = {
        cardTitle: "AI Backup Card",
        cardCost: 2,
        commanderType: ownedCommanders[1] || 'diplomat',
        cardText: "AI-selected backup strategy"
      };
      
      strategy.selectedCards.push({ card: mockCard2, quantity: 1 });
      strategy.totalCost += 2;
      strategy.reasoning.push(`Purchased backup card for ${mockCard2.commanderType} commander`);
    }
    
    if (strategy.selectedCards.length === 0) {
      strategy.reasoning.push(`Not enough energy (${availableEnergy}) or no owned commanders for card purchases`);
    }
    
    console.log(`🤖 AI card strategy reasoning:`, strategy.reasoning);
    return strategy;
  }

  private doAIPlayCards(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Play Cards phase`);
    
    if (gameState.currentPhase !== 4) {
      console.log(`🤖 ❌ Not in phase 4 anymore (phase ${gameState.currentPhase}), aborting play cards`);
      return;
    }
    
    setTimeout(async () => {
      const gameState = this.getGameState();
      if (gameState && gameState.status === 'playing' && gameState.currentPhase === 4) {
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: gameState.players[gameState.currentPlayerIndex].id,
          data: { phaseComplete: true }
        });
      }
    }, this.AI_TURN_SPEED_MS);
  }

  private doAIInvade(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Invade phase`);
    
    if (gameState.currentPhase !== 5) {
      console.log(`🤖 ❌ Not in phase 5 anymore (phase ${gameState.currentPhase}), aborting invade`);
      return;
    }
    
    // 🔧 FIX: Store the AI player ID to validate later
    const aiPlayerId = currentPlayer.id;
    
    setTimeout(async () => {
      const gameState = this.getGameState();
      
      // 🔧 FIX: Verify it's STILL the AI's turn before advancing
      if (!gameState) {
        console.log(`🤖 ❌ TIMEOUT ABORT: No game state`);
        return;
      }
      
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      
      // 🔧 FIX: Check if current player is still the AI
      if (!currentPlayer || currentPlayer.id !== aiPlayerId) {
        console.log(`🤖 ❌ TIMEOUT ABORT: Turn changed - was ${aiPlayerId}, now ${currentPlayer?.id}`);
        return;
      }
      
      // 🔧 FIX: Verify it's still an AI player
      if (!globalAIController.isAIPlayer(currentPlayer.id)) {
        console.log(`🤖 ❌ TIMEOUT ABORT: Current player is not AI`);
        return;
      }
      
      if (gameState.status === 'playing' && gameState.currentPhase === 5) {
        console.log(`🤖 ✅ AI ${currentPlayer.name} advancing from phase 5 to phase 6`);
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: currentPlayer.id,
          data: { phaseComplete: true }
        });
      } else {
        console.log(`🤖 ❌ TIMEOUT ABORT: Game state changed - status: ${gameState.status}, phase: ${gameState.currentPhase}`);
      }
    }, this.AI_TURN_SPEED_MS);
  }

  // 🔧 FIXED: Added AI turn validation
  private doAIFortify(): void {
    const gameState = this.getGameState();
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !globalAIController.isAIPlayer(currentPlayer.id)) return;
    
    console.log(`🤖 AI ${currentPlayer.name} doing Fortify phase`);
    
    if (gameState.currentPhase !== 6) {
      console.log(`🤖 ❌ Not in phase 6 anymore (phase ${gameState.currentPhase}), aborting fortify`);
      return;
    }
    
    // 🔧 FIX: Store the AI player ID to validate later
    const aiPlayerId = currentPlayer.id;
    
    setTimeout(async () => {
      const gameState = this.getGameState();
      
      // 🔧 FIX: Verify it's STILL the AI's turn before advancing
      if (!gameState) {
        console.log(`🤖 ❌ TIMEOUT ABORT: No game state`);
        return;
      }
      
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      
      // 🔧 FIX: Check if current player is still the AI
      if (!currentPlayer || currentPlayer.id !== aiPlayerId) {
        console.log(`🤖 ❌ TIMEOUT ABORT: Turn changed - was ${aiPlayerId}, now ${currentPlayer?.id}`);
        return;
      }
      
      // 🔧 FIX: Verify it's still an AI player
      if (!globalAIController.isAIPlayer(currentPlayer.id)) {
        console.log(`🤖 ❌ TIMEOUT ABORT: Current player is not AI`);
        return;
      }
      
      if (gameState.status === 'playing' && gameState.currentPhase === 6) {
        console.log(`🤖 ✅ AI ${currentPlayer.name} advancing from phase 6 (ending turn)`);
        await this.applyAction({
          type: 'advance_player_phase',
          playerId: currentPlayer.id,
          data: { phaseComplete: true }
        });
      } else {
        console.log(`🤖 ❌ TIMEOUT ABORT: Game state changed - status: ${gameState.status}, phase: ${gameState.currentPhase}`);
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
    
    if (gameState.status !== 'bidding') {
      console.log(`🤖 SAFEGUARD: Attempted to run bidding AI but game status is '${gameState.status}' - ABORTING`);
      return;
    }
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.log(`🤖 SAFEGUARD: Player ${playerId} not found - ABORTING`);
      return;
    }
    
    if (!globalAIController.isAIPlayer(player.id)) {
      console.log(`🤖 SAFEGUARD: Player ${playerId} is not an AI player - ABORTING`);
      return;
    }

    if (gameState.bidding?.bidsSubmitted[playerId] !== undefined) {
      console.log(`🤖 SAFEGUARD: Player ${player.name} has already bid - ABORTING`);
      return;
    }

    if (!gameState.bidding?.playersWaitingToBid?.includes(playerId)) {
      console.log(`🤖 SAFEGUARD: Player ${player.name} is not in waiting list - ABORTING`);
      return;
    }
    
    this.clearPlayerTimeout(player.id);
    
    console.log(`🤖 AI Bidding Action - Status: ${gameState.status}, Year: ${gameState.bidding?.year}, Player: ${player.name}`);
    console.log(`🤖 Player energy: ${player.energy}, Already bid: ${gameState.bidding?.bidsSubmitted[playerId] || 'none'}`);
    
    const minBidPercent = 0.20;
    const maxBidPercent = 0.40;
    const randomPercent = minBidPercent + (Math.random() * (maxBidPercent - minBidPercent));
    const bidAmount = Math.floor(player.energy * randomPercent);
    
    console.log(`🤖 AI ${player.name} calculating bid: ${bidAmount} energy (${Math.round(randomPercent * 100)}% of ${player.energy})`);
    
    if (bidAmount > player.energy) {
      console.log(`🤖 ERROR: Bid amount ${bidAmount} exceeds player energy ${player.energy}`);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      console.log(`🤖 AI ${player.name} attempting to place bid...`);
      
      const currentGameState = this.getGameState();
      if (!currentGameState || currentGameState.status !== 'bidding') {
        console.log(`🤖 TIMEOUT ABORT: Game state changed`);
        return;
      }

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

    aiPlayersNeedingToBid.forEach(playerId => {
      this.clearPlayerTimeout(playerId);
    });

    aiPlayersNeedingToBid.forEach((playerId, index) => {
      const player = gameState?.players.find(p => p.id === playerId);
      if (player) {
        console.log(`🤖 Scheduling AI bid for ${player.name} (delay: ${200 + index * 100}ms)`);
        
        const timeoutId = setTimeout(() => {
          this.doAIBiddingAction(playerId);
        }, 200 + (index * 100));
        
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
    const baseIncome = 3;
    const territoryIncome = Math.floor(player.territories.length / 3);
    
    let continentalBonus = 0;
    
    return Math.max(baseIncome, territoryIncome + continentalBonus);
  }

  private getOwnedCommanders(player: Player, territories: Record<string, Territory>): CommanderType[] {
    const owned: CommanderType[] = [];
    
    player.territories.forEach(tId => {
      const territory = territories[tId];
      if (!territory) return;
      
      if (territory.landCommander === player.id) owned.push('land');
      if (territory.diplomatCommander === player.id) owned.push('diplomat');
      if (territory.navalCommander === player.id) owned.push('naval');
      if (territory.nuclearCommander === player.id) owned.push('nuclear');
    });
    
    return [...new Set(owned)];
  }

  private getSpaceBaseCount(player: Player, territories: Record<string, Territory>): number {
    return player.territories.filter(tId => 
      territories[tId]?.spaceBase === player.id
    ).length;
  }
}