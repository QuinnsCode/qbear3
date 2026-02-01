import { defineApp, ErrorResponse, requestInfo } from "rwsdk/worker";
// import { realtimeRoute } from "rwsdk/realtime/worker";
// import { syncOrderNotes } from "./lib/syncedState";
import { route, render, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
import { changelogRoute, aboutRoute,termsRoute  } from "@/app/pages/staticRoutes";
import { gameRoutes } from "./app/pages/game/gameRoutes";
import { draftRoutes } from "@/app/pages/draft/draftRoutes"
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
import { draftWebSocketMiddleware } from '@/lib/userIdentity'
import { env } from "cloudflare:workers";
import { verifyTurnstileToken } from "@/lib/turnstile";
import GamePage from "@/app/pages/game/GamePage";
import CardGamePage from "@/app/pages/cardGame/CardGamePage";
import DraftPage from '@/app/pages/draft/DraftPage'
import NewDraftPage from '@/app/pages/draft/NewDraftPage'
import SanctumPage from "@/app/pages/sanctum/SanctumPage";
import OrgNotFoundPage from "@/app/pages/errors/OrgNotFoundPage";
import NoAccessPage from "@/app/pages/errors/NoAccessPage";
import PricingPage from "@/app/pages/pricing/PricingPage";
import { createNewGame } from "./app/serverActions/gameRegistry";
import { createNewCardGame } from "./app/serverActions/cardGame/cardGameRegistry";
import { isSandboxEnvironment, setupSandboxContext, createSandboxCookieHeader } from "./lib/middleware/sandboxMiddleware";
import LandingPage from "./app/pages/landing/LandingPage";
import DeckBuilderPage from "./app/pages/deckBuilder/DeckBuilderPage";
import { SANDBOX_CONFIG } from "./lib/sandbox/config";
import { SyncedStateServer, syncedStateRoutes } from "rwsdk/use-synced-state/worker";

export { SessionDurableObject } from "./session/durableObject";
export { PresenceDurableObject as RealtimeDurableObject } from "./durableObjects/presenceDurableObject";
export { GameStateDO } from "./gameDurableObject";
export { CardGameDO } from './cardGameDurableObject'
export { DraftDO } from './draftDurableObject'
export { UserSessionDO } from './durableObjects/userSessionDO'

export { CardCacheDO } from './cardCacheDO'
export { SyncedStateServer };


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
  // CONDITIONAL MIDDLEWARE - Only runs for non-auth routes
  async ({ ctx, request, response }) => {
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
          response.headers.set('Set-Cookie', createSandboxCookieHeader(sandboxPlayerId));
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
      
      // ✅ NEW: Check if user needs org
      const url = new URL(request.url);
      if (ctx.user &&
          !url.pathname.startsWith('/api/') &&
          !url.pathname.startsWith('/user/create-lair') &&
          url.pathname !== '/') {

        const { getCachedUserMemberships } = await import('@/lib/cache/authCache');
        const memberships = await getCachedUserMemberships(ctx.user.id);

        if (memberships.length === 0) {
          console.log('⚠️ User has no organization, redirecting to create lair');
          return new Response(null, {
            status: 302,
            headers: { Location: '/user/create-lair' }
          });
        }
      }
      
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

  ...syncedStateRoutes(() => env.SYNCED_STATE_SERVER),

  // REALTIME ROUTES - Handle WebSocket and presence
  prefix("/__realtime", realtimeRoutes),

  //sync for risk like game
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

  //sync for card games
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

  //sync for draft system
  prefix("/__draftsync", [
    async ({ request, ctx }) => {
      if (request.headers.get('Upgrade') === 'websocket') {
        // Rate limiting
        const { rateLimitMiddleware } = await import('@/lib/middlewareFunctions')
        const rateLimitResult = await rateLimitMiddleware(request, 'draftsync')
        if (rateLimitResult) return rateLimitResult

        // Add auth headers for guests/users
        request = await draftWebSocketMiddleware(request, ctx)
      }
    },
    ...draftRoutes
  ]),

  // User Session DO - Cross-device sync with Hibernation API
  route("/__user-session", async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    // Get or create User Session DO for this user
    const id = env.USER_SESSION_DO.idFromName(userId);
    const stub = env.USER_SESSION_DO.get(id);

    // Forward request to DO (will handle WebSocket upgrade)
    return stub.fetch(request);
  }),

  // realtimeRoute(() => env.REALTIME_DURABLE_OBJECT as any),

  // API ROUTES - All API endpoints
  prefix("/api", [
    route("/stripe/create-checkout", async ({ request }) => {
      const { default: handler } = await import('@/app/api/stripe/create-checkout');
      return handler({ request });
    }),

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
        // await syncOrderNotes(order.orderNumber, note);
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

      if (webhookPath === 'stripe') {
        const { default: handler } = await import('@/app/api/webhooks/stripe-wh');
        return handler({ request });
      }

      if (webhookPath === 'lemonsqueezy') {
        const { default: handler } = await import('@/app/api/webhooks/lemonsqueezy-wh');
        return handler({ request, params, ctx });
      }
      
      return Response.json({ error: "Webhook not supported" }, { status: 404 });
    }),

    // CATCH-ALL API ROUTE - MUST BE LAST
    route("*", async ({ request, params, ctx }) => {  // Changed from "/*"
      const apiPath = params.$0;  // Changed from params["*"]
      
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
        const handler = await import(/* @vite-ignore */ `@/app/api/${apiPath}`);
        
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

    if (webhookPath === 'stripe') {
      const { default: handler } = await import('@/app/api/webhooks/stripe-wh');
      return handler({ request });
    }
    
    return Response.json({ error: "Webhook not supported" }, { status: 404 });
  }),

  // FRONTEND ROUTES
  render(Document, [
    route("/org-not-found", OrgNotFoundPage),
    
    route("/no-access", NoAccessPage),

    route("/sanctum", SanctumPage),

    route("/deckbuilder", DeckBuilderPage),
    route("/deckBuilder", DeckBuilderPage),
    route("/deck-builder", DeckBuilderPage),
    route("/deckbuilder/:deckId", DeckBuilderPage),
    route("/deckBuilder/:deckId", DeckBuilderPage),
    route("/deck-builder/:deckId", DeckBuilderPage),

    route("/pricing", PricingPage),

    
    prefix("/user", userRoutes),
    
    // Static content routes
    changelogRoute,
    aboutRoute,
    termsRoute,

    // Game routes
    // @ts-expect-error - RWSDK type inference issue
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
    // @ts-expect-error - RWSDK type inference issue
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
    
    route("/cardGame/:cardGameId", [
      async ({ params, request }) => {
        const isSandbox = isSandboxEnvironment(request);
        
        // ✅ Force sandbox to ONLY use the hardcoded game
        if (isSandbox && params.cardGameId !== SANDBOX_CONFIG.GAME_ID) {
          console.log(`🚫 Blocked sandbox access to ${params.cardGameId}, redirecting to ${SANDBOX_CONFIG.GAME_ID}`);
          return new Response(null, {
            status: 302,
            headers: { Location: `/cardGame/${SANDBOX_CONFIG.GAME_ID}` }
          });
        }
        // ✅ Important: return undefined to allow next handler to run
        return undefined;
      },
      CardGamePage
    ]),

    route("/draft/new", NewDraftPage),
    route("/draft/:draftId", DraftPage),


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