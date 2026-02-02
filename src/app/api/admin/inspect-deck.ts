// app/api/admin/inspect-deck.ts
import { env } from "cloudflare:workers";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth/adminCheck";

/**
 * Inspect a deck to see what card data is actually stored
 * GET /api/admin/inspect-deck?userId=xxx&deckId=xxx
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
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const deckId = url.searchParams.get('deckId');

    if (!userId || !deckId) {
      return Response.json({
        error: 'Missing userId or deckId query parameters'
      }, { status: 400 });
    }

    if (!env?.DECKS_KV) {
      return Response.json({
        error: 'DECKS_KV binding not found'
      }, { status: 500 });
    }

    // Fetch the deck
    const deckKey = `deck:${userId}:${deckId}`;
    const deckJson = await env.DECKS_KV.get(deckKey);

    if (!deckJson) {
      return Response.json({
        error: 'Deck not found',
        key: deckKey
      }, { status: 404 });
    }

    const deck = JSON.parse(deckJson);

    // Analyze the cards
    const cardAnalysis = deck.cards?.map((card: any) => ({
      name: card.name,
      scryfallId: card.scryfallId || card.id,
      imageUrl: card.imageUrl,
      image_uris: card.image_uris,
      hasImageUrl: !!card.imageUrl,
      hasImageUris: !!card.image_uris,
      imageUrlType: typeof card.imageUrl,
      quantity: card.quantity,
      zone: card.zone
    })) || [];

    // Find cards with missing images
    const missingImages = cardAnalysis.filter((c: any) => !c.hasImageUrl && !c.hasImageUris);
    const emptyStringImages = cardAnalysis.filter((c: any) => c.imageUrl === '');

    return Response.json({
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        format: deck.format,
        totalCards: deck.totalCards,
        cardCount: deck.cards?.length || 0
      },
      cardAnalysis,
      issues: {
        missingImages: missingImages.length,
        emptyStringImages: emptyStringImages.length,
        cardsWithMissingImages: missingImages.map((c: any) => c.name),
        cardsWithEmptyStrings: emptyStringImages.map((c: any) => c.name)
      },
      sampleCards: {
        first: cardAnalysis[0],
        last: cardAnalysis[cardAnalysis.length - 1],
        random: cardAnalysis[Math.floor(Math.random() * cardAnalysis.length)]
      }
    });

  } catch (error) {
    console.error('Inspect deck error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
