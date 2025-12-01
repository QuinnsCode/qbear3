// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import { apiKey } from "better-auth/plugins"
import { multiSession } from "better-auth/plugins"
import { env } from "cloudflare:workers";
import { db } from "@/db";

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
    // ADD THIS:
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        // Optional: add scopes if you want guild/server access
        // scopes: ["identify", "email", "guilds", "guilds.join"],
      },
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
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: ".qntbr.com"
      }
    },
    trustedOrigins: [
      "https://qntbr.com",
      "https://*.qntbr.com", 
      "http://localhost:5173",
      "http://*.localhost:5173",
      "http://localhost:8787",
      "http://*.localhost:8787",
    ],
  });
};

export let auth: ReturnType<typeof createAuth>;

export const initAuth = () => {
  if (!auth) {
    auth = createAuth();
  }
  return auth;
};