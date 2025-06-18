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
import { type User, db, setupDb } from "@/db";
import { env } from "cloudflare:workers";
export { SessionDurableObject } from "./session/durableObject";
export { RealtimeDurableObject } from "rwsdk/realtime/durableObject";

export type AppContext = {
  session: Session | null;
  user: User | null;
};

export default defineApp([
  setCommonHeaders(),
  
  // 🔧 SHARED MIDDLEWARE - runs for all routes
  async ({ ctx, request, headers }) => {
    await setupDb(env);
    setupSessionStore(env);

    try {
      ctx.session = await sessions.load(request);
    } catch (error) {
      if (error instanceof ErrorResponse && error.code === 401) {
        await sessions.remove(request, headers);
        headers.set("Location", "/user/login");

        return new Response(null, {
          status: 302,
          headers,
        });
      }

      throw error;
    }

    if (ctx.session?.userId) {
      ctx.user = await db.user.findUnique({
        where: {
          id: ctx.session.userId,
        },
      });
    }
  },
  route("/api/orders/:orderDbId/notes", async ({ request, params, ctx }) => {
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
      // Trigger realtime update for all clients viewing this order
      console.log('Triggering realtime update for key:', `/search/${order.orderNumber}`);
  
      // Trigger realtime update for all clients viewing this order
      await renderRealtimeClients({
        durableObjectNamespace: env.REALTIME_DURABLE_OBJECT,
        key: `/search/${order.orderNumber}`,
      });
      
      console.log('Realtime update triggered successfully');
    }
    
    return new Response(JSON.stringify(note), {
      headers: { "Content-Type": "application/json" }
    });
  }),
  render(Document, [
    // 🚫 NON-REALTIME ROUTES (auth, simple pages)
    // These run BEFORE realtimeRoute, so they won't use WebSockets
    route("/", () => new Response("Hello, World!")),
    route("/client-test", () => (
      <div style={{ padding: '20px' }}>
        <h1>Testing Client Component</h1>
        <TestButtonClient />
      </div>
    )),
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

    // 🔄 ENABLE REALTIME for everything below this point
    realtimeRoute(() => env.REALTIME_DURABLE_OBJECT),
    
    // ⚡ REALTIME ROUTES (live updates, interactive features)
    // These run AFTER realtimeRoute, so they can use WebSockets
    route("/search/:orderNumber", async function ({ params, ctx }) {
      return <OrderSearchPage orderNumber={params.orderNumber} currentUser={ctx.user} />;
    }),
    
    // Add other routes that need realtime here
  ]),
]);