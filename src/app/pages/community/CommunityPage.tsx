// @/app/pages/community/CommunityPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { getCommunityDecksService } from '@/app/services/community/communityService';
import { CommunityDeckList } from '@/app/components/Community/CommunityDeckList';

export default async function CommunityPage({ ctx, request }: RequestInfo) {
  // Fetch initial batch (first 20 decks) - server-side
  const result = await getCommunityDecksService(0, 20);

  // Handle errors
  if (!result || !result.success) {
    console.error('[CommunityPage] Failed to fetch decks:', result?.error);
  }

  const initialDecks = result?.success && Array.isArray(result.decks) ? result.decks : [];
  const hasMore = result?.hasMore || false;
  const total = result?.total || 0;
  const cacheAge = result?.cacheAge || 'Live';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Community Decks
            </h1>
            <p className="text-lg text-purple-200">
              Explore the latest decks shared by the community
            </p>
            {ctx.user && (
              <div className="mt-4">
                <a
                  href="/sanctum"
                  className="text-purple-300 hover:text-purple-100 underline"
                >
                  ← Back to Sanctum
                </a>
              </div>
            )}
          </div>

          {/* Deck Grid with Infinite Scroll */}
          <div className="bg-slate-800 rounded-lg p-6">
            <CommunityDeckList
              initialDecks={initialDecks}
              initialHasMore={hasMore}
              initialTotal={total}
            />

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-600 text-center">
              <p className="text-sm text-gray-400">
                Total: {total} decks • {cacheAge}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
