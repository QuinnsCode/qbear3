// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import { apiKey } from "better-auth/plugins"
import { multiSession } from "better-auth/plugins"
import { env } from "cloudflare:workers";
import { db } from "@/db";
 
// export const auth = betterAuth({
//     database: prismaAdapter(db, {
//         provider: "sqlite",
//     }),
    
//     // ADD THESE MISSING REQUIRED FIELDS
//     secret: env.BETTER_AUTH_SECRET,
//     baseURL: env.BETTER_AUTH_URL, // This was missing!
    
//     emailAndPassword: {  
//         enabled: true,
//         requireEmailVerification: false, // Disable for testing
//     },
    
//     plugins: [
//         // admin({
//         //     defaultRole: "admin",
//         //     adminRoles: ["admin"],
//         //     defaultBanReason: "Violated terms of service",
//         //     defaultBanExpiresIn: 60 * 60 * 24 * 7, // 7 days
//         //     impersonationSessionDuration: 60 * 60, // 1 hour
//         // }),
//         // organization(),
//         // apiKey(),
//         // multiSession({
//         //   maximumSessions: 3
//         // }),
//     ],
    
//     // Add session configuration
//     session: {
//         expiresIn: 60 * 60 * 24 * 7, // 7 days
//         updateAge: 60 * 60 * 24, // 1 day
//     },
    
//     // Add CORS for your domains
//     trustedOrigins: [
//       "quinncodes.com",           // Protocol-agnostic for main domain
//       "*.quinncodes.com",         // Protocol-agnostic for all quinncodes subdomains
//       "localhost:5173",           // Protocol-agnostic for localhost
//       "*.localhost:5173",         // Protocol-agnostic for all localhost subdomains
//       "localhost:8787",           // For wrangler dev
//       "*.localhost:8787",         // For wrangler dev subdomains
//     ],
// });

// export const createAuth = () => {
//   return betterAuth({
//     database: prismaAdapter(db, {
//       provider: "sqlite",
//     }),
//     secret: env.BETTER_AUTH_SECRET,
//     baseURL: env.BETTER_AUTH_URL,
//     emailAndPassword: {  
//       enabled: true,
//     },
//   });
// };

export const createAuth = () => {
  return betterAuth({
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
};

// Export the instance after ensuring db is ready
export let auth: ReturnType<typeof createAuth>;

export const initAuth = () => {
  if (!auth) {
    auth = createAuth();
  }
  return auth;
};