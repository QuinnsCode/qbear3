// lib/auth-client-v2.ts
// TEST CLIENT - Uses /api/auth-v2/* routes
// Once verified working, we'll update auth-client.ts to use this

import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";
import { apiKeyClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins"
import { multiSessionClient } from "better-auth/client/plugins"

export const authClientV2 = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
  basePath: "/api/auth-v2",  // 🧪 TEST: Use v2 routes
  plugins: [
    adminClient(),
    organizationClient(),
    apiKeyClient(),
    multiSessionClient(),
  ]
});
