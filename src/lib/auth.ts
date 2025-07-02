// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import { apiKey } from "better-auth/plugins"
import { multiSession } from "better-auth/plugins"
import { env } from "cloudflare:workers";
import { db } from "@/db";
 
export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "sqlite",
    }),
    
    // ADD THESE MISSING REQUIRED FIELDS
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL, // This was missing!
    
    emailAndPassword: {  
        enabled: true,
        requireEmailVerification: false, // Disable for testing
    },
    
    plugins: [
        admin({
            defaultRole: "admin",
            adminRoles: ["admin"],
            defaultBanReason: "Violated terms of service",
            defaultBanExpiresIn: 60 * 60 * 24 * 7, // 7 days
            impersonationSessionDuration: 60 * 60, // 1 hour
        }),
        organization(),
        apiKey(),
        multiSession({
          maximumSessions: 3
        }),
    ],
    
    // Add session configuration
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    
    // Add CORS for your domains
    trustedOrigins: [
        "https://quinncodes.com",
        "https://*.quinncodes.com",
    ],
});

console.log('🔍 Better Auth instance created');
console.log('🔍 Secret exists:', !!env.BETTER_AUTH_SECRET);
console.log('🔍 Base URL:', env.BETTER_AUTH_URL);