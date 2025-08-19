// src/app/services/game/gameFunctions/cards/CardManager.ts

import type { GameState, GameAction, Player, Territory } from '@/app/lib/GameState';
import { RAW_CARD_DATA } from '@/app/services/game/gameFunctions';

export class CardManager {
  
  // ================================
  // MAIN CARD SYSTEM HANDLERS
  // ================================
  
  static handlePlayCard(gameState: GameState, action: GameAction): GameState {
    console.log('🃏 DEBUG: handlePlayCard called with:', {
      playerId: action.playerId,
      cardId: action.data?.cardId,
      targets: action.data?.targets,
      actionData: action.data
    });
    
    const { playerId, data } = action;
    const { cardId, targets } = data;
    
    console.log('🃏 DEBUG: Extracted data:', { playerId, cardId, targets });
    
    try {
      const result = this.applyCardEffect(gameState, playerId, cardId, targets);
      console.log('🃏 DEBUG: Card effect applied successfully');
      return result;
    } catch (error) {
      console.error('🃏 ERROR: Failed to play card:', error);
      console.error('🃏 ERROR: Stack trace:', error.stack);
      throw error;
    }
  }

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

  static purchaseCards(gameState: GameState, action: GameAction): GameState {
    const { playerId, data } = action;
    const { selectedCards } = data;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.error('Player not found for card purchase');
      return gameState;
    }
    
    // Calculate total cost (1 energy per card)
    const totalCost = selectedCards.reduce((sum: number, item: any) => 
      sum + item.quantity, 0
    );
    
    // Validate player has enough energy
    if (player.energy < totalCost) {
      console.error(`Player ${player.name} cannot afford cards (cost: ${totalCost}, energy: ${player.energy})`);
      return gameState;
    }
    
    console.log(`💳 ${player.name} purchasing ${totalCost} cards for ${totalCost} energy`);
    
    // Create new state
    const newState = { ...gameState };
    newState.players = gameState.players.map(p => {
      if (p.id === playerId) {
        const newCards = [...p.cards];
        
        // Add random cards from each commander type
        selectedCards.forEach((item: any) => {
          const { commanderType, quantity } = item;
          
          for (let i = 0; i < quantity; i++) {
            // Get a random card from this commander type
            const randomCard = this.getRandomCardFromCommanderType(commanderType);
            
            if (randomCard) {
              newCards.push({
                id: crypto.randomUUID(),
                type: 'commander',
                name: randomCard.cardTitle,
                data: {
                  cardTitle: randomCard.cardTitle,
                  cost: randomCard.cardCost,
                  commanderType: randomCard.cardType,
                  text: randomCard.cardText,
                  phase: randomCard.cardPhase
                }
              });
            }
          }
        });
        
        return {
          ...p,
          energy: p.energy - totalCost,
          cards: newCards
        };
      }
      return p;
    });
    
    console.log(`✅ ${player.name} purchased cards successfully. New energy: ${player.energy - totalCost}`);
    return newState;
  }

  static getRandomCardFromCommanderType(commanderType: string) {
    const commanderCards = RAW_CARD_DATA.filter(card => card.cardType === commanderType);
    
    if (commanderCards.length === 0) {
      console.warn(`No cards found for commander type: ${commanderType}`);
      return null;
    }
    
    // Get random card
    const randomIndex = Math.floor(Math.random() * commanderCards.length);
    return commanderCards[randomIndex];
  }

  // ================================
  // CARD EFFECT APPLICATION
  // ================================

  static applyCardEffect(gameState: GameState, playerId: string, cardId: string, targets?: string[]): GameState {
    console.log('🃏 DEBUG: applyCardEffect called with:', { playerId, cardId, targets });
    
    const newState = { ...gameState };
    const player = newState.players.find(p => p.id === playerId);
    
    console.log('🃏 DEBUG: Player found:', !!player);
    
    if (!player) {
      throw new Error('Player not found');
    }

    // Find the card in player's hand
    const card = player.cards.find(c => c.id === cardId);
    console.log('🃏 DEBUG: Card found:', !!card);
    console.log('🃏 DEBUG: Player cards:', player.cards.map(c => ({ id: c.id, name: c.name, data: c.data })));
    
    if (!card) {
      throw new Error('Card not found in player hand');
    }

    // Get card data
    const cardData = card.data;
    const cardTitle = cardData.cardTitle;
    const cardCost = cardData.cardCost || 0;
    const cardType = cardData.commanderType;

    console.log('🃏 DEBUG: Card details:', { cardTitle, cardCost, cardType, cardData });

    // Validate player has enough energy
    if (player.energy < cardCost) {
      throw new Error(`Not enough energy to play this card. Need ${cardCost}, have ${player.energy}`);
    }

    // Deduct energy cost
    player.energy -= cardCost;

    // Apply card effect based on card title
    switch (cardTitle) {
      // Placement Cards
      case 'Assemble MODs':
        this.applyAssembleMODsEffect(newState, playerId, cardData, targets);
        break;
      
      case 'Reinforcements':
        this.applyReinforcementsEffect(newState, playerId, cardData, targets);
        break;
      
      case 'Colony Influence':
        this.applyColonyInfluenceEffect(newState, playerId, cardData);
        break;

      // Diplomat Phase 0 Cards
      case 'Decoys Revealed':
        this.applyDecoysRevealedEffect(newState, playerId, cardData, targets);
        break;
      
      case 'Territorial Station':
        this.applyTerritorialStationEffect(newState, playerId, cardData, targets);
        break;
      
      case 'MOD Reduction':
        this.applyMODReductionEffect(newState, playerId, cardData, targets);
        break;
      
      case 'Energy Crisis':
        this.applyEnergyCrisisEffect(newState, playerId, cardData);
        break;

      // Naval Phase 0 Cards
      case 'Hidden Energy':
        this.applyHiddenEnergyEffect(newState, playerId, cardData, targets);
        break;
      
      case 'Frequency Jam':
        this.applyFrequencyJamEffect(newState, playerId, cardData, targets);
        break;

      // Land Phase 0 Cards
      case 'Scout Forces':
        this.applyScoutForcesEffect(newState, playerId, cardData, targets);
        break;

      // Nuclear Phase 0 Cards
      case 'Assassin Bomb':
        this.applyAssassinBombEffect(newState, playerId, cardData, targets);
        break;
      
      case 'Scatter Bomb Land':
        this.applyScatterBombEffect(newState, playerId, cardData, 'land', targets);
        break;
      
      case 'Scatter Bomb Water':
        this.applyScatterBombEffect(newState, playerId, cardData, 'water', targets);
        break;
      
      case 'Rocket Strike Water':
        this.applyRocketStrikeEffect(newState, playerId, cardData, 'water', targets);
        break;
      
      case 'Rocket Strike Land':
        this.applyRocketStrikeEffect(newState, playerId, cardData, 'land', targets);
        break;
      
      case 'Aqua Brother':
        this.applyAreaBombEffect(newState, playerId, cardData, 'water', targets);
        break;
      
      case 'The Mother':
        this.applyAreaBombEffect(newState, playerId, cardData, 'land', targets);
        break;
      
      case 'Armageddon':
        this.applyArmageddonEffect(newState, playerId, cardData);
        break;
      
      default:
        throw new Error(`Card effect not implemented: ${cardTitle}`);
    }

    // Remove card from player's hand
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
      player.cards.splice(cardIndex, 1);
    }
    
    return newState;
  }

  // ================================
  // PLACEMENT CARD EFFECTS
  // ================================

  // "Place 3 MODS on any one [terrain type] territory you occupy"
  static applyAssembleMODsEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error(`Assemble MODs requires exactly one target territory. Got: ${targets?.length || 0} targets`);
    } 

    const targetTerritoryId = targets[0];
    const territory = gameState.territories[targetTerritoryId];
    
    if (!territory) {
      throw new Error('Target territory not found');
    }

    if (territory.ownerId !== playerId) {
      throw new Error('You can only place MODs on territories you control');
    }

    // Validate territory type based on card type
    const cardType = cardData.commanderType;
    let validTypes: string[] = [];
    
    switch (cardType) {
      case 'naval':
        validTypes = ['water', 'lava'];
        break;
      case 'land':
        validTypes = ['land'];
        break;
      default:
        throw new Error(`Unknown card type for Assemble MODs: ${cardType}`);
    }

    if (!validTypes.includes(territory.type)) {
      const expectedTypes = validTypes.join(' or ');
      throw new Error(`This Assemble MODs card can only be used on ${expectedTypes} territories`);
    }

    territory.machineCount += 3;
    console.log(`Placed 3 MODs on ${territory.name}. Total units: ${territory.machineCount}`);
  }

  // "Place 3 MODS, one each on 3 different [terrain type] territories you occupy"
  static applyReinforcementsEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 3) {
      throw new Error('Reinforcements requires exactly three target territories');
    }
    
    const cardType = cardData.commanderType;
    let validTypes: string[] = [];
    
    switch (cardType) {
      case 'naval':
        validTypes = ['water', 'lava'];
        break;
      case 'land':
        validTypes = ['land'];
        break;
      default:
        throw new Error(`Unknown card type for Reinforcements: ${cardType}`);
    }

    // Validate all targets
    const uniqueTargets = new Set(targets);
    if (uniqueTargets.size !== 3) {
      throw new Error('Reinforcements must target 3 different territories');
    }

    for (const targetId of targets) {
      const territory = gameState.territories[targetId];
      
      if (!territory) {
        throw new Error(`Territory ${targetId} not found`);
      }

      if (territory.ownerId !== playerId) {
        throw new Error(`You can only place MODs on territories you control`);
      }

      if (!validTypes.includes(territory.type)) {
        const expectedTypes = validTypes.join(' or ');
        throw new Error(`Territory ${territory.name} must be a ${expectedTypes} territory`);
      }
    }

    // Place 1 MOD on each territory
    for (const targetId of targets) {
      const territory = gameState.territories[targetId];
      territory.machineCount += 1;
      console.log(`Placed 1 MOD on ${territory.name}. Total units: ${territory.machineCount}`);
    }
  }

  static applyColonyInfluenceEffect(gameState: GameState, playerId: string, cardData: any): void {
    const cardType = cardData.commanderType;
    let commanderField: string;
    
    switch (cardType) {
      case 'diplomat':
        commanderField = 'diplomatCommander';
        break;
      case 'naval':
        commanderField = 'navalCommander';
        break;
      case 'land':
        commanderField = 'landCommander';
        break;
      case 'nuclear':
        commanderField = 'nuclearCommander';
        break;
      default:
        throw new Error(`Unknown card type for Colony Influence: ${cardType}`);
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const hasCommander = player.territories.some(territoryId => {
      const territory = gameState.territories[territoryId];
      return territory && territory[commanderField] === playerId;
    });

    if (!hasCommander) {
      throw new Error(`Your ${cardType} commander is not alive or not found`);
    }

    // Add 3 to score (using energy as placeholder for now)
    player.energy += 3;
    console.log(`Colony Influence: Added 3 points for ${cardType} commander being alive`);
  }

  // ================================
  // DIPLOMAT PHASE 0 CARDS
  // ================================

  // "Move any number of your commanders to any number of territories you control"
  static applyDecoysRevealedEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    throw new Error('Decoys Revealed requires complex commander movement - implement manually');
  }

  // "Place a space station on any land territory you occupy"
  static applyTerritorialStationEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error('Territorial Station requires exactly one target territory');
    }

    const targetTerritoryId = targets[0];
    const territory = gameState.territories[targetTerritoryId];
    
    if (!territory) {
      throw new Error('Target territory not found');
    }

    if (territory.ownerId !== playerId) {
      throw new Error('You can only place space stations on territories you control');
    }

    if (territory.type !== 'land') {
      throw new Error('Space stations can only be placed on land territories');
    }

    if (!territory.modifiers) {
      territory.modifiers = {};
    }
    territory.modifiers.spaceStation = true;

    console.log(`Placed space station on ${territory.name}`);
  }

  // "All of your opponents must remove 4 MODs in turn order. Then you remove 2 MODs"
  static applyMODReductionEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    // Apply to all opponents first
    gameState.players.forEach(player => {
      if (player.id !== playerId) {
        this.removePlayerMODs(gameState, player.id, 4);
      }
    });

    // Then apply to self
    this.removePlayerMODs(gameState, playerId, 2);

    console.log('MOD Reduction: All opponents lost 4 MODs, you lost 2 MODs');
  }

  // "Collect one energy from each opponent"
  static applyEnergyCrisisEffect(gameState: GameState, playerId: string, cardData: any): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    let totalCollected = 0;
    gameState.players.forEach(opponent => {
      if (opponent.id !== playerId && opponent.energy > 0) {
        opponent.energy -= 1;
        totalCollected += 1;
      }
    });

    player.energy += totalCollected;
    console.log(`Energy Crisis: Collected ${totalCollected} energy from opponents`);
  }

  // ================================
  // NAVAL PHASE 0 CARDS
  // ================================

  // "Draw a water or lava territory card. If you occupy this water or lava territory at the end of your turn, collect 4 energy"
  static applyHiddenEnergyEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error('Hidden Energy requires exactly one target territory');
    }

    const targetTerritoryId = targets[0];
    const territory = gameState.territories[targetTerritoryId];
    
    if (!territory) {
      throw new Error('Target territory not found');
    }

    if (territory.type !== 'water' && territory.type !== 'lava') {
      throw new Error('Hidden Energy can only target water or lava territories');
    }

    if (territory.ownerId === playerId) {
      const player = gameState.players.find(p => p.id === playerId);
      if (player) {
        player.energy += 4;
        console.log(`Hidden Energy: Collected 4 energy from ${territory.name}`);
      }
    } else {
      console.log(`Hidden Energy: No energy collected (don't control ${territory.name})`);
    }
  }

  // "Choose a player. The chosen player cannot play command cards during your turn"
  static applyFrequencyJamEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error('Frequency Jam requires exactly one target player');
    }

    const targetPlayerId = targets[0];
    const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
    
    if (!targetPlayer) {
      throw new Error('Target player not found');
    }

    if (targetPlayerId === playerId) {
      throw new Error('You cannot jam yourself');
    }

    if (!targetPlayer.pendingDecision) {
      targetPlayer.pendingDecision = { type: 'play_card' };
    }

    console.log(`Frequency Jam: ${targetPlayer.name} cannot play cards this turn`);
  }

  // ================================
  // LAND PHASE 0 CARDS
  // ================================

  // "Draw a land territory card and secretly place it facedown in front of you. Place 5 MODS on this card"
  static applyScoutForcesEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error('Scout Forces requires exactly one target territory');
    }

    const targetTerritoryId = targets[0];
    const territory = gameState.territories[targetTerritoryId];
    
    if (!territory) {
      throw new Error('Target territory not found');
    }

    if (territory.type !== 'land') {
      throw new Error('Scout Forces can only target land territories');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    if (!player.pendingDecision) {
      player.pendingDecision = { type: 'play_card', data: {} };
    }
    
    if (!player.pendingDecision.data) {
      player.pendingDecision.data = {};
    }
    player.pendingDecision.data.scoutForces = {
      territoryId: targetTerritoryId,
      mods: 5
    };

    console.log(`Scout Forces: 5 MODs prepared for deployment when ${territory.name} is conquered`);
  }

  // ================================
  // NUCLEAR PHASE 0 CARDS
  // ================================

  // "Choose an opponent's commander. Roll an 8-sided die. If you roll a 3 or higher destroy the chosen commander"
  static applyAssassinBombEffect(gameState: GameState, playerId: string, cardData: any, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error('Assassin Bomb requires exactly one target (format: playerId-commanderType)');
    }

    const [targetPlayerId, commanderType] = targets[0].split('-');
    
    if (!targetPlayerId || !commanderType) {
      throw new Error('Target must be in format: playerId-commanderType');
    }

    if (targetPlayerId === playerId) {
      throw new Error('You cannot target your own commander');
    }

    // Roll 8-sided die
    const roll = Math.floor(Math.random() * 8) + 1;
    console.log(`Assassin Bomb: Rolled ${roll} on 8-sided die`);

    if (roll >= 3) {
      const commanderField = `${commanderType}Commander`;
      const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
      
      if (!targetPlayer) {
        throw new Error('Target player not found');
      }

      let commanderDestroyed = false;
      targetPlayer.territories.forEach(territoryId => {
        const territory = gameState.territories[territoryId];
        if (territory && territory[commanderField] === targetPlayerId) {
          delete territory[commanderField];
          commanderDestroyed = true;
        }
      });

      if (commanderDestroyed) {
        console.log(`Assassin Bomb: Destroyed ${targetPlayer.name}'s ${commanderType} commander!`);
      } else {
        console.log(`Assassin Bomb: ${targetPlayer.name} doesn't have a ${commanderType} commander`);
      }
    } else {
      console.log('Assassin Bomb: Failed to destroy commander (rolled too low)');
    }
  }

  // "Choose a planet and turn over 3/2 territory cards. Destroy half the opponents' units on territories drawn"
  static applyScatterBombEffect(gameState: GameState, playerId: string, cardData: any, bombType: string, targets?: string[]): void {
    if (!targets || targets.length < 2 || targets.length > 3) {
      const cardCount = bombType === 'land' ? 3 : 2;
      throw new Error(`Scatter Bomb ${bombType} requires exactly ${cardCount} target territories`);
    }

    targets.forEach(territoryId => {
      const territory = gameState.territories[territoryId];
      if (!territory) {
        throw new Error(`Territory ${territoryId} not found`);
      }

      if (bombType === 'land' && territory.type !== 'land') {
        throw new Error(`Territory ${territory.name} must be a land territory`);
      }
      if (bombType === 'water' && territory.type !== 'water' && territory.type !== 'lava') {
        throw new Error(`Territory ${territory.name} must be a water or lava territory`);
      }

      // Destroy half of opponent units (not yours)
      if (territory.ownerId && territory.ownerId !== playerId) {
        const unitsToDestroy = Math.ceil(territory.machineCount / 2);
        territory.machineCount = Math.max(0, territory.machineCount - unitsToDestroy);
        console.log(`Scatter Bomb: Destroyed ${unitsToDestroy} units in ${territory.name}`);
      }
    });
  }

  // "Choose any opponent's territory. Roll a 6-sided die. Your opponent must destroy units equal to the number rolled"
  static applyRocketStrikeEffect(gameState: GameState, playerId: string, cardData: any, terrainType: string, targets?: string[]): void {
    if (!targets || targets.length !== 1) {
      throw new Error('Rocket Strike requires exactly one target territory');
    }

    const targetTerritoryId = targets[0];
    const territory = gameState.territories[targetTerritoryId];
    
    if (!territory) {
      throw new Error('Target territory not found');
    }

    if (!territory.ownerId || territory.ownerId === playerId) {
      throw new Error('You can only target opponent territories');
    }

    if (terrainType === 'land' && territory.type !== 'land') {
      throw new Error('Rocket Strike Land can only target land territories');
    }
    if (terrainType === 'water' && territory.type !== 'water' && territory.type !== 'lava') {
      throw new Error('Rocket Strike Water can only target water/lava territories');
    }

    // Roll 6-sided die
    const roll = Math.floor(Math.random() * 6) + 1;
    const unitsToDestroy = Math.min(roll, territory.machineCount);
    territory.machineCount -= unitsToDestroy;

    console.log(`Rocket Strike: Rolled ${roll}, destroyed ${unitsToDestroy} units in ${territory.name}`);
  }

  // "Choose a planet, then roll a 6-sided die. Consult the table to see the zone(s) affected"
  static applyAreaBombEffect(gameState: GameState, playerId: string, cardData: any, terrainType: string, targets?: string[]): void {
    if (!targets || targets.length === 0) {
      throw new Error('Area bomb requires at least one target territory');
    }

    // Roll 6-sided die for zone effect
    const roll = Math.floor(Math.random() * 6) + 1;
    console.log(`Area Bomb: Rolled ${roll} for zone effect`);

    // Apply to all territories in the selected zone
    targets.forEach(territoryId => {
      const territory = gameState.territories[territoryId];
      if (!territory) return;

      if (terrainType === 'land' && territory.type !== 'land') return;
      if (terrainType === 'water' && territory.type !== 'water' && territory.type !== 'lava') return;

      // Destroy 1 unit in each territory
      if (territory.machineCount > 0) {
        territory.machineCount -= 1;
        console.log(`Area Bomb: Destroyed 1 unit in ${territory.name}`);
      }
    });
  }

  // "All players, in turn order, may play any number of nuclear command cards without paying the energy cost"
  static applyArmageddonEffect(gameState: GameState, playerId: string, cardData: any): void {
    console.log('Armageddon: All nuclear cards are now free to play this turn!');
    
    // Add a global effect marker
    gameState.players.forEach(player => {
      if (!player.pendingDecision) {
        player.pendingDecision = { type: 'play_card', data: {} };
      }
      if (!player.pendingDecision.data) {
        player.pendingDecision.data = {};
      }
      player.pendingDecision.data.freeNuclearCards = true;
    });
  }

  // ================================
  // HELPER FUNCTIONS
  // ================================

  // Helper to remove MODs from a player's territories
  static removePlayerMODs(gameState: GameState, playerId: string, modsToRemove: number): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    let remaining = modsToRemove;
    
    // Remove MODs from player's territories (player chooses which ones)
    // For AI implementation, remove from territories with most MODs first
    const playerTerritories = player.territories
      .map(id => gameState.territories[id])
      .filter(t => t && t.machineCount > 0)
      .sort((a, b) => b.machineCount - a.machineCount);

    for (const territory of playerTerritories) {
      if (remaining <= 0) break;
      
      const toRemove = Math.min(remaining, territory.machineCount);
      territory.machineCount -= toRemove;
      remaining -= toRemove;
      
      console.log(`Removed ${toRemove} MODs from ${territory.name}`);
    }
  }
}