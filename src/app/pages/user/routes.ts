import { route } from "rwsdk/router";
import LoginPage from "./Login";
import BetterAuthSignup from "./BetterAuthSignup";

export const userRoutes = [
  route("/login", LoginPage),
  
  route("/logout", async function ({ request }) {
    // Import auth directly instead of using getAuthInstance
    const { auth } = await import("@/lib/auth");
    return auth.handler(request);
  }),
  
  route("/signup", BetterAuthSignup),
];