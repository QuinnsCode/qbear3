// @/app/serverActions/cardGame/sandboxInit.ts
'use server'

import { env } from "cloudflare:workers";
import { SANDBOX_CONFIG, SANDBOX_STARTER_DECKS } from '@/lib/sandbox/config';
import { getCardsByIdentifiers } from '@/app/serverActions/cardData/cardDataActions';

export async function initializeSandboxGame(gameId: string) {
  if (!env.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO not available');
  }

  console.log('🎮 Initializing sandbox game:', gameId);

  try {
    // Build identifiers for all cards across all decks
    const allCardIdentifiers = SANDBOX_STARTER_DECKS.flatMap(deck =>
      deck.cards.map(card => ({
        name: card.name,
        // No set specified - will get latest printing
      }))
    );

    console.log(`📦 Fetching ${allCardIdentifiers.length} unique cards...`);

    // Use your existing cached card fetcher!
    const { success, cards, error } = await getCardsByIdentifiers(allCardIdentifiers);

    if (!success || !cards) {
      throw new Error(`Failed to fetch cards: ${error}`);
    }

    console.log(`✅ Fetched ${cards.length} cards (from cache or Scryfall)`);

    // Build decks with full card data
    const decksWithData = SANDBOX_STARTER_DECKS.map(deck => {
      const deckCards = deck.cards.flatMap(cardSpec => {
        // Find the card data
        const cardData = cards.find(c => 
          c.name.toLowerCase() === cardSpec.name.toLowerCase()
        );

        if (!cardData) {
          console.warn(`Card not found: ${cardSpec.name}`);
          return [];
        }

        // Duplicate for quantity
        return Array(cardSpec.quantity).fill(null).map(() => ({
          scryfallId: cardData.id,
          name: cardData.name,
          imageUrl: cardData.image_uris?.normal || cardData.image_uris?.small || '',
          type: cardData.type_line,
          manaCost: cardData.mana_cost || '',
          colors: cardData.colors || [],
          cmc: cardData.cmc || 0,
        }));
      });

      return {
        id: deck.id,
        deckName: deck.deckName,
        cards: deckCards,
      };
    });

    console.log(`✅ Built ${decksWithData.length} decks with full card data`);

    // Send to Durable Object
    const id = env.CARD_GAME_STATE_DO.idFromName(gameId);
    const stub = env.CARD_GAME_STATE_DO.get(id);
    
    const response = await stub.fetch(new Request('https://fake-host/init-sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starterDecks: decksWithData,
        config: SANDBOX_CONFIG,
      })
    }));
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initialize: ${errorText}`);
    }
    
    console.log('✅ Sandbox game initialized with', decksWithData.length, 'decks');
  } catch (error) {
    console.error('Failed to initialize sandbox game:', error);
    throw error;
  }
}