// app/serverActions/gameRegistry.ts
'use server'

import { env } from "cloudflare:workers";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { DiscordBot } from "@/lib/discord/bot";
import { db } from "@/db";

export interface GameInfo {
  gameId: string;
  name: string;
  createdAt: string;
  lastActivity: string;
  playerCount: number;
  status: 'active' | 'completed';
}

function generateGameName() {
  const randomName = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "-",
    length: 3,
  });
  return randomName;
}

/**
 * Generate a unique game name that doesn't already exist
 */
async function generateUniqueGameName(orgSlug: string): Promise<string> {
  if (!env.GAME_REGISTRY_KV) {
    throw new Error('GAME_REGISTRY_KV binding not found');
  }

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const gameId = generateGameName();
    
    const existingGames = await getOrgGames(orgSlug);
    const exists = existingGames.some(g => g.gameId === gameId);
    
    if (!exists) {
      return gameId;
    }
    
    attempts++;
  }

  // Fallback: add timestamp to ensure uniqueness
  const gameId = generateGameName();
  const timestamp = Date.now().toString(36).slice(-4);
  return `${gameId}-${timestamp}`;
}

const MAX_GAMES_PER_ORG = 2;

/**
 * Get all active games for an organization
 */
export async function getOrgGames(orgSlug: string): Promise<GameInfo[]> {
  if (!env.GAME_REGISTRY_KV) {
    console.error('GAME_REGISTRY_KV binding not found');
    return [];
  }

  try {
    const key = `org:${orgSlug}:games`;
    const gamesJson = await env.GAME_REGISTRY_KV.get(key);
    
    if (!gamesJson) {
      return [];
    }
    
    const games: GameInfo[] = JSON.parse(gamesJson);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return games.filter(game => 
      game.status === 'active' && 
      new Date(game.lastActivity) > thirtyDaysAgo
    );
  } catch (error) {
    console.error('Failed to get org games:', error);
    return [];
  }
}

/**
 * Create a new game with Discord integration
 */
export async function createNewGame(
  orgSlug: string,
  creatorUserId?: string
): Promise<{ 
  success: boolean; 
  gameId?: string; 
  name?: string;
  discordThreadUrl?: string;
  error?: string;
}> {
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV binding not found' };
  }

  try {
    const existingGames = await getOrgGames(orgSlug);
    
    if (existingGames.length >= MAX_GAMES_PER_ORG) {
      return { 
        success: false, 
        error: `Maximum ${MAX_GAMES_PER_ORG} active games reached. Please complete or delete an existing game.` 
      };
    }

    // Generate unique game ID
    const gameId = await generateUniqueGameName(orgSlug);
    const gameName = gameId.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    const newGame: GameInfo = {
      gameId,
      name: gameName,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      playerCount: 1,
      status: 'active'
    };

    const updatedGames = [...existingGames, newGame];
    const key = `org:${orgSlug}:games`;
    
    await env.GAME_REGISTRY_KV.put(key, JSON.stringify(updatedGames));

    console.log(`✅ Created game ${gameId} for org ${orgSlug}`);
    
    // Create Discord thread if user ID provided
    let discordThreadUrl: string | undefined;
    if (creatorUserId) {
      try {
        const discordAccount = await db.account.findFirst({
          where: {
            userId: creatorUserId,
            providerId: "discord"
          }
        });

        if (discordAccount) {
          const bot = new DiscordBot();
          const result = await bot.createGameThread(
            gameName,
            [discordAccount.accountId]
          );

          if (result.success) {
            await env.GAME_REGISTRY_KV.put(
              `discord:${gameId}`,
              JSON.stringify({
                threadId: result.threadId,
                threadUrl: result.threadUrl,
                createdAt: Date.now()
              })
            );
            
            discordThreadUrl = result.threadUrl;
            console.log(`✅ Created Discord thread for game ${gameId}`);
          }
        }
      } catch (discordError) {
        console.error('Failed to create Discord thread:', discordError);
      }
    }
    
    return { 
      success: true, 
      gameId,
      name: gameName,
      discordThreadUrl,
    };
  } catch (error) {
    console.error('Failed to create game:', error);
    return { success: false, error: 'Failed to create game' };
  }
}

/**
 * Update game activity timestamp
 */
export async function updateGameActivity(orgSlug: string, gameId: string): Promise<void> {
  if (!env.GAME_REGISTRY_KV) return;

  try {
    const games = await getOrgGames(orgSlug);
    const gameIndex = games.findIndex(g => g.gameId === gameId);
    
    if (gameIndex === -1) {
      const newGame: GameInfo = {
        gameId,
        name: gameId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        playerCount: 1,
        status: 'active'
      };
      games.push(newGame);
    } else {
      games[gameIndex].lastActivity = new Date().toISOString();
    }
    
    const key = `org:${orgSlug}:games`;
    await env.GAME_REGISTRY_KV.put(key, JSON.stringify(games));
  } catch (error) {
    console.error('Failed to update game activity:', error);
  }
}

/**
 * Mark game as completed
 */
export async function completeGame(orgSlug: string, gameId: string): Promise<void> {
  if (!env.GAME_REGISTRY_KV) return;

  try {
    const games = await getOrgGames(orgSlug);
    const gameIndex = games.findIndex(g => g.gameId === gameId);
    
    if (gameIndex !== -1) {
      games[gameIndex].status = 'completed';
      games[gameIndex].lastActivity = new Date().toISOString();
      
      const key = `org:${orgSlug}:games`;
      await env.GAME_REGISTRY_KV.put(key, JSON.stringify(games));
      
      console.log(`✅ Marked game ${gameId} as completed`);
    }
  } catch (error) {
    console.error('Failed to complete game:', error);
  }
}

/**
 * Delete a game from registry
 */
export async function deleteGame(orgSlug: string, gameId: string): Promise<boolean> {
  if (!env.GAME_REGISTRY_KV) return false;

  try {
    const games = await getOrgGames(orgSlug);
    const filteredGames = games.filter(g => g.gameId !== gameId);
    
    const key = `org:${orgSlug}:games`;
    await env.GAME_REGISTRY_KV.put(key, JSON.stringify(filteredGames));
    
    console.log(`✅ Deleted game ${gameId} from registry`);
    return true;
  } catch (error) {
    console.error('Failed to delete game:', error);
    return false;
  }
}

/**
 * Completely delete a game - removes from registry AND destroys the Durable Object + Discord thread
 */
export async function deleteGameCompletely(
  orgSlug: string, 
  gameId: string
): Promise<{ success: boolean; error?: string }> {
  if (!env.GAME_REGISTRY_KV) {
    return { success: false, error: 'GAME_REGISTRY_KV binding not found' };
  }

  try {
    console.log(`🗑️ Starting complete deletion of game ${gameId} for org ${orgSlug}`);

    // 1. Delete Discord thread
    try {
      const discordData = await env.GAME_REGISTRY_KV.get(`discord:${gameId}`, "json") as any;
      
      if (discordData?.threadId) {
        const bot = new DiscordBot();
        await bot.deleteGameThread(discordData.threadId);
        await env.GAME_REGISTRY_KV.delete(`discord:${gameId}`);
        console.log(`✅ Deleted Discord thread for game ${gameId}`);
      }
    } catch (discordError) {
      console.error(`⚠️ Could not delete Discord thread:`, discordError);
    }

    // 2. Remove from KV registry
    const games = await getOrgGames(orgSlug);
    const gameToDelete = games.find(g => g.gameId === gameId);
    
    if (!gameToDelete) {
      return { success: false, error: 'Game not found in registry' };
    }

    const filteredGames = games.filter(g => g.gameId !== gameId);
    
    const key = `org:${orgSlug}:games`;
    await env.GAME_REGISTRY_KV.put(key, JSON.stringify(filteredGames));
    
    console.log(`✅ Deleted game ${gameId} from KV registry`);

    // 3. Delete the Durable Object storage
    if (env.GAME_STATE_DO) {
      try {
        const doId = env.GAME_STATE_DO.idFromName(gameId);
        const doStub = env.GAME_STATE_DO.get(doId);
        
        const response = await doStub.fetch(new Request('https://fake-host/delete', {
          method: 'DELETE'
        }));
        
        const result = await response.json();
        console.log(`✅ Deleted Durable Object storage for ${gameId}:`, result);
      } catch (doError) {
        console.error(`⚠️ Could not delete DO storage:`, doError);
      }
    }

    console.log(`✅ Game ${gameId} completely deleted`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete game:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete game' 
    };
  }
}