// app/api/discord/thread-url.ts
import { env } from "cloudflare:workers";

export default async ({ request, ctx }) => {
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const gameId = url.searchParams.get('gameId');
  const gameType = url.searchParams.get('type') || 'game';

  if (!gameId) {
    return Response.json({ error: "gameId required" }, { status: 400 });
  }

  try {
    const kvNamespace = gameType === 'cardGame' 
      ? env.CARD_GAME_REGISTRY_KV 
      : env.GAME_REGISTRY_KV;

    if (!kvNamespace) {
      return Response.json({ error: "KV not available" }, { status: 500 });
    }

    const discordData = await kvNamespace.get(`discord:${gameId}`, "json") as any;

    if (!discordData) {
      return Response.json({ 
        hasThread: false,
        message: "No Discord thread found" 
      });
    }

    return Response.json({
      hasThread: true,
      threadUrl: discordData.threadUrl,
      threadId: discordData.threadId,
      createdAt: discordData.createdAt
    });
  } catch (error) {
    console.error('Failed to get Discord thread:', error);
    return Response.json({ 
      error: "Failed to get thread info" 
    }, { status: 500 });
  }
};