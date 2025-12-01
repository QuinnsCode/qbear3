// app/serverActions/discord/createThreadForGame.ts
'use server'

import { requestInfo } from "rwsdk/worker";
import { DiscordBot } from "@/lib/discord/bot";
import { db } from "@/db";
import { env } from "cloudflare:workers";

export async function createThreadForGame(
  gameId: string, 
  gameName: string, 
  gameType: 'game' | 'cardGame'
) {
  const { ctx } = requestInfo;
  
  if (!ctx.user) {
    return { success: false, error: "Unauthorized", needsConnection: false };
  }

  try {
    const kvNamespace = gameType === 'cardGame' 
      ? env.CARD_GAME_REGISTRY_KV 
      : env.GAME_REGISTRY_KV;

    if (!kvNamespace) {
      return { success: false, error: "KV not available" };
    }

    // Check if thread already exists
    const existingThread = await kvNamespace.get(`discord:${gameId}`, "json") as any;
    if (existingThread?.threadId) {
      return { 
        success: true,
        threadUrl: existingThread.threadUrl
      };
    }

    // Get user's Discord account
    const discordAccount = await db.account.findFirst({
      where: {
        userId: ctx.user.id,
        providerId: "discord"
      }
    });

    if (!discordAccount) {
      return { 
        success: false,
        error: "Discord not connected",
        needsConnection: true 
      };
    }

    // Create Discord thread
    const bot = new DiscordBot();
    const result = await bot.createGameThread(
      gameName,
      [discordAccount.accountId]
    );

    if (!result.success) {
      return { 
        success: false,
        error: result.error || "Failed to create thread" 
      };
    }

    // Store thread info in KV
    await kvNamespace.put(
      `discord:${gameId}`,
      JSON.stringify({
        threadId: result.threadId,
        threadUrl: result.threadUrl,
        createdAt: Date.now()
      })
    );

    return {
      success: true,
      threadUrl: result.threadUrl
    };
  } catch (error) {
    console.error('Failed to create Discord thread:', error);
    return { 
      success: false,
      error: "Failed to create Discord thread" 
    };
  }
}