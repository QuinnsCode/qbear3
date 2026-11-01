// app/api/discord/create-thread-for-game.ts
import { DiscordBot } from "@/lib/discord/bot";
import { db } from "@/db";
import { env } from "cloudflare:workers";
import type { RequestInfo } from "rwsdk/worker";

function stringField(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const value = Object.entries(body).find(([k]) => k === key)?.[1];
  return typeof value === 'string' ? value : undefined;
}

export default async ({ request, ctx }: RequestInfo) => {
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const gameId = stringField(body, 'gameId');
  const gameName = stringField(body, 'gameName');
  const gameType = stringField(body, 'gameType');

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
    const existingThread = await kvNamespace.get<{ threadId?: string; threadUrl?: string }>(`discord:${gameId}`, "json");
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