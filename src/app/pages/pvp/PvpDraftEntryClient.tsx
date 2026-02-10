"use client";

import { useState, useEffect } from "react";
import { REGION_LIST, type Region } from "@/app/lib/constants/regions";
import { Swords, Users, Clock, Trophy, AlertCircle, Play, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface PvpDraftEntryClientProps {
  decksByRegion: Record<Region, any[]>;
  pvpDeckExpiryHours: number;
}

export function PvpDraftEntryClient({ decksByRegion, pvpDeckExpiryHours }: PvpDraftEntryClientProps) {
  const [savedRegion, setSavedRegion] = useState<Region | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Load saved region from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pvp-preferred-region');
    if (stored && REGION_LIST.find(r => r.id === stored)) {
      setSavedRegion(stored as Region);
    }
  }, []);

  // Save region preference
  const handleRegionSelect = (regionId: Region) => {
    localStorage.setItem('pvp-preferred-region', regionId);
    setSavedRegion(regionId);
  };

  const savedRegionData = savedRegion ? REGION_LIST.find(r => r.id === savedRegion) : null;
  const hasDeckInSavedRegion = savedRegion ? decksByRegion[savedRegion]?.length > 0 : false;

  return (
    <>
      {/* Quick Start Section - Shows if user has a saved region */}
      {savedRegion && savedRegionData && (
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border-2 border-purple-500/50 p-6 shadow-xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                <span>Quick Start</span>
              </h2>
              <p className="text-purple-200 text-sm">Your preferred region: {savedRegionData.flag} {savedRegionData.name}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {hasDeckInSavedRegion ? (
              <>
                <a
                  href={`/pvp/lobby/${savedRegion}`}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg px-6 py-3 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Enter Lobby</span>
                </a>
                <a
                  href={`/pvp/draft/${savedRegion}/new`}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-gray-200 rounded-lg px-6 py-3 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Draft New Deck</span>
                </a>
              </>
            ) : (
              <a
                href={`/pvp/draft/${savedRegion}/new`}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg px-6 py-3 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start Draft</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Collapsible How It Works */}
      <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 mb-8 shadow-lg">
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>How It Works</span>
          </h2>
          {howItWorksOpen ? (
            <ChevronUp className="w-6 h-6 text-gray-400" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-400" />
          )}
        </button>

        {howItWorksOpen && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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
        )}
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
                <span>Decks must be built within the last <strong>{pvpDeckExpiryHours} hours</strong> to enter matchmaking</span>
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
          {REGION_LIST.map((region) => {
            const hasValidDeck = decksByRegion[region.id as Region]?.length > 0;
            const isPreferred = savedRegion === region.id;

            return (
              <div
                key={region.id}
                className={`bg-slate-700/70 rounded-lg border-2 p-6 shadow-md transition-all ${
                  isPreferred ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-slate-600'
                }`}
              >
                {isPreferred && (
                  <div className="text-xs font-semibold text-purple-400 mb-2">✓ Preferred Region</div>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{region.flag}</div>
                  <div>
                    <div className="text-xl font-bold text-white">{region.name}</div>
                    <div className="text-sm text-gray-400">{region.description}</div>
                  </div>
                </div>

                {hasValidDeck ? (
                  <div className="space-y-2">
                    <a
                      href={`/pvp/lobby/${region.id}`}
                      onClick={() => handleRegionSelect(region.id as Region)}
                      className="group w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg px-4 py-3 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Enter Lobby</span>
                    </a>
                    <a
                      href={`/pvp/draft/${region.id}/new`}
                      onClick={() => handleRegionSelect(region.id as Region)}
                      className="group w-full bg-slate-600 hover:bg-slate-500 text-gray-200 rounded-lg px-4 py-2 transition-all font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Draft New Deck</span>
                    </a>
                  </div>
                ) : (
                  <a
                    href={`/pvp/draft/${region.id}/new`}
                    onClick={() => handleRegionSelect(region.id as Region)}
                    className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg px-4 py-3 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start Draft</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
