// app/pages/pvp/PvpLobbyPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { getRegionConfig } from "@/app/lib/constants/regions";
import { getUserDecks } from "@/app/serverActions/deckBuilder/deckActions";
import { PvpLobbyClient } from "./PvpLobbyClient";

export default async function PvpLobbyPage({ ctx, request, params }: RequestInfo) {
  const region = params.region as string;
  const regionConfig = getRegionConfig(region);

  // Validate region
  if (!regionConfig) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/pvp' }
    });
  }

  // Require authentication
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }

  // Get user's decks
  const { decks } = await getUserDecks(ctx.user.id);

  // Filter for PVP-eligible draft decks from this region
  const url = new URL(request.url);
  const deckIdParam = url.searchParams.get('deckId');

  // Get PVP decks (recently exported draft decks)
  const pvpDecks = decks.filter((deck: any) => {
    if (deck.format !== 'draft') return false;

    // Check if deck has PVP metadata
    if (deck.pvpMetadata?.isPvpDeck && deck.pvpMetadata.pvpRegion === region) {
      return true;
    }

    // Fallback: Recent draft decks (within 4 hours) without explicit PVP metadata
    const deckAge = Date.now() - deck.createdAt;
    const fourHours = 4 * 60 * 60 * 1000;
    return deckAge < fourHours;
  });

  // Pre-select deck if deckId provided
  let selectedDeck = null;
  if (deckIdParam) {
    selectedDeck = pvpDecks.find((d: any) => d.id === deckIdParam);
  }

  return (
    <PvpLobbyClient
      userId={ctx.user.id}
      userName={ctx.user.name || ctx.user.email || 'Player'}
      region={region}
      regionName={regionConfig.name}
      regionFlag={regionConfig.flag}
      pvpDecks={pvpDecks}
      initialDeckId={selectedDeck?.id || null}
    />
  );
}
