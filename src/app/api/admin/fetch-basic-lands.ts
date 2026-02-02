// app/api/admin/fetch-basic-lands.ts
import { ScryfallProvider } from '@/app/services/cardData/providers/ScryfallProvider';
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth/adminCheck";

/**
 * Fetch fresh basic land data from Scryfall
 * GET /api/admin/fetch-basic-lands
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
    const provider = new ScryfallProvider();

    // Use a recent standard set to limit results (Foundations is a recent core set)
    const SET_CODE = 'fdn'; // Foundations - has clean basic lands

    const basicLandNames = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    const results: any[] = [];

    for (const landName of basicLandNames) {
      try {
        // Get basic land from specific set to avoid millions of printings
        const card = await provider.getCardByName(landName, SET_CODE);

        results.push({
          name: card.name,
          scryfallId: card.id,
          imageUrl: card.imageUris?.normal,
          typeLine: card.typeLine,
          colors: card.colors,
          colorIdentity: card.colorIdentity,
          set: card.setCode,
          setName: card.setName
        });

        console.log(`✅ Fetched ${landName} from ${card.setName} (${card.setCode})`);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to fetch ${landName}:`, error);
        results.push({
          name: landName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Generate updated TypeScript code
    const colorMap: Record<string, string> = {
      'Plains': 'W',
      'Island': 'U',
      'Swamp': 'B',
      'Mountain': 'R',
      'Forest': 'G'
    };

    const typeScriptCode = `export const BASIC_LANDS = {
${results.map(r => {
  const color = colorMap[r.name];
  return `  ${color}: {
    scryfallId: '${r.scryfallId}',
    name: '${r.name}',
    type: '${r.typeLine}',
    colors: ${JSON.stringify(r.colorIdentity || [])},
    imageUrl: '${r.imageUrl}',
    manaCost: ''
  }`;
}).join(',\n')}
} as const`;

    return Response.json({
      success: true,
      results,
      typeScriptCode,
      message: 'Copy this code to src/app/types/Deck.ts to update BASIC_LANDS constant'
    });

  } catch (error) {
    console.error('Fetch basic lands error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
