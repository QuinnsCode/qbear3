import { defineApp, ErrorResponse } from "rwsdk/worker";
import { realtimeRoute, renderRealtimeClients } from "rwsdk/realtime/worker";
import { route, render, prefix } from "rwsdk/router";
import { Document } from "@/app/Document";
import TestButtonClient from "@/app/TestButtonClient";
import { OrderSearchPage } from "@/app/pages/search/OrderSearchPage";
import { Home } from "@/app/pages/Home";
import { setCommonHeaders } from "@/app/headers";
import { userRoutes } from "@/app/pages/user/routes";
import { sessions, setupSessionStore } from "./session/store";
import { Session } from "./session/durableObject";
import { type User, type Organization, db, setupDb } from "@/db";
import AdminPage from "@/app/pages/admin/Admin";
import HomePage from "@/app/pages/home/HomePage";
import OrgDashboard from "@/app/components/Organizations/OrgDashboard";
import OrgLanding from "@/app/pages/orgs/OrgLanding";
import { initializeServices, setupOrganizationContext, setupSessionContext, getAuthInstance, extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { env } from "cloudflare:workers";
import CreateOrgPage from "@/app/pages/orgs/CreateOrgPage";


export { SessionDurableObject } from "./session/durableObject";
export { PresenceDurableObject as RealtimeDurableObject } from "./durableObjects/presenceDurableObject";

export type AppContext = {
  session: Session | null;
  user: User | null;
  organization: Organization | null;
  userRole: string | null;
  orgError: 'ORG_NOT_FOUND' | 'NO_ACCESS' | 'ERROR' | null;
};

export default defineApp([
  setCommonHeaders(),
  
  // 🔧 SHARED MIDDLEWARE - runs for all routes
  async ({ ctx, request, headers }) => {
    await initializeServices();
    await setupSessionContext(ctx, request);
    await setupOrganizationContext(ctx, request);
    
    // Handle organization errors for frontend routes
    if (ctx.orgError && !request.url.includes('/api/') && !request.url.includes('/__realtime')) {
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
          headers: { Location: `/user/login` }, // Changed to use existing user routes
        });
      }
    }
  },

  // 🔌 REALTIME ROUTES - Handle WebSocket and presence
  route("/__realtime/presence", async ({ request }) => {
    // Forward presence requests to the Durable Object
    // Use the same key as the realtime connection
    let key = '/default';
    
    if (request.method === 'POST') {
      try {
        // Clone the request so we can read the body without consuming it
        const clonedRequest = request.clone();
        const body = await clonedRequest.json() as { pathname?: string; userId?: string; username?: string; action?: string };
        key = body?.pathname || '/default';
      } catch (e) {
        // If JSON parsing fails, use default key
      }
    } else if (request.method === 'GET') {
      // For GET requests, get the key from query params
      const url = new URL(request.url);
      key = url.searchParams.get('key') || '/default';
    }
    
    console.log('🔑 Using presence key:', key);
    
    const durableObjectId = (env.REALTIME_DURABLE_OBJECT as any).idFromName(key);
    const durableObject = (env.REALTIME_DURABLE_OBJECT as any).get(durableObjectId);
    
    return durableObject.fetch(request);
  }),

  route("/__realtime", async ({ request }) => {
    // Handle WebSocket upgrades with key-based routing
    if (request.headers.get("Upgrade") === "websocket") {
      // Get the key from query parameters
      const url = new URL(request.url);
      const key = url.searchParams.get('key') || '/default';
      
      console.log('🔌 WebSocket connecting with key:', key);
      
      const durableObjectId = (env.REALTIME_DURABLE_OBJECT as any).idFromName(key);
      const durableObject = (env.REALTIME_DURABLE_OBJECT as any).get(durableObjectId);
      
      return durableObject.fetch(request);
    }
    
    // For non-WebSocket requests, return a 400 error or handle appropriately
    return new Response("WebSocket upgrade required", { status: 400 });
  }),

  realtimeRoute(() => env.REALTIME_DURABLE_OBJECT as any),

  // 🚀 API ROUTES - All API endpoints
  prefix("/api", [
    // Specific API routes first (highest priority)
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
      
      // Get the order number to construct the realtime key
      const order = await db.order.findUnique({
        where: { id: orderDbId },
        select: { orderNumber: true }
      });
      
      if (order) {
        console.log('🚀 Calling renderRealtimeClients with key:', `/search/${order.orderNumber}`);
        console.log('Current pathname should be:', `/search/${order.orderNumber}`);
        
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

    route("/auth/*", async ({ request }) => {
      const authInstance = getAuthInstance();
      return authInstance.handler(request);
    }),

    route("/protected", async ({ request, ctx }) => {
      const authInstance = getAuthInstance();
      const session = await authInstance.api.getSession({
        headers: request.headers
      });
      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response(`Hello ${session.user.name}!`);
    }),

    route("/webhooks/:service", async ({ request, params, ctx }) => {
      const webhookPath = params.service;
      console.log('📦 API Service:', webhookPath);
      console.log('📦 Organization:', ctx.organization?.slug);
      
      if (webhookPath === 'shipstation') {
        // Verify we have org context for webhook processing
        if (!ctx.organization) {
          console.error('❌ No organization context for API webhook');
          return Response.json({ error: "Organization not found" }, { status: 404 });
        }
        
        // Direct import instead of dynamic
        const { default: handler } = await import('@/app/api/webhooks/shipstation-wh');
        return handler({ request, params, ctx }); // Pass ctx instead of organization
      }
      
      return Response.json({ error: "Webhook not supported" }, { status: 404 });
    }),

    // 🎯 CATCH-ALL API ROUTE - handles dynamic API routes from /api folder
    route("/*", async ({ request, params, ctx }) => {
      const apiPath = params["*"]; // Gets the remaining path after /api/
      
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
        // Dynamic import from your app/api folder
        // Example: /api/users/profile -> imports from @/app/api/users/profile
        const handler = await import(`@/app/api/${apiPath}`);
        
        // Call the default export with context
        return await handler.default({ 
          request, 
          ctx,
          params: params, // Pass through any route params
          method: request.method 
        });
      } catch (error) {
        console.error(`API route not found: /api/${apiPath}`, error);
        
        // Check if it's a module not found error
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
        
        // Other errors (like handler throwing an error)
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

  // 🔗 DIRECT WEBHOOK ROUTES - Handle legacy webhook URLs
  route("/webhooks/:service", async ({ request, params, ctx }) => {
    const webhookPath = params.service;
    console.log('📦 Direct Webhook Service:', webhookPath);
    console.log('📦 Organization:', ctx.organization?.slug);
    
    if (webhookPath === 'shipstation') {
      const { default: handler } = await import('@/app/api/webhooks/shipstation-wh');
      return handler({ request, params, ctx }); // Pass ctx
    }
    
    return Response.json({ error: "Webhook not supported" }, { status: 404 });
  }),

  // 🎨 FRONTEND ROUTES - Pages and UI
  render(Document, [
    // 🚫 ERROR PAGES - Handle org access issues
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

    // 🏠 MAIN DOMAIN ROUTES
    route("/", [
      ({ ctx }) => {
        if (ctx.organization && (!ctx.user || !ctx.userRole)) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/user/login" },
          });
        }
      },
      (requestInfo) => {
        const { ctx } = requestInfo;
        console.log(ctx)
        if (!ctx.organization) {
          return <HomePage {...requestInfo} />;
        }
        return <OrgLanding {...requestInfo} />;
      },
    ]),
    route("/admin", AdminPage),
    
    route("/client-test", () => (
      <div style={{ padding: '20px' }}>
        <h1>Testing Client Component</h1>
        <TestButtonClient />
      </div>
    )),

    route("/orgs/new", CreateOrgPage),

    prefix("/user", userRoutes), // 🔑 AUTH ROUTES - NO REALTIME
    
    route("/protected", [
      ({ ctx }) => {
        if (!ctx.user) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/user/login" },
          });
        }
      },
      Home,
    ]),

    // 🏢 ORG-SPECIFIC ROUTES - Add a simple dashboard for when users are on org subdomains
    route("/dashboard", OrgDashboard),

    // 🔄 ENABLE REALTIME for everything below this point
    // this is configured in client.tsx
    // ⚡ REALTIME ROUTES (live updates, interactive features)
    route("/search/:orderNumber", async ({ params, ctx }) => {
      // Check org access for search
      if (ctx.organization && (!ctx.user || !ctx.userRole)) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/user/login" }
        });
      }
      
      return <OrderSearchPage orderNumber={params.orderNumber} currentUser={ctx.user} />;
    }),
    // Add other routes that need realtime here
  ]),
]);