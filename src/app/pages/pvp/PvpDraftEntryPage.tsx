// app/pages/pvp/PvpDraftEntryPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { REGION_LIST, PVP_DECK_EXPIRY_HOURS } from "@/app/lib/constants/regions";
import { Swords, Users, Clock, Trophy, AlertCircle } from "lucide-react";

export default async function PvpDraftEntryPage({ ctx, request }: RequestInfo) {
  // Require authentication
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/user/login' }
    });
  }

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

        {/* How It Works */}
        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>How It Works</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/70 rounded-lg p-4 border border-slate-600">
              <div className="text-3xl mb-2">1️⃣</div>
              <div className="font-bold text-white mb-2">Select Region</div>
              <div className="text-sm text-gray-300">Choose your region for optimal connection</div>
            </div>

            <div className="bg-slate-700/70 rounded-lg p-4 border border-slate-600">
              <div className="text-3xl mb-2">2️⃣</div>
              <div className="font-bold text-white mb-2">Draft vs AI</div>
              <div className="text-sm text-gray-300">Build your deck (3 packs, 14 cards each)</div>
            </div>

            <div className="bg-slate-700/70 rounded-lg p-4 border border-slate-600">
              <div className="text-3xl mb-2">3️⃣</div>
              <div className="font-bold text-white mb-2">Join Lobby</div>
              <div className="text-sm text-gray-300">Ready up for matchmaking</div>
            </div>

            <div className="bg-slate-700/70 rounded-lg p-4 border border-slate-600">
              <div className="text-3xl mb-2">4️⃣</div>
              <div className="font-bold text-white mb-2">Battle!</div>
              <div className="text-sm text-gray-300">Face off in 1v1 Commander</div>
            </div>
          </div>
        </div>

        {/* Important Rules */}
        <div className="bg-amber-900/30 border-2 border-amber-500 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-2">Important Rules</h3>
              <ul className="space-y-2 text-amber-100">
                <li className="flex items-start gap-2">
                  <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Decks must be built within the last <strong>{PVP_DECK_EXPIRY_HOURS} hours</strong> to enter matchmaking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>1v1 Commander format - 100 card decks with commanders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Swords className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Matches are competitive - no take-backs!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Region Selection */}
        <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Select Your Region</h2>
          <p className="text-gray-300 mb-6">Choose the region closest to you for the best connection quality</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REGION_LIST.map((region) => (
              <a
                key={region.id}
                href={`/pvp/draft/${region.id}/new`}
                className="group bg-slate-700/70 hover:bg-slate-700 rounded-lg border-2 border-slate-600 hover:border-blue-500 p-6 transition-all shadow-md hover:shadow-lg"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-4xl">{region.flag}</div>
                  <div>
                    <div className="text-xl font-bold text-white">{region.name}</div>
                    <div className="text-sm text-gray-400">{region.description}</div>
                  </div>
                </div>
                <div className="text-blue-400 group-hover:text-blue-300 font-medium flex items-center gap-2">
                  <span>Start Draft</span>
                  <span>→</span>
                </div>
              </a>
            ))}
          </div>
        </div>

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
