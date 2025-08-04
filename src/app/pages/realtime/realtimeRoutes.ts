import { route } from "rwsdk/router";
import { env } from "cloudflare:workers";

export const realtimeRoutes = [
  // Presence API route
  route("/presence", async ({ request }) => {
    let key = '/default';
    
    if (request.method === 'POST') {
      try {
        const clonedRequest = request.clone();
        const body = await clonedRequest.json() as { pathname?: string; userId?: string; username?: string; action?: string };
        key = body?.pathname || '/default';
      } catch (e) {
        // If JSON parsing fails, use default key
      }
    } else if (request.method === 'GET') {
      const url = new URL(request.url);
      key = url.searchParams.get('key') || '/default';
    }
    
    console.log('🔑 Using presence key:', key);
    
    const durableObjectId = (env.REALTIME_DURABLE_OBJECT as any).idFromName(key);
    const durableObject = (env.REALTIME_DURABLE_OBJECT as any).get(durableObjectId);
    
    return durableObject.fetch(request);
  }),

  // Realtime WebSocket route
  route("", async ({ request }) => {
    if (request.headers.get("Upgrade") === "websocket") {
      const url = new URL(request.url);
      const key = url.searchParams.get('key') || '/default';
      
      console.log('🔌 WebSocket connecting with key:', key);
      
      const durableObjectId = (env.REALTIME_DURABLE_OBJECT as any).idFromName(key);
      const durableObject = (env.REALTIME_DURABLE_OBJECT as any).get(durableObjectId);
      
      return durableObject.fetch(request);
    }
    
    return new Response("WebSocket upgrade required", { status: 400 });
  }),
];