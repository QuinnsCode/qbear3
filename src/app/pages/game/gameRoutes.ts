// app/routes/gameRoutes.ts - FIXED VERSION
import { route } from "rwsdk/router";
import { env } from "cloudflare:workers";

export const gameRoutes = [
  // Game WebSocket route - connects directly to GameStateDO
  route("", async ({ request }) => {
    if (request.headers.get("Upgrade") === "websocket") {
      const url = new URL(request.url);
      const key = url.searchParams.get('key') || '/default';
      
      console.log('🎮 Game WebSocket connecting to GameStateDO with key:', key);
      
      // ✅ Connect to GAME_STATE_DO (not REALTIME_DURABLE_OBJECT)
      const durableObjectId = (env.GAME_STATE_DO as any).idFromName(key);
      const gameDO = (env.GAME_STATE_DO as any).get(durableObjectId);
      
      return gameDO.fetch(request);
    }
    
    return new Response("WebSocket upgrade required", { status: 400 });
  }),

  // Game HTTP API route - for REST API calls to GameStateDO
  route("/game/:gameId", async ({ request, params }) => {
    const gameId = params.gameId;
    
    console.log(`🎮 Game HTTP ${request.method} request for:`, gameId);
    
    try {
      // ✅ Connect to GAME_STATE_DO (not REALTIME_DURABLE_OBJECT)  
      const durableObjectId = (env.GAME_STATE_DO as any).idFromName(gameId);
      const gameDO = (env.GAME_STATE_DO as any).get(durableObjectId);
      
      return gameDO.fetch(request);
      
    } catch (error) {
      console.error(`Game ${request.method} error:`, error);
      return new Response(JSON.stringify({ 
        error: 'Game service error', 
        message: error?.message || String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }),
];