import { GameState, Player, Territory } from '@/app/lib/GameState';
import { GAME_CONFIG } from '@/app/services/game/gameSetup';
import { setupNewGame } from '@/app/services/game/gameSetup';
import { globalAIController } from '@/app/services/game/ADai';

export async function restartGame(
  state: any,  // Avoid assigning incorrect types; focus on function utility
  gameId: string,
  player1Id: string,
  player2Id: string,
  nukeCount: number
): Promise<GameState> {
  const gameState = setupNewGame(gameId, player1Id, player2Id, nukeCount);
  gameState.setupPhase = 'units';
  
  await initializeAIPlayers(gameState);
  await state.storage.put('gameState', gameState);
  
  return gameState;
}

export async function createGame(
  state: any,
  data: { playerNames: string[], territoryConfig: Record<string, any> }
): Promise<GameState> {
  const gameId = crypto.randomUUID();

  // Player and territory initialization..
  const players: Player[] = data.playerNames.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    color: ['blue', 'red', 'green', 'yellow'][index % 4],
    cards: [],
    territories: [],
    isActive: index === 0,
    pendingDecision: undefined,
    remainingUnitsToPlace: GAME_CONFIG.SETUP_UNITS_PER_PLAYER,
    unitsPlacedThisTurn: 0,
    unitsToPlaceThisTurn: 0,
    energy: GAME_CONFIG.SETUP_STARTING_ENERGY,
    aiVibe: name === 'AI Player' ? 'efficient' : undefined,
    currentBid: undefined,
    totalEnergySpentOnBids: 0,
  }));

  const territories: Record<string, Territory> = {};
  Object.entries(data.territoryConfig).forEach(([id, config]) => {
    territories[id] = {
      id,
      name: config.name,
      machineCount: config.initialMachines || 0,
      connections: config.connections || [],
      modifiers: config.modifiers,
    };
  });

  const gameState: GameState = {
    id: gameId,
    status: 'setup',
    setupPhase: 'units',
    currentPhase: 1,
    currentYear: 1,
    currentPlayerIndex: 0,
    players,
    turnOrder: players.map(p => p.id),
    activeTurnOrder: players.map(p => p.id),
    territories,
    actions: [],
    currentActionIndex: -1,
    createdAt: new Date(),
    updatedAt: new Date(),
    bidding: undefined,
    yearlyTurnOrders: {},
  };

  await state.storage.put('gameState', gameState);
  return gameState;
}

async function initializeAIPlayers(gameState: GameState): Promise<void> {
  gameState.players.forEach(player => {
    if (player.name === 'AI Player') {
      globalAIController.addAIPlayer(player.id, 'medium');
      console.log(`🤖 Initialized AI player: ${player.id}`);
    }
  });
}