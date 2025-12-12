// @/app/serverActions/cardGame/sandboxInit.ts
'use server'

import { env } from "cloudflare:workers";
import { SANDBOX_CONFIG, SANDBOX_STARTER_DECKS } from '@/lib/sandbox/config';
import { SANDBOX_STARTER_DECKS_ARRAY } from "@/app/components/CardGame/Sandbox/sandboxStarterDecks";
import { getCardsByIdentifiers } from '@/app/serverActions/cardData/cardDataActions';

export async function initializeSandboxGame(gameId: string) {
  if (!env.CARD_GAME_STATE_DO) {
    throw new Error('CARD_GAME_STATE_DO not available');
  }

  console.log('🎮 Initializing sandbox game:', gameId);

  // Just send the deck lists - no card data needed
  const id = env.CARD_GAME_STATE_DO.idFromName(gameId);
  const stub = env.CARD_GAME_STATE_DO.get(id);
  
  const response = await stub.fetch(new Request('https://fake-host/init-sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      starterDecks: SANDBOX_STARTER_DECKS_ARRAY,
      config: SANDBOX_CONFIG,
    })
  }));
  
  if (!response.ok) {
    throw new Error(`Failed to initialize`);
  }
  
  console.log('✅ Sandbox game initialized');
}