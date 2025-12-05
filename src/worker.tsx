import { defineApp, ErrorResponse, requestInfo } from "rwsdk/worker";
import { realtimeRoute, renderRealtimeClients } from "rwsdk/realtime/worker";
import { route, render, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
import { staticRoutes } from "@/app/pages/staticRoutes";
import { gameRoutes } from "./app/pages/game/gameRoutes";
import { cardGameRoutes } from "@/app/pages/cardGame/cardGameRoutes";
import { realtimeRoutes } from "@/app/pages/realtime/realtimeRoutes";
import { auth, initAuth } from "@/lib/auth";
import { type User, type Organization, db, setupDb } from "@/db";
import { 
  initializeServices, 
  setupOrganizationContext, 
  setupSessionContext, 
  extractOrgFromSubdomain,
  shouldSkipMiddleware 
} from "@/lib/middlewareFunctions";
import { env } from "cloudflare:workers";
import { verifyTurnstileToken } from "@/lib/turnstile";
import GamePage from "@/app/pages/game/GamePage";
import CardGamePage from "@/app/pages/cardGame/CardGamePage";
import SanctumPage from "@/app/pages/sanctum/SanctumPage";
import { createNewGame } from "./app/serverActions/gameRegistry";
import { createNewCardGame } from "./app/serverActions/cardGame/cardGameRegistry";
import LoginPage from "./app/pages/user/Login";
import { isSandboxEnvironment, setupSandboxContext, createSandboxCookieHeader } from "./lib/middleware/sandboxMiddleware";
import LandingPage from "./app/pages/landing/LandingPage";

export { SessionDurableObject } from "./session/durableObject";
export { PresenceDurableObject as RealtimeDurableObject } from "./durableObjects/presenceDurableObject";
export { GameStateDO } from "./gameDurableObject";
export { CardGameDO } from './cardGameDurableObject'

// ============================================
// 🎮 HARDCODED SANDBOX GAME
// ============================================
const SANDBOX_GAME_ID = 'regal-gray-wolf';

export type AppContext = {
  session: any | null;
  user: any | null;
  organization: Organization | null;
  userRole: string | null;
  orgError: 'ORG_NOT_FOUND' | 'NO_ACCESS' | 'ERROR' | null;
};

// Helper function to normalize URLs for main domain variants
function normalizeUrl(request: Request): Response | null {
  const url = new URL(request.url);
  const PRIMARY_DOMAIN = 'qntbr.com';
  const isLocalhost = url.hostname.includes('localhost');
  
  // Skip normalization for localhost during development
  if (isLocalhost) {
    return null;
  }

  let shouldRedirect = false;
  let newHostname = url.hostname;
  let newProtocol = url.protocol;

  // Force HTTPS in production (except localhost)
  if (url.protocol === 'http:' && !isLocalhost) {
    newProtocol = 'https:';
    shouldRedirect = true;
  }

  // Handle www removal for main domain only
  if (url.hostname === `www.${PRIMARY_DOMAIN}`) {
    newHostname = PRIMARY_DOMAIN;
    shouldRedirect = true;
  }

  // If we need to redirect, construct the new URL
  if (shouldRedirect) {
    const newUrl = `${newProtocol}//${newHostname}${url.pathname}${url.search}${url.hash}`;
    
    return new Response(null, {
      status: 301,
      headers: { Location: newUrl },
    });
  }

  return null;
}

export default defineApp([
  setCommonHeaders(),
  
  // URL NORMALIZATION MIDDLEWARE - FIRST PRIORITY
  async ({ request }) => {
    const normalizeResponse = normalizeUrl(request);
    if (normalizeResponse) {
      return normalizeResponse;
    }
  },
  
  // CONDITIONAL MIDDLEWARE - Only runs for non-auth routes
  async ({ ctx, request, headers }) => {
    try {
      // Always initialize services
      await initializeServices();

      // Check if this is a sandbox environment
      const isSandbox = isSandboxEnvironment(request);
      
      if (isSandbox) {
        await setupSandboxContext(ctx, request);
        
        // Set cookie for stable sandbox player ID
        const sandboxPlayerId = ctx.user?.id;
        if (sandboxPlayerId) {
          headers.set('Set-Cookie', createSandboxCookieHeader(sandboxPlayerId));
        }
        
        return; // Skip normal auth flow
      }
      
      // Skip middleware setup for auth routes
      if (shouldSkipMiddleware(request)) {
        return;
      }
      
      // Setup context for other routes
      await setupSessionContext(ctx, request);
      await setupOrganizationContext(ctx, request);
      
      // Handle organization errors for frontend routes
      if (ctx.orgError && 
          !request.url.includes('/api/') && 
          !request.url.includes('/__realtime') &&
          !request.url.includes('/__gsync') &&
          !request.url.includes('/__cgsync') &&
          !request.url.includes('/user/') &&
          !request.url.includes('/orgs/new') &&
          !request.url.includes('/sanctum')
        ) {

        const url = new URL(request.url);
        
        if (ctx.orgError === 'ORG_NOT_FOUND') {
          // Redirect to main domain with org creation option
          const mainDomain = url.hostname.includes('localhost') 
            ? 'localhost:5173' 
            : 'qntbr.com';
          
          const orgSlug = extractOrgFromSubdomain(request);
          return new Response(null, {
            status: 302,
            headers: { 
              Location: `${url.protocol}//${mainDomain}/orgs/new?suggested=${orgSlug}` 
            },
          });
        }
        
        if (ctx.orgError === 'NO_ACCESS') {
          // User is logged in but not a member - show join page
          return new Response(null, {
            status: 302,
            headers: { Location: `/user/login` },
          });
        }
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // Continue with empty context rather than failing
      ctx.session = null;
      ctx.user = null;
      ctx.organization = null;
      ctx.userRole = null;
      ctx.orgError = null;
    }
  },

  // REALTIME ROUTES - Handle WebSocket and presence
  prefix("/__realtime", realtimeRoutes),
  prefix("/__gsync", [
    async ({ request }) => {
      if (request.headers.get('Upgrade') === 'websocket') {
        const { rateLimitMiddleware } = await import('@/lib/middlewareFunctions');
        const rateLimitResult = await rateLimitMiddleware(request, 'gsync');
        if (rateLimitResult) return rateLimitResult;
      }
    },
    ...gameRoutes
  ]),

  prefix("/__cgsync", [
    async ({ request }) => {
      if (request.headers.get('Upgrade') === 'websocket') {
        const { rateLimitMiddleware } = await import('@/lib/middlewareFunctions');
        const rateLimitResult = await rateLimitMiddleware(request, 'cgsync');
        if (rateLimitResult) return rateLimitResult;
      }
    },
    ...cardGameRoutes
  ]),

  realtimeRoute(() => env.REALTIME_DURABLE_OBJECT as any),

  // API ROUTES - All API endpoints
  prefix("/api", [
    route("/debug/cardgame/:gameId", async ({ params, ctx }) => {
      if (!env.CARD_GAME_STATE_DO) {
        return Response.json({ error: "Card Game DO not found" });
      }
    
      const gameId = params.gameId;
      
      try {
        const id = env.CARD_GAME_STATE_DO.idFromName(gameId);
        const stub = env.CARD_GAME_STATE_DO.get(id);
        
        const response = await stub.fetch(new Request('https://fake-host/', {
          method: 'GET'
        }));
        
        if (!response.ok) {
          return Response.json({ error: "Failed to fetch card game state" });
        }
        
        const gameState = await response.json() as any;
        
        return Response.json({
          yourUserId: ctx.user?.id || null,
          yourUserName: ctx.user?.name || ctx.user?.email || null,
          playersInGame: (gameState.players || []).map((p: any) => ({
            name: p.name,
            id: p.id,
            matchesYou: p.id === ctx.user?.id
          })),
          totalPlayers: gameState.players?.length || 0
        });
      } catch (error: any) {
        return Response.json({ 
          error: "Error fetching card game", 
          message: error.message 
        });
      }
    }),
    
    route("/auth/*", async ({ request }) => {
      try {
        // Check if this is a signup request and verify Turnstile
        if (request.url.includes('/sign-up') && request.method === 'POST') {
          const body = await request.clone().json();
          
          const { turnstileToken } = body;
          
          if (turnstileToken) {
            const isValid = await verifyTurnstileToken(turnstileToken);
            if (!isValid) {
              return new Response(JSON.stringify({ 
                error: 'Bot protection verification failed' 
              }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
        }
        
        await initializeServices();
        const authInstance = initAuth();
        
        const response = await authInstance.handler(request);
        return response;
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Auth failed', 
          message: error?.message || String(error)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }),

    // Other API routes
    route("/orders/:orderDbId/notes", async ({ request, params, ctx }) => {
      if (request.method !== "POST") {
        return new Response(null, { status: 405 });
      }
      
      if (!ctx.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const body = await request.json() as { content: string; isInternal?: boolean };
      const { content, isInternal = false } = body;
      const orderDbId = parseInt(params.orderDbId);
      
      const note = await db.orderNote.create({
        data: {
          orderId: orderDbId,
          userId: ctx.user.id,
          content,
          isInternal
        },
        include: { user: true }
      });
      
      const order = await db.order.findUnique({
        where: { id: orderDbId },
        select: { orderNumber: true }
      });
      
      if (order) {
        await renderRealtimeClients({
          durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
          key: `/search/${order.orderNumber}`,
        });
      }
      
      return new Response(JSON.stringify(note), {
        headers: { "Content-Type": "application/json" }
      });
    }),

    route("/webhooks/:service", async ({ request, params, ctx }) => {
      const webhookPath = params.service;
      
      if (webhookPath === 'shipstation') {
        if (!ctx.organization) {
          return Response.json({ error: "Organization not found" }, { status: 404 });
        }
        
        const { default: handler } = await import('@/app/api/webhooks/shipstation-wh');
        return handler({ request, params, ctx });
      }
      
      return Response.json({ error: "Webhook not supported" }, { status: 404 });
    }),

    // CATCH-ALL API ROUTE - MUST BE LAST
    route("/*", async ({ request, params, ctx }) => {
      const apiPath = params["*"];
      
      if (!apiPath) {
        return new Response(
          JSON.stringify({ error: "API endpoint not specified" }), 
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      try {
        const handler = await import(`@/app/api/${apiPath}`);
        
        return await handler.default({ 
          request, 
          ctx,
          params: params,
          method: request.method 
        });
      } catch (error) {
        if (error.message?.includes('Cannot resolve module')) {
          return new Response(
            JSON.stringify({ 
              error: "API endpoint not found",
              path: `/api/${apiPath}`
            }), 
            { 
              status: 404,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: "Internal server error",
            message: error.message 
          }), 
          { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    })
  ]),

  // DIRECT WEBHOOK ROUTES
  route("/webhooks/:service", async ({ request, params, ctx }) => {
    const webhookPath = params.service;
    
    if (webhookPath === 'shipstation') {
      const { default: handler } = await import('@/app/api/webhooks/shipstation-wh');
      return handler({ request, params, ctx });
    }
    
    return Response.json({ error: "Webhook not supported" }, { status: 404 });
  }),

  // FRONTEND ROUTES
  render(Document, [
    route("/org-not-found", ({ request }) => {
      const url = new URL(request.url);
      const slug = url.searchParams.get('slug');
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Organization Not Found</h1>
          <p>The organization "{slug}" doesn't exist.</p>
          <a href="/">Return to Home</a>
        </div>
      );
    }),
    
    route("/no-access", ({ request }) => {
      const url = new URL(request.url);
      const slug = url.searchParams.get('slug');
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Access Denied</h1>
          <p>You don't have access to the organization "{slug}".</p>
          <a href="/">Return to Home</a>
        </div>
      );
    }),

    // SPECIFIC ROUTES FIRST
    // FIND THE /sanctum ROUTE AND ADD THIS CHECK AT THE TOP:
    route("/sanctum", SanctumPage),

    
    prefix("/user", userRoutes),
    
    // Static content routes
    ...staticRoutes,

    // Game routes
    route("/game", async ({ request }) => {
      const orgSlug = extractOrgFromSubdomain(request) || 'default';
      const result = await createNewGame(orgSlug);
      
      if (!result.success) {
        return new Response(null, {
          status: 302,
          headers: { 
            Location: `/sanctum?error=${encodeURIComponent(result.error || 'Failed to create game')}`
          }
        });
      }
      
      return new Response(null, {
        status: 302,
        headers: { Location: `/game/${result.gameId}` }
      });
    }),
    route("/game/:gameId", GamePage),

    // ============================================
    // 🎮 CARD GAME ROUTES - SANDBOX HARDCODED
    // ============================================
    route("/cardGame", async ({ request, ctx }) => {
      const isSandbox = isSandboxEnvironment(request);
      
      // ✅ SANDBOX: Use existing createOrGetSandboxGame()
      if (isSandbox) {
        const { createOrGetSandboxGame } = await import('./app/serverActions/cardGame/cardGameRegistry');
        const result = await createOrGetSandboxGame();
        
        if (!result.success) {
          return new Response(null, {
            status: 302,
            headers: { 
              Location: `/sanctum?error=${encodeURIComponent(result.error || 'Failed to get sandbox game')}`
            }
          });
        }
        
        // Redirect to the hardcoded game
        return new Response(null, {
          status: 302,
          headers: { Location: `/cardGame/${result.cardGameId}` }
        });
      }
      
      // ✅ NORMAL: Create new org game (keep existing code)
      const orgSlug = extractOrgFromSubdomain(request) || 'default';
      
      const result = await createNewCardGame(orgSlug, {
        creatorUserId: ctx.user?.id,
        isSandbox: false,
        maxPlayers: 8,
      });
      
      if (!result.success) {
        return new Response(null, {
          status: 302,
          headers: { 
            Location: `/sanctum?error=${encodeURIComponent(result.error || 'Failed to create game')}`
          }
        });
      }
      
      return new Response(null, {
        status: 302,
        headers: { Location: `/cardGame/${result.cardGameId}` }
      });
    }),
    
    route("/cardGame/:cardGameId", CardGamePage),

    // ROOT ROUTE - AFTER all specific routes
    route("/", [
      ({ ctx, request }) => {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // Skip processing for non-root paths
        if (pathname !== '/') {
          return;
        }
        
        // Skip processing for auth routes
        if (pathname.startsWith('/user/') || pathname.startsWith('/auth/')) {
          return;
        }

        // ✅ SANDBOX: Redirect to /cardGame (which handles hardcoded game)
        if (isSandboxEnvironment(request)) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/cardGame" },
          });
        }
        
        const orgSlug = extractOrgFromSubdomain(request);
        
        // ✅ MAIN DOMAIN: Show landing page
        if (!orgSlug) {
          return; // Fall through to LandingPage
        }
        
        // ✅ ORG SUBDOMAIN: Handle based on auth
        if (ctx.orgError) {
          return; // Let middleware handle redirects
        }
        
        // If we have an organization but user isn't logged in or doesn't have role
        if (ctx.organization && (!ctx.user || !ctx.userRole)) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/user/login" },
          });
        }

        // If user is authenticated and has access to org
        if (ctx.organization && ctx.user && ctx.userRole) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/sanctum" },
          });
        }
      },
      LandingPage,  // ✅ Changed from HomePage (if it was HomePage before)
    ]),

    // CATCH-ALL ROUTE - Redirect unknown paths to home
    route("/*", ({ request }) => {
      const url = new URL(request.url);
      
      // Skip catch-all for API routes (already handled above)
      if (url.pathname.startsWith('/api/') || 
          url.pathname.startsWith('/__realtime') ||
          url.pathname.startsWith('/__gsync') ||
          url.pathname.startsWith('/__cgsync') ||
          url.pathname.startsWith('/webhooks/')) {
        return;
      }
      
      // Redirect all unknown routes to home page
      return new Response(null, {
        status: 301,
        headers: { Location: "/" },
      });
    }),
  ]),
]);