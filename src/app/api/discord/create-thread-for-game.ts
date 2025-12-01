// app/api/discord/create-thread-for-game.ts
import { DiscordBot } from "@/lib/discord/bot";
import { db } from "@/db";
import { env } from "cloudflare:workers";

export default async ({ request, ctx }) => {
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId, gameName, gameType } = await request.json();
  
  if (!gameId || !gameName) {
    return Response.json({ error: "gameId and gameName required" }, { status: 400 });
  }

  try {
    const kvNamespace = gameType === 'cardGame' 
      ? env.CARD_GAME_REGISTRY_KV 
      : env.GAME_REGISTRY_KV;

    if (!kvNamespace) {
      return Response.json({ error: "KV not available" }, { status: 500 });
    }

    // Check if thread already exists
    const existingThread = await kvNamespace.get(`discord:${gameId}`, "json") as any;
    if (existingThread?.threadId) {
      return Response.json({ 
        success: true,
        threadUrl: existingThread.threadUrl,
        message: "Thread already exists"
      });
    }

    // Get user's Discord account
    const discordAccount = await db.account.findFirst({
      where: {
        userId: ctx.user.id,
        providerId: "discord"
      }
    });

    if (!discordAccount) {
      return Response.json({ 
        error: "Discord not connected",
        needsConnection: true 
      }, { status: 400 });
    }

    // Create Discord thread
    const bot = new DiscordBot();
    const result = await bot.createGameThread(
      gameName,
      [discordAccount.accountId]
    );

    if (!result.success) {
      return Response.json({ 
        error: result.error || "Failed to create thread" 
      }, { status: 500 });
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

    console.log(`✅ Created Discord thread for existing game ${gameId}`);

    return Response.json({
      success: true,
      threadUrl: result.threadUrl
    });
  } catch (error) {
    console.error('Failed to create Discord thread:', error);
    return Response.json({ 
      error: "Failed to create Discord thread" 
    }, { status: 500 });
  }
};