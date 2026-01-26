// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import { apiKey } from "better-auth/plugins"
import { multiSession } from "better-auth/plugins"
import { env } from "cloudflare:workers";
import { db } from "@/db";
import { Resend } from "resend";
import { getPasswordResetEmailHTML } from "./email/passwordReset";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

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
      sendResetPassword: async ({ user, url, token }, request) => {
        // Validate user data exists
        if (!user?.email) {
          console.error('❌ sendResetPassword: No user email provided');
          return;
        }
  
        // Validate URL exists
        if (!url) {
          console.error('❌ sendResetPassword: No reset URL provided');
          return;
        }
  
        // Validate token exists
        if (!token) {
          console.error('❌ sendResetPassword: No reset token provided');
          return;
        }
  
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          console.error('❌ sendResetPassword: Invalid email format:', user.email);
          return;
        }
  
        console.log('📧 Sending password reset email to:', user.email);
  
        // Use void to prevent timing attacks (don't await)
        void resend.emails.send({
          from: "QNTBR <no-reply@doubledragonsupply.com>",
          to: [user.email],
          subject: "Reset Your Password - QNTBR",
          html: getPasswordResetEmailHTML(url),
        }).then(() => {
          console.log('✅ Password reset email sent to:', user.email);
        }).catch((error) => {
          console.error('❌ Failed to send password reset email:', error);
        });
      },
      
      onPasswordReset: async ({ user }, request) => {
        // Log successful password reset
        console.log(`✅ Password reset completed for user: ${user.email}`);
        
        // Optional: Send confirmation email
        void resend.emails.send({
          from: "QNTBR <no-reply@doubledragonsupply.com>",
          to: [user.email],
          subject: "Password Changed - QNTBR",
          html: `
            <h2>Password Changed</h2>
            <p>Your password has been successfully changed.</p>
            <p>If you did not make this change, please contact us immediately.</p>
            <p>May your draws be legendary,<br>The QNTBR team</p>
          `,
        }).catch((error) => {
          console.error('❌ Failed to send password changed confirmation:', error);
        });
      }
    },
    // ADD THIS:
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        // Optional: add scopes if you want guild/server access
        // scopes: ["identify", "email", "guilds", "guilds.join"],
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account", // Forces Google account picker every time
      }
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
      crossSubDomainCookies: env.BETTER_AUTH_URL.includes('localhost') 
      ? { enabled: false }
      : { enabled: true, domain: ".qntbr.com" }
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