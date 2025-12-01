// app/pages/cardGame/cardGameRoutes.ts
import { route } from "rwsdk/router";
import { env } from "cloudflare:workers";

export const cardGameRoutes = [
  // WebSocket route - allow both players and spectators
  route("", async ({ request, ctx }) => {
    if (request.headers.get("Upgrade") === "websocket") {
      const url = new URL(request.url);
      const key = url.searchParams.get('key') || '/default';
      const headers = new Headers(request.headers);
      
      // Check if this is a sandbox game
      const gameId = key.replace(/^\//, '');
      const isSandbox = gameId.startsWith('sandbox-') || 
                        gameId.startsWith('default-') ||
                        gameId.startsWith('test-') ||
                        gameId.startsWith('trial-');
      
      if (ctx.user) {
        // Real user
        headers.set('X-Auth-User-Id', ctx.user.id);
        headers.set('X-Auth-User-Name', ctx.user.name || ctx.user.email);
        headers.set('X-Is-Authenticated', 'true');
        if (ctx.organization) {
          headers.set('X-Auth-Org-Id', ctx.organization.id);
        }
      } else if (isSandbox) {
        // Sandbox mode - create temp user
        const tempUserId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        headers.set('X-Auth-User-Id', tempUserId);
        headers.set('X-Auth-User-Name', `Player ${tempUserId.slice(-6)}`);
        headers.set('X-Is-Authenticated', 'sandbox'); // Special flag
        headers.set('X-Is-Sandbox', 'true');
      } else {
        // Regular spectator
        headers.set('X-Is-Authenticated', 'false');
        headers.set('X-Is-Spectator', 'true');
      }
      
      const authedRequest = new Request(request.url, {
        method: request.method,
        headers,
        // @ts-ignore
        duplex: 'half'
      });
      
      const durableObjectId = env.CARD_GAME_STATE_DO.idFromName(key);
      const cardGameDO = env.CARD_GAME_STATE_DO.get(durableObjectId);
      
      return cardGameDO.fetch(authedRequest);
    }
    
    return new Response("WebSocket upgrade required", { status: 400 });
  }),

  // HTTP route - allow GET for spectators, require auth for mutations
  route("/cardGame/:cardGameId", async ({ request, params, ctx }) => {
    const cardGameId = params.cardGameId;
    
    // Optionally inject auth headers if available
    const headers = new Headers(request.headers);
    
    if (ctx.user) {
      headers.set('X-Auth-User-Id', ctx.user.id);
      headers.set('X-Auth-User-Name', ctx.user.name || ctx.user.email);
      headers.set('X-Is-Authenticated', 'true');
      
      if (ctx.organization) {
        headers.set('X-Auth-Org-Id', ctx.organization.id);
      }
    } else {
      headers.set('X-Is-Authenticated', 'false');
      
      // Block mutations for non-authenticated users
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    const authedRequest = new Request(request.url, {
      method: request.method,
      headers,
      body: request.body,
      // @ts-ignore
      duplex: request.body ? 'half' : undefined
    });
    
    const durableObjectId = env.CARD_GAME_STATE_DO.idFromName(cardGameId);
    const cardGameDO = env.CARD_GAME_STATE_DO.get(durableObjectId);
    
    return cardGameDO.fetch(authedRequest);
  }),
];