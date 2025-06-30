import { route } from "rwsdk/router";
import { sessions } from "@/session/store";
import LoginPage from "./Login";
import BetterAuthSignup from "./BetterAuthSignup";
import { getAuthInstance } from "@/lib/middlewareFunctions";
import type { AppContext } from "@/worker";

export const userRoutes = [
  route("/login", ({ ctx, request }: { ctx: AppContext; request: Request }) => {
    // ctx is available here!
    console.log("Current user:", ctx.user);
    console.log("Current org:", ctx.organization?.name);
    
    // No need to redirect here since LoginPage handles it
    return LoginPage({ ctx });
  }),
  
  route("/logout", async function ({ request, ctx }: { request: Request; ctx: AppContext }) {
    // Use the proper auth logout instead of sessions
    const authInstance = getAuthInstance();
    return authInstance.handler(request); // This handles the logout
  }),
  
  route("/signup", ({ ctx, request }: { ctx: AppContext; request: Request }) => {
    // No need to redirect here since BetterAuthSignup can handle it
    return BetterAuthSignup({ ctx });
  }),
];