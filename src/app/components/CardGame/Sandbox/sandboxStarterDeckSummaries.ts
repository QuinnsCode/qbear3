// @/app/components/CardGame/Sandbox/sandboxStarterDeckSummaries.ts
// The sandbox's starter decks as Deck summaries. DeckBuilder imports this lazily so the card data
// only downloads for sandbox players.
import type { Deck } from '@/app/types/Deck'
import { EDH_SANDBOX_STARTER_DECK_DATA } from './starterDeckData'

export const SANDBOX_STARTER_DECKS: Deck[] = EDH_SANDBOX_STARTER_DECK_DATA.map((deck, index) => {
  const commanderCard = deck.cards.find(card => 
    card.name.toLowerCase() === deck.commander.toLowerCase()
  );
  
  return {
    version: 4,
    format: 'commander',
    id: `sandbox-${index}`,
    name: deck.name,
    commanders: [deck.commander], // CHANGE: single commander to array
    commanderImageUrls: commanderCard?.image_uris?.art_crop || commanderCard?.image_uris?.large || commanderCard?.image_uris?.normal 
      ? [commanderCard.image_uris.art_crop || commanderCard.image_uris.large || commanderCard.image_uris.normal]
      : undefined, // CHANGE: wrap in array
    colors: [deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '⚪' ? 'W' : 
             deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '⚫' ? 'B' :
             deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '🔴' ? 'R' :
             deck.name.match(/⚪|⚫|🔴|🟢|🔵/)?.[0] === '🟢' ? 'G' : 'U'] as ('W' | 'U' | 'B' | 'R' | 'G')[],
    cards: [],
    totalCards: 100,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
});
