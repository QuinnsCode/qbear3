// app/pages/cardGame/cardGameRoutes.ts
import { route } from "rwsdk/router";
import { env } from "cloudflare:workers";

// Identity headers are ours to set. Drop any the client sent before setting them.
function withoutClientIdentity(source: Headers): Headers {
  const headers = new Headers(source);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('x-auth-') || name.startsWith('x-is-')) headers.delete(name);
  }
  return headers;
}

export const cardGameRoutes = [
  // WebSocket route - allow both players and spectators
  route("", async ({ request, ctx }) => {
    if (request.headers.get("Upgrade") === "websocket") {
      const url = new URL(request.url);
      const key = url.searchParams.get('key') || '/default';
      const headers = withoutClientIdentity(request.headers);

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

  // HTTP route: read-only. Writes go through server actions, which take identity from the session.
  route("/cardGame/:cardGameId", async ({ request, params }) => {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
    }

    const durableObjectId = env.CARD_GAME_STATE_DO.idFromName(params.cardGameId);
    const cardGameDO = env.CARD_GAME_STATE_DO.get(durableObjectId);

    return cardGameDO.fetch(new Request(request.url, { method: 'GET' }));
  }),
];