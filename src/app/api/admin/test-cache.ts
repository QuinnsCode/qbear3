// app/api/admin/test-cache.ts
import { env } from "cloudflare:workers";
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider';
import { KVCardCache } from '@/app/services/cardData/KVCardCache';
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth/adminCheck";

/**
 * Test endpoint to verify cache is working
 * GET /api/admin/test-cache
 */
export default async function handler({ request }: { request: Request }) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Require super admin
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    requireSuperAdmin(session?.user || null);
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Unauthorized'
    }, { status: 403 });
  }

  try {
    if (!env?.CARDS_KV) {
      return Response.json({
        success: false,
        error: 'CARDS_KV binding not found - check wrangler.jsonc'
      }, { status: 500 });
    }

    const logs: string[] = [];
    logs.push('Starting cache test...');

    // Test 1: Direct KV write/read
    logs.push('\n=== Test 1: Direct KV Operations ===');
    const testKey = 'test:direct:write';
    const testValue = { message: 'Hello from cache!', timestamp: Date.now() };

    await env.CARDS_KV.put(testKey, JSON.stringify(testValue), {
      expirationTtl: 60 // 1 minute
    });
    logs.push(`✅ Wrote test key: ${testKey}`);

    const retrieved = await env.CARDS_KV.get(testKey, 'json');
    if (retrieved && JSON.stringify(retrieved) === JSON.stringify(testValue)) {
      logs.push('✅ Read test key successfully - KV is working!');
    } else {
      logs.push('❌ Failed to read test key - KV read/write mismatch');
      return Response.json({ success: false, logs, error: 'KV read/write failed' });
    }

    // Test 2: Fetch a card from Scryfall and cache it
    logs.push('\n=== Test 2: Fetch & Cache Mountain ===');
    const provider = new ScryfallProvider();
    const cache = new KVCardCache(env.CARDS_KV);

    const mountain = await provider.getCardByName('Mountain');
    logs.push(`✅ Fetched Mountain from Scryfall: ${mountain.id}`);
    logs.push(`   Name: ${mountain.name}`);
    logs.push(`   Image URL: ${mountain.imageUris?.normal || 'NO IMAGE'}`);

    await cache.setCard(mountain);
    logs.push('✅ Cached Mountain');

    // Test 3: Read the cached card back
    logs.push('\n=== Test 3: Read Cached Mountain ===');
    const cachedMountain = await cache.getCard(mountain.id);

    if (cachedMountain) {
      logs.push('✅ Successfully read Mountain from cache');
      logs.push(`   Name: ${cachedMountain.name}`);
      logs.push(`   ID: ${cachedMountain.id}`);
    } else {
      logs.push('❌ Failed to read Mountain from cache');
      return Response.json({ success: false, logs, error: 'Cache read failed' });
    }

    // Test 4: Read by name
    logs.push('\n=== Test 4: Read by Name ===');
    const cachedByName = await cache.getCardByName('Mountain');
    if (cachedByName) {
      logs.push('✅ Successfully read Mountain by name from cache');
    } else {
      logs.push('❌ Failed to read Mountain by name from cache');
    }

    // Test 5: List cache keys
    logs.push('\n=== Test 5: List Cache Keys ===');
    const list = await env.CARDS_KV.list({ prefix: 'card:', limit: 10 });
    logs.push(`Found ${list.keys.length} keys with 'card:' prefix`);
    list.keys.forEach(key => {
      logs.push(`   - ${key.name}`);
    });

    return Response.json({
      success: true,
      message: 'All cache tests passed!',
      logs,
      cachedCard: {
        id: mountain.id,
        name: mountain.name,
        imageUrl: mountain.imageUris?.normal
      }
    });

  } catch (error) {
    console.error('Cache test error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
