// app/serverActions/cardGame/cardGameRegistry.ts
'use server'

import { env } from "cloudflare:workers";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { DiscordBot } from "@/lib/discord/bot";
import { db } from "@/db";
import { SANDBOX_CONFIG } from "@/lib/sandbox/config";


export interface CardGameInfo {
  cardGameId: string;
  name: string;
  createdAt: string;
  lastActivity: string;
  playerCount: number;
  status: 'active' | 'completed';
  isSandbox?: boolean; // NEW: Track if this is a sandbox game
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
 * Generate a unique card game name that doesn't already exist
 */
async function generateUniqueCardGameName(
  orgSlug: string, 
  isSandbox: boolean = false
): Promise<string> {
  if (!env.CARD_GAME_REGISTRY_KV) {
    throw new Error('CARD_GAME_REGISTRY_KV binding not found');
  }

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const cardGameId = generateGameName();
    
    // For sandbox, prefix with 'sandbox-' for easy identification
    const finalGameId = isSandbox ? `sandbox-${cardGameId}` : cardGameId;
    
    const existingGames = await getOrgCardGames(orgSlug, isSandbox);
    const exists = existingGames.some(g => g.cardGameId === finalGameId);
    
    if (!exists) {
      return finalGameId;
    }
    
    attempts++;
  }

  const cardGameId = generateGameName();
  const timestamp = Date.now().toString(36).slice(-4);
  const finalGameId = isSandbox ? `sandbox-${cardGameId}-${timestamp}` : `${cardGameId}-${timestamp}`;
  return finalGameId;
}

// Different limits for sandbox vs regular games
const MAX_CARD_GAMES_PER_ORG = 5;
const MAX_SANDBOX_CARD_GAMES = 50;

/**
 * NEW: Create or get the persistent sandbox game
 */
export async function createOrGetSandboxGame(): Promise<{ 
  success: boolean; 
  cardGameId?: string;
  name?: string;
  error?: string;
}> {
  if (!env.CARD_GAME_REGISTRY_KV) {
    return { success: false, error: 'CARD_GAME_REGISTRY_KV binding not found' };
  }

  const cardGameId = SANDBOX_CONFIG.GAME_ID;
  const orgSlug = 'sandbox';

  try {
    // Check if sandbox game already exists
    const existingGames = await getOrgCardGames(orgSlug, true);
    const sandboxGame = existingGames.find(g => g.cardGameId === cardGameId);

    if (sandboxGame) {
      console.log('✅ Sandbox game already exists:', cardGameId);
      
      // Update last activity
      await updateCardGameActivity(orgSlug, cardGameId, true);
      
      return { 
        success: true, 
        cardGameId,
        name: sandboxGame.name,
      };
    }

    // Create new sandbox game
    const gameName = 'Sandbox Playground';

    const newGame: CardGameInfo = {
      cardGameId,
      name: `🎮 ${gameName}`,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      playerCount: 0,
      status: 'active',
      isSandbox: true
    };

    const updatedGames = [...existingGames, newGame];
    const key = `sandbox:card-games`;
    
    await env.CARD_GAME_REGISTRY_KV.put(
      key, 
      JSON.stringify(updatedGames),
      { expirationTtl: 24 * 60 * 60 } // 24 hours
    );

    console.log(`✅ Created sandbox game ${cardGameId}`);
    
    // Initialize the game in the Durable Object
    if (env.CARD_GAME_STATE_DO) {
      const { initializeSandboxGame } = await import('./sandboxInit');
      await initializeSandboxGame(cardGameId);
    }
    
    return { 
      success: true, 
      cardGameId,
      name: newGame.name,
    };
  } catch (error) {
    console.error('Failed to create/get sandbox game:', error);
    return { success: false, error: 'Failed to create sandbox game' };
  }
}

/**
 * Get all active card games for an organization
 */
export async function getOrgCardGames(
  orgSlug: string,
  isSandbox: boolean = false
): Promise<CardGameInfo[]> {
  if (!env.CARD_GAME_REGISTRY_KV) {
    console.error('CARD_GAME_REGISTRY_KV binding not found');
    return [];
  }

  try {
    const key = isSandbox 
      ? `sandbox:card-games` // All sandbox games in one key
      : `org:${orgSlug}:card-games`;
      
    const gamesJson = await env.CARD_GAME_REGISTRY_KV.get(key);
    
    if (!gamesJson) {
      return [];
    }
    
    const games: CardGameInfo[] = JSON.parse(gamesJson);
    
    // Sandbox games expire faster (24 hours), regular games 30 days
    const expiryHours = isSandbox ? 24 : 30 * 24;
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - expiryHours);
    
    return games.filter(game => 
      game.status === 'active' && 
      new Date(game.lastActivity) > expiryDate
    );
  } catch (error) {
    console.error('Failed to get org card games:', error);
    return [];
  }
}

/**
 * Create a new card game with optional sandbox mode
 */


export async function createNewCardGame(
  orgSlug: string,
  options?: {
    creatorUserId?: string;
    isSandbox?: boolean;
    maxPlayers?: number;
  }
): Promise<{ 
  success: boolean; 
  cardGameId?: string;
  name?: string;
  discordThreadUrl?: string;
  error?: string;
}> {
  if (!env.CARD_GAME_REGISTRY_KV) {
    return { success: false, error: 'CARD_GAME_REGISTRY_KV binding not found' };
  }

  const { 
    creatorUserId, 
    isSandbox = false,
    maxPlayers = isSandbox ? 256 : 8 
  } = options || {};

  try {
    const existingGames = await getOrgCardGames(orgSlug, isSandbox);
    
    const maxGames = isSandbox ? MAX_SANDBOX_CARD_GAMES : MAX_CARD_GAMES_PER_ORG;
    
    if (existingGames.length >= maxGames) {
      return { 
        success: false, 
        error: isSandbox 
          ? `Sandbox limit reached. Please try again later.`
          : `Maximum ${MAX_CARD_GAMES_PER_ORG} active card games reached.`
      };
    }

    // Generate unique game ID
    const cardGameId = await generateUniqueCardGameName(orgSlug, isSandbox);
    const gameName = cardGameId
      .replace('sandbox-', '')
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const newGame: CardGameInfo = {
      cardGameId,
      name: isSandbox ? `🎮 ${gameName}` : gameName, // Add emoji for sandbox games
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      playerCount: 0,
      status: 'active',
      isSandbox
    };

    const updatedGames = [...existingGames, newGame];
    const key = isSandbox 
      ? `sandbox:card-games`
      : `org:${orgSlug}:card-games`;
    
    // For sandbox, set TTL of 24 hours
    if (isSandbox) {
      await env.CARD_GAME_REGISTRY_KV.put(
        key, 
        JSON.stringify(updatedGames),
        { expirationTtl: 24 * 60 * 60 } // 24 hours
      );
    } else {
      await env.CARD_GAME_REGISTRY_KV.put(key, JSON.stringify(updatedGames));
    }

    console.log(`✅ Created ${isSandbox ? 'sandbox ' : ''}card game ${cardGameId} for org ${orgSlug}`);
    
    // Only create Discord thread for non-sandbox games
    let discordThreadUrl: string | undefined;
    if (!isSandbox && creatorUserId) {
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
            await env.CARD_GAME_REGISTRY_KV.put(
              `discord:${cardGameId}`,
              JSON.stringify({
                threadId: result.threadId,
                threadUrl: result.threadUrl,
                createdAt: Date.now()
              })
            );
            
            discordThreadUrl = result.threadUrl;
            console.log(`✅ Created Discord thread for card game ${cardGameId}`);
          }
        }
      } catch (discordError) {
        console.error('Failed to create Discord thread:', discordError);
      }
    }
    
    return { 
      success: true, 
      cardGameId,
      name: newGame.name,
      discordThreadUrl
    };
  } catch (error) {
    console.error('Failed to create card game:', error);
    return { success: false, error: 'Failed to create card game' };
  }
}

/**
 * Update card game activity timestamp
 */
export async function updateCardGameActivity(
  orgSlug: string, 
  cardGameId: string,
  isSandbox: boolean = false
): Promise<void> {
  if (!env.CARD_GAME_REGISTRY_KV) return;

  try {
    const games = await getOrgCardGames(orgSlug, isSandbox);
    const gameIndex = games.findIndex(g => g.cardGameId === cardGameId);
    
    if (gameIndex === -1) {
      const newGame: CardGameInfo = {
        cardGameId,
        name: cardGameId
          .replace('sandbox-', '')
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        playerCount: 0,
        status: 'active',
        isSandbox
      };
      games.push(newGame);
    } else {
      games[gameIndex].lastActivity = new Date().toISOString();
    }
    
    const key = isSandbox 
      ? `sandbox:card-games`
      : `org:${orgSlug}:card-games`;
      
    if (isSandbox) {
      await env.CARD_GAME_REGISTRY_KV.put(
        key, 
        JSON.stringify(games),
        { expirationTtl: 24 * 60 * 60 }
      );
    } else {
      await env.CARD_GAME_REGISTRY_KV.put(key, JSON.stringify(games));
    }
  } catch (error) {
    console.error('Failed to update card game activity:', error);
  }
}

/**
 * Update player count in registry
 */
export async function updateCardGamePlayerCount(
  orgSlug: string, 
  cardGameId: string, 
  playerCount: number,
  isSandbox: boolean = false
): Promise<void> {
  if (!env.CARD_GAME_REGISTRY_KV) return;

  try {
    const games = await getOrgCardGames(orgSlug, isSandbox);
    const gameIndex = games.findIndex(g => g.cardGameId === cardGameId);
    
    if (gameIndex !== -1) {
      games[gameIndex].playerCount = playerCount;
      games[gameIndex].lastActivity = new Date().toISOString();
      
      const key = isSandbox 
        ? `sandbox:card-games`
        : `org:${orgSlug}:card-games`;
        
      if (isSandbox) {
        await env.CARD_GAME_REGISTRY_KV.put(
          key, 
          JSON.stringify(games),
          { expirationTtl: 24 * 60 * 60 }
        );
      } else {
        await env.CARD_GAME_REGISTRY_KV.put(key, JSON.stringify(games));
      }
    }
  } catch (error) {
    console.error('Failed to update card game player count:', error);
  }
}

/**
 * Mark card game as completed
 */
export async function completeCardGame(orgSlug: string, cardGameId: string): Promise<void> {
  if (!env.CARD_GAME_REGISTRY_KV) return;

  try {
    const games = await getOrgCardGames(orgSlug);
    const gameIndex = games.findIndex(g => g.cardGameId === cardGameId);
    
    if (gameIndex !== -1) {
      games[gameIndex].status = 'completed';
      games[gameIndex].lastActivity = new Date().toISOString();
      
      const key = `org:${orgSlug}:card-games`;
      await env.CARD_GAME_REGISTRY_KV.put(key, JSON.stringify(games));
      
      console.log(`✅ Marked card game ${cardGameId} as completed`);
    }
  } catch (error) {
    console.error('Failed to complete card game:', error);
  }
}

/**
 * Delete a card game from registry
 */
export async function deleteCardGame(orgSlug: string, cardGameId: string): Promise<boolean> {
  if (!env.CARD_GAME_REGISTRY_KV) return false;

  try {
    const games = await getOrgCardGames(orgSlug);
    const filteredGames = games.filter(g => g.cardGameId !== cardGameId);
    
    const key = `org:${orgSlug}:card-games`;
    await env.CARD_GAME_REGISTRY_KV.put(key, JSON.stringify(filteredGames));
    
    console.log(`✅ Deleted card game ${cardGameId} from registry`);
    return true;
  } catch (error) {
    console.error('Failed to delete card game:', error);
    return false;
  }
}

/**
 * Completely delete a card game - removes from registry AND destroys the Durable Object + Discord thread
 */
export async function deleteCardGameCompletely(
  orgSlug: string, 
  cardGameId: string
): Promise<{ success: boolean; error?: string }> {
  if (!env.CARD_GAME_REGISTRY_KV) {
    return { success: false, error: 'CARD_GAME_REGISTRY_KV binding not found' };
  }

  try {
    console.log(`🗑️ Starting complete deletion of card game ${cardGameId} for org ${orgSlug}`);

    // 1. Delete Discord thread
    try {
      const discordData = await env.CARD_GAME_REGISTRY_KV.get(`discord:${cardGameId}`, "json") as any;
      
      if (discordData?.threadId) {
        const bot = new DiscordBot();
        await bot.deleteGameThread(discordData.threadId);
        await env.CARD_GAME_REGISTRY_KV.delete(`discord:${cardGameId}`);
        console.log(`✅ Deleted Discord thread for card game ${cardGameId}`);
      }
    } catch (discordError) {
      console.error(`⚠️ Could not delete Discord thread:`, discordError);
      // Continue anyway
    }

    // 2. Remove from KV registry
    const games = await getOrgCardGames(orgSlug);
    const gameToDelete = games.find(g => g.cardGameId === cardGameId);
    
    if (!gameToDelete) {
      return { success: false, error: 'Card game not found in registry' };
    }

    const filteredGames = games.filter(g => g.cardGameId !== cardGameId);
    
    const key = `org:${orgSlug}:card-games`;
    await env.CARD_GAME_REGISTRY_KV.put(key, JSON.stringify(filteredGames));
    
    console.log(`✅ Deleted card game ${cardGameId} from KV registry`);

    // 3. Delete the Durable Object storage
    if (env.CARD_GAME_STATE_DO) {
      try {
        const doId = env.CARD_GAME_STATE_DO.idFromName(cardGameId);
        const doStub = env.CARD_GAME_STATE_DO.get(doId);
        
        const response = await doStub.fetch(new Request('https://fake-host/delete', {
          method: 'DELETE'
        }));
        
        const result = await response.json();
        console.log(`✅ Deleted Card Game Durable Object storage for ${cardGameId}:`, result);
      } catch (doError) {
        console.error(`⚠️ Could not delete card game DO storage:`, doError);
      }
    }

    console.log(`✅ Card game ${cardGameId} completely deleted`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete card game:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete card game' 
    };
  }
}