// app/api/pvp/initialize.ts
import { initializePvpGame } from '@/app/serverActions/pvp/initializePvpGame';

export default async function handler({ request }: { request: Request }) {
  console.log('🔵 /api/pvp/initialize ENDPOINT HIT');

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const config = await request.json() as any;
    console.log('🔵 Parsed config:', JSON.stringify(config, null, 2));

    // Validate payload
    if (!config.gameId || !config.region || !config.players || config.players.length !== 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid payload'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call server action to initialize game
    const result = await initializePvpGame(config);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PVP initialization API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
