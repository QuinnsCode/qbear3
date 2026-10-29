// app/pages/pvp/PvpDraftEntryPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { PVP_DECK_EXPIRY_HOURS } from "@/app/lib/constants/regions";
import { getValidPvpDecks } from "@/app/serverActions/draft/getValidPvpDecks";
import { getQueueStats } from "@/app/serverActions/pvp/getQueueStats";
import { PvpDraftEntryClient } from "./PvpDraftEntryClient";

export default async function PvpDraftEntryPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login?redirect=/pvp' }
    });
  }

  const [{ decksByRegion }, queueStats] = await Promise.all([
    getValidPvpDecks(ctx.user.id),
    getQueueStats(),
  ]);

  return (
    <div className="draft-arena min-h-screen px-4 py-8 text-slate-100 md:py-12">
      <div className="mx-auto max-w-5xl">
        <PvpDraftEntryClient
          decksByRegion={decksByRegion}
          pvpDeckExpiryHours={PVP_DECK_EXPIRY_HOURS}
          userId={ctx.user.id}
          initialQueueStats={queueStats}
        />
      </div>
    </div>
  );
}
