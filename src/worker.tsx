import { defineApp, ErrorResponse, requestInfo } from "rwsdk/worker";
import { realtimeRoute, renderRealtimeClients } from "rwsdk/realtime/worker";
import { route, render, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import TestButtonClient from "@/app/TestButtonClient";
import { OrderSearchPage } from "@/app/pages/search/OrderSearchPage";
import { Home } from "@/app/pages/Home";
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
// import { sessions, setupSessionStore } from "./session/store";
// import { Session } from "./session/durableObject";
import { auth, initAuth } from "@/lib/auth";
import { type User, type Organization, db, setupDb } from "@/db";
import AdminPage from "@/app/pages/admin/Admin";
import HomePage from "@/app/pages/home/HomePage";
import OrgDashboard from "@/app/components/Organizations/OrgDashboard";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { 
  initializeServices, 
  setupOrganizationContext, 
  setupSessionContext, 
  extractOrgFromSubdomain,
  shouldSkipMiddleware 
} from "@/lib/middlewareFunctions";
import { env } from "cloudflare:workers";
import CreateOrgPage from "@/app/pages/orgs/CreateOrgPage";
import AsanaPage from "@/app/pages/asana/AsanaPage";
import { settingsRoutes } from "./app/pages/settings/settingsRoutes";
import { verifyTurnstileToken } from "@/lib/turnstile";
import ShipstationPage from "./app/pages/shipstation/ShipstationPage";

export { SessionDurableObject } from "./session/durableObject";
export { PresenceDurableObject as RealtimeDurableObject } from "./durableObjects/presenceDurableObject";

export type AppContext = {
  session: any | null;
  user: any | null; // Change from User | null to any | null
  organization: Organization | null;
  userRole: string | null;
  orgError: 'ORG_NOT_FOUND' | 'NO_ACCESS' | 'ERROR' | null;
};

export default defineApp([
  setCommonHeaders(),
  
  // 🔧 CONDITIONAL MIDDLEWARE - Only runs for non-auth routes
  async ({ ctx, request, headers }) => {
    // Always initialize services
    await initializeServices();
    
    // Skip middleware setup for auth routes
    if (shouldSkipMiddleware(request)) {
      console.log('🔍 Skipping middleware for:', new URL(request.url).pathname);
      return;
    }
    
    // Setup context for other routes
    await setupSessionContext(ctx, request);
    await setupOrganizationContext(ctx, request);
    
    // Handle organization errors for frontend routes
   if (ctx.orgError && 
      !request.url.includes('/api/') && 
      !request.url.includes('/__realtime') &&
      !request.url.includes('/user/') &&
      !request.url.includes('/orgs/new')) {

      const url = new URL(request.url);
      
      if (ctx.orgError === 'ORG_NOT_FOUND') {
        // Redirect to main domain with org creation option
        const mainDomain = url.hostname.includes('localhost') 
          ? 'localhost:5173' 
          : url.hostname.split('.').slice(-2).join('.');
        
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
  },

  // 🔌 REALTIME ROUTES - Handle WebSocket and presence
  route("/__realtime/presence", async ({ request }) => {
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

  route("/__realtime", async ({ request }) => {
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

  realtimeRoute(() => env.REALTIME_DURABLE_OBJECT as any),

  // 🚀 API ROUTES - All API endpoints
  // 🚀 API ROUTES - All API endpoints
  prefix("/api", [
    
    // 🔐 AUTH ROUTES - HIGHEST PRIORITY, NO MIDDLEWARE INTERFERENCE
    route("/debug", async () => {
      return new Response("Debug route works!", { status: 200 });
    }),

    route("/auth/test-db", async () => {
      try {
        // Test basic database operations
        const userCount = await db.user.count();
        console.log('User count:', userCount);
        
        // Test creating a simple user directly with Prisma
        const testUser = await db.user.create({
          data: {
            id: "test-" + Date.now(),
            email: "test@example.com",
            name: "Test User",
            emailVerified: false,
          }
        });
        
        return new Response(JSON.stringify({ 
          userCount, 
          testUser: testUser.id 
        }));
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message 
        }), { status: 500 });
      }
    }),
    route("/auth/test-main-instance", async ({ request }) => {
      try {
        await initializeServices();
        const authInstance = initAuth();
        
        const uniqueEmail = `test-${Date.now()}@example.com`;
        
        const result = await authInstance.api.signUpEmail({
          body: {
            email: uniqueEmail,
            password: "password123", 
            name: "Test User"
          },
          headers: request.headers
        });
        
        return new Response(JSON.stringify(result));
        
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack,
        }), { status: 500 });
      }
    }),
   route("/auth/test-signup", async ({ request }) => {
      try {
        const { admin } = await import("better-auth/plugins");
        const { organization } = await import("better-auth/plugins");
        const { apiKey } = await import("better-auth/plugins");
        const { multiSession } = await import("better-auth/plugins");
        
        const testAuth = betterAuth({
          database: prismaAdapter(db, {
            provider: "sqlite",
          }),
          secret: env.BETTER_AUTH_SECRET,
          baseURL: env.BETTER_AUTH_URL,
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
          },
          plugins: [
            admin({
              defaultRole: "admin",
              adminRoles: ["admin"],
              defaultBanReason: "Violated terms of service",
              defaultBanExpiresIn: 60 * 60 * 24 * 7,
              impersonationSessionDuration: 60 * 60,
            }),
            organization(),
            apiKey(),
            multiSession({
              maximumSessions: 3
            }),
          ],
          session: {
            expiresIn: 60 * 60 * 24 * 7,
            updateAge: 60 * 60 * 24,
          },
          trustedOrigins: [
            "quinncodes.com",
            "*.quinncodes.com",
            "localhost:5173",
            "*.localhost:5173",
            "localhost:8787",
            "*.localhost:8787",
          ],
        });
        
        const uniqueEmail = `test-${Date.now()}@example.com`;
        
        const result = await testAuth.api.signUpEmail({
          body: {
            email: uniqueEmail,
            password: "password123", 
            name: "Test User"
          },
          headers: request.headers
        });
        
        return new Response(JSON.stringify(result));
        
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack,
        }), { status: 500 });
      }
    }),
    route("/auth/debug-main", async ({ request }) => {
      try {
        console.log('🔍 About to import main auth...');
        
        const authModule = await import("@/lib/auth");
        console.log('🔍 Auth module imported:', !!authModule);
        console.log('🔍 Auth instance exists:', !!authModule.auth);
        console.log('🔍 Auth instance type:', typeof authModule.auth);
        
        // Try to access auth properties
        console.log('🔍 Auth.api exists:', !!authModule.auth?.api);
        console.log('🔍 Auth.api.signUpEmail exists:', !!authModule.auth?.api?.signUpEmail);
        
        return new Response(JSON.stringify({
          hasAuth: !!authModule.auth,
          hasApi: !!authModule.auth?.api,
          hasSignUp: !!authModule.auth?.api?.signUpEmail,
          authType: typeof authModule.auth,
        }));
        
      } catch (error) {
        console.error('🚨 Error importing main auth:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack,
        }), { status: 500 });
      }
    }),
    route("/auth/*", async ({ request }) => {
      try {
        // Check if this is a signup request and verify Turnstile
        if (request.url.includes('/sign-up') && request.method === 'POST') {
          const body = await request.clone().json();
          console.log('📋 Full signup request body:', JSON.stringify(body, null, 2));
          
          const { turnstileToken } = body;
          console.log('🔍 Extracted turnstileToken:', turnstileToken);
          
          if (turnstileToken) {
            console.log('🔒 Turnstile token received, verifying...');
            const isValid = await verifyTurnstileToken(turnstileToken);
            if (!isValid) {
              console.log('❌ Turnstile verification FAILED');
              return new Response(JSON.stringify({ 
                error: 'Bot protection verification failed' 
              }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            console.log('✅ Turnstile verification PASSED');
          } else {
            console.log('⚠️ No Turnstile token provided in signup request');
          }
        }
        
        await initializeServices(); // Sets up db
        const authInstance = initAuth(); // Now creates auth with valid db
        
        const response = await authInstance.handler(request);
        return response;
      } catch (error) {
        console.error('🚨 Auth route error:', error);
        return new Response(JSON.stringify({ 
          error: 'Auth failed', 
          message: error?.message || String(error)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }),

    // Other API routes follow...
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
        console.log('🚀 Calling renderRealtimeClients with key:', `/search/${order.orderNumber}`);
        
        await renderRealtimeClients({
          durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
          key: `/search/${order.orderNumber}`,
        });
        
        console.log('✅ renderRealtimeClients completed');
      }
      
      return new Response(JSON.stringify(note), {
        headers: { "Content-Type": "application/json" }
      });
    }),

    route("/protected", async ({ request, ctx }) => {
      const authInstance = auth;
      const session = await authInstance.api.getSession({
        headers: request.headers
      });
      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response(`Hello ${session?.user?.name}!`);
    }),

    route("/webhooks/:service", async ({ request, params, ctx }) => {
      const webhookPath = params.service;
      console.log('📦 API Service:', webhookPath);
      
      if (webhookPath === 'shipstation') {
        if (!ctx.organization) {
          console.error('❌ No organization context for API webhook');
          return Response.json({ error: "Organization not found" }, { status: 404 });
        }
        
        const { default: handler } = await import('@/app/api/webhooks/shipstation-wh');
        return handler({ request, params, ctx });
      }
      
      return Response.json({ error: "Webhook not supported" }, { status: 404 });
    }),

    // 🎯 CATCH-ALL API ROUTE - MUST BE LAST
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
        console.error(`API route not found: /api/${apiPath}`, error);
        
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

  // 🔗 DIRECT WEBHOOK ROUTES
  route("/webhooks/:service", async ({ request, params, ctx }) => {
    const webhookPath = params.service;
    console.log('📦 Direct Webhook Service:', webhookPath);
    
    if (webhookPath === 'shipstation') {
      const { default: handler } = await import('@/app/api/webhooks/shipstation-wh');
      return handler({ request, params, ctx });
    }
    
    return Response.json({ error: "Webhook not supported" }, { status: 404 });
  }),

  route("/debug-env", async () => {
    return new Response(JSON.stringify({
      hasSecret: !!env.BETTER_AUTH_SECRET,
      secretLength: env.BETTER_AUTH_SECRET?.length,
      baseURL: env.BETTER_AUTH_URL,
      hasDB: !!env.DB,
    }));
  }),

  // 🎨 FRONTEND ROUTES
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

    route("/", [
      ({ ctx, request }) => {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        if (pathname.startsWith('/user/') || pathname.startsWith('/auth/')) {
          return;
        }
        
        if (pathname !== '/') {
          return;
        }
        
        const orgSlug = extractOrgFromSubdomain(request);
        
        // 🔍 ADD DEBUG LOGGING
        console.log('🔍 Debug info:', {
          orgSlug,
          hasOrganization: !!ctx.organization,
          hasUser: !!ctx.user,
          userRole: ctx.userRole,
          orgError: ctx.orgError
        });
        
        //send to landing page with logins if no org
        if (!orgSlug) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/landing" },
          });
        }
        
        // 🚨 FIX: Handle org errors properly
        if (ctx.orgError) {
          // Let the middleware handle the org error redirects
          return;
        }
        
        // If we have an organization but user isn't logged in or doesn't have role
        if (ctx.organization && (!ctx.user || !ctx.userRole)) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/user/login" },
          });
        }

        if (ctx.organization && ctx.user && ctx.userRole) {
          console.log('✅ Redirecting authenticated user to dashboard');
          return new Response(null, {
            status: 302,
            headers: { Location: "/dashboard" },
          });
        }
      },
      HomePage,
    ]),

    //different that home page
    route("/landing", HomePage),
    route("/shipstation", ShipstationPage),
    // route("/shipstation/*", ShipstationPage),
    route("/shipstation/dashboard", ShipstationPage),
    route("/shipstation-dashboard", ShipstationPage),
    route("/asana", AsanaPage),
    route("/admin", AdminPage),
    // route("/client-test", () => (
    //   <div style={{ padding: '20px' }}>
    //     <h1>Testing Client Component</h1>
    //     <TestButtonClient />
    //   </div>
    // )),
    route("/orgs/new", CreateOrgPage),
    prefix("/user", userRoutes),
    
    // route("/protected", [
    //   ({ ctx }) => {
    //     if (!ctx.user) {
    //       return new Response(null, {
    //         status: 302,
    //         headers: { Location: "/user/login" },
    //       });
    //     }
    //   },
    //   Home,
    // ]),

    route("/dashboard", OrgDashboard),

    route("/search/:orderNumber", async ({ params, ctx }) => {
      if (ctx.organization && (!ctx.user || !ctx.userRole)) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/user/login" }
        });
      }
      
      if (!ctx.organization) {
        return new Response("Organization not found", { status: 404 });
      }
      
      return <OrderSearchPage 
        orderNumber={params.orderNumber} 
        currentUser={ctx.user} 
        organizationId={ctx.organization.id}
      />;
    }),

    prefix("/settings", settingsRoutes)

  ]),
]);