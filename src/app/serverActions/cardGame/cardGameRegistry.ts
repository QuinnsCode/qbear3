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
  isSandbox?: boolean;
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

const MAX_CARD_GAMES_PER_ORG = 5;
const MAX_SANDBOX_CARD_GAMES = 50;

/**
 * Create or get the persistent sandbox game
 * ✅ NOW: Initializes the DO with starter decks
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

  if (!env.CARD_GAME_STATE_DO) {
    return { success: false, error: 'CARD_GAME_STATE_DO binding not found' };
  }

  const cardGameId = SANDBOX_CONFIG.GAME_ID;
  const orgSlug = 'sandbox';

  try {
    // 1. Handle KV registry (existing code)
    const existingGames = await getOrgCardGames(orgSlug, true);
    const sandboxGame = existingGames.find(g => g.cardGameId === cardGameId);

    if (!sandboxGame) {
      // Create registry entry
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
        { expirationTtl: 24 * 60 * 60 }
      );

      console.log(`✅ Created sandbox game registry entry ${cardGameId}`);
    } else {
      // Update activity for existing game
      await updateCardGameActivity(orgSlug, cardGameId, true);
      console.log('✅ Sandbox game registry exists:', cardGameId);
    }

    // 2. ✅ NEW: Initialize the Durable Object with starter decks
    const doId = env.CARD_GAME_STATE_DO.idFromName(cardGameId);
    const doStub = env.CARD_GAME_STATE_DO.get(doId);
    
    // Import starter decks from the same place DeckBuilder uses
    const { EDH_SANDBOX_STARTER_DECK_DATA } = await import('@/app/components/CardGame/Sandbox/starterDeckData');
    
    // ✅ Call the RPC method to initialize
    const initResult = await doStub.initializeSandbox({
      starterDecks: EDH_SANDBOX_STARTER_DECK_DATA
    });
    
    if (initResult.alreadyInitialized) {
      console.log('✅ Sandbox DO was already initialized');
    } else {
      console.log('✅ Sandbox DO initialized with starter decks');
    }
    
    return { 
      success: true, 
      cardGameId,
      name: sandboxGame?.name || '🎮 Sandbox Playground',
    };
  } catch (error) {
    console.error('Failed to create/get sandbox game:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create sandbox game' 
    };
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
      ? `sandbox:card-games`
      : `org:${orgSlug}:card-games`;
      
    const gamesJson = await env.CARD_GAME_REGISTRY_KV.get(key);
    
    if (!gamesJson) {
      return [];
    }
    
    const games: CardGameInfo[] = JSON.parse(gamesJson);
    
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
 * Create a new card game with subscription tier enforcement
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
  requiresUpgrade?: boolean;
  currentTier?: string;
  upgradeUrl?: string;
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
    
    // ✅ CHECK SUBSCRIPTION TIER LIMITS (skip for sandbox)
    if (!isSandbox && creatorUserId) {
      const user = await db.user.findUnique({
        where: { id: creatorUserId },
        include: { squeezeSubscription: true }
      });

      const tier = user?.squeezeSubscription?.tier || 'free';
      const tierLimits: Record<string, number> = {
        free: 1,
        starter: 3,
        pro: 10
      };

      const currentGameCount = existingGames.length;

      if (currentGameCount >= tierLimits[tier]) {
        const tierNames: Record<string, string> = {
          free: 'Free',
          starter: 'Starter',
          pro: 'Pro'
        };
        
        const nextTier = tier === 'free' ? 'Starter ($1/mo)' : tier === 'starter' ? 'Pro ($5/mo)' : null;
        const nextTierLimit = tier === 'free' ? 3 : tier === 'starter' ? 10 : null;
        
        return { 
          success: false,
          requiresUpgrade: true,
          currentTier: tier,
          upgradeUrl: '/pricing',
          error: nextTier 
            ? `🎮 Game limit reached! You have ${currentGameCount}/${tierLimits[tier]} games on the ${tierNames[tier]} tier. Upgrade to ${nextTier} for ${nextTierLimit} games!`
            : `You've reached your limit of ${tierLimits[tier]} games.`
        };
      }
    }
    
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
      name: isSandbox ? `🎮 ${gameName}` : gameName,
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
    
    if (isSandbox) {
      await env.CARD_GAME_REGISTRY_KV.put(
        key, 
        JSON.stringify(updatedGames),
        { expirationTtl: 24 * 60 * 60 }
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