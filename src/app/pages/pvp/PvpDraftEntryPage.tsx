// app/pages/pvp/PvpDraftEntryPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { PVP_DECK_EXPIRY_HOURS } from "@/app/lib/constants/regions";
import { Swords } from "lucide-react";
import { getValidPvpDecks } from "@/app/serverActions/draft/getValidPvpDecks";
import { PvpDraftEntryClient } from "./PvpDraftEntryClient";

export default async function PvpDraftEntryPage({ ctx, request }: RequestInfo) {
  // Require authentication
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }

  // Fetch user's valid PVP decks
  const { decksByRegion } = await getValidPvpDecks(ctx.user.id);

  return (
    <div className="min-h-screen bg-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 shadow-xl mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Swords className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-4xl font-bold text-white">PVP Draft Arena</h1>
              <p className="text-red-100">Competitive 1v1 Matchmaking</p>
            </div>
          </div>
        </div>

        {/* Client Component with all interactive features */}
        <PvpDraftEntryClient
          decksByRegion={decksByRegion}
          pvpDeckExpiryHours={PVP_DECK_EXPIRY_HOURS}
        />

        {/* Back Button */}
        <div className="mt-8">
          <a
            href="/sanctum"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            <span>←</span>
            <span>Back to Sanctum</span>
          </a>
        </div>
      </div>
    </div>
  );
}
