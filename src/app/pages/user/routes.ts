import { route } from "rwsdk/router";
import LoginPage from "./Login";
import BetterAuthSignup from "./BetterAuthSignup";
import { getAuthInstance } from "@/lib/middlewareFunctions";

export const userRoutes = [
  route("/login", LoginPage),
  
  route("/logout", async function ({ request }) {
    const authInstance = getAuthInstance();
    return authInstance.handler(request);
  }),
  
  route("/signup", BetterAuthSignup),
];