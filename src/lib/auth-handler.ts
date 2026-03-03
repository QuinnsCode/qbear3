// lib/auth-handler.ts
// Top-level import of auth instance to avoid dynamic import issues in Cloudflare Workers

import { auth } from "./auth";

/**
 * Handle all better-auth routes
 * This is imported at module level in worker.tsx to avoid dynamic imports
 */
export async function handleAuthRequest(request: Request): Promise<Response> {
  try {
    // Call better-auth's handler with the request
    return await auth.handler(request);
  } catch (error) {
    console.error('[Auth Handler] Error:', error);
    return new Response(JSON.stringify({
      error: 'Auth failed',
      message: error?.message || String(error),
      stack: error?.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
