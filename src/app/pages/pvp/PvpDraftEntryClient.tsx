// app/pages/pvp/PvpDraftEntryClient.tsx
"use client";

import { useState, useEffect } from "react";
import { REGION_LIST, type Region } from "@/app/lib/constants/regions";
import {
  Swords, Users, Clock, Trophy, Play, Sparkles, ChevronDown, Package, ArrowLeft,
  Globe2, Star, Radio, ShieldCheck, Layers, Gamepad2,
} from "lucide-react";
import { MyDraftsModal } from "@/app/components/Draft/MyDraftsModal";
import { getQueueStats, type QueueStatsByRegion } from "@/app/serverActions/pvp/getQueueStats";

interface PvpDraftEntryClientProps {
  decksByRegion: Record<Region, any[]>;
  pvpDeckExpiryHours: number;
  userId: string;
  initialQueueStats?: QueueStatsByRegion;
}

const STEPS = [
  { icon: Globe2, title: 'Pick a region', text: 'Closest region, lowest latency.' },
  { icon: Layers, title: 'Draft vs AI', text: '3 packs, 14 cards, build 40.' },
  { icon: Radio, title: 'Queue up', text: 'Ready up in the regional lobby.' },
  { icon: Gamepad2, title: 'Duel', text: '1v1 on the virtual tabletop.' },
];

export function PvpDraftEntryClient({ decksByRegion, pvpDeckExpiryHours, userId, initialQueueStats }: PvpDraftEntryClientProps) {
  const [savedRegion, setSavedRegion] = useState<Region | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStatsByRegion | undefined>(initialQueueStats);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pvp-preferred-region');
      if (stored && REGION_LIST.find(r => r.id === stored)) setSavedRegion(stored as Region);
    } catch {}
  }, []);

  // Refresh live queue counts while the page is open
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const stats = await getQueueStats();
        if (!cancelled) setQueueStats(stats);
      } catch {}
    };
    const t = setInterval(tick, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const handleRegionSelect = (regionId: Region) => {
    try { localStorage.setItem('pvp-preferred-region', regionId); } catch {}
    setSavedRegion(regionId);
  };

  const totalInQueue = queueStats ? Object.values(queueStats).reduce((n, s) => n + s.queueSize, 0) : 0;
  const readyDecks = Object.values(decksByRegion).reduce((n, d) => n + (d?.length || 0), 0);
  const savedRegionData = savedRegion ? REGION_LIST.find(r => r.id === savedRegion) : null;
  const hasDeckInSavedRegion = savedRegion ? decksByRegion[savedRegion]?.length > 0 : false;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <a href="/sanctum" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Sanctum
        </a>
        <button
          onClick={() => setDraftsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10"
        >
          <Package className="h-4 w-4" /> My drafts
        </button>
      </div>

      <MyDraftsModal isOpen={draftsModalOpen} onClose={() => setDraftsModalOpen(false)} userId={userId} />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-rose-300 ring-1 ring-rose-400/30">
              <Swords className="h-3.5 w-3.5" /> PVP Arena
            </span>
            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">Draft a deck. Find a duel.</h1>
            <p className="mt-3 max-w-md text-slate-400">
              Draft against AI, then queue into a regional lobby for a competitive 1v1. Fresh decks only, so every match is a fair fight.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Stat label="Players queued" value={totalInQueue} tone={totalInQueue > 0 ? 'live' : undefined} />
              <Stat label="Your ready decks" value={readyDecks} />
              <Stat label="Deck lifetime" value={`${pvpDeckExpiryHours}h`} />
            </div>

            {savedRegion && savedRegionData && (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {hasDeckInSavedRegion ? (
                  <>
                    <a
                      href={`/pvp/lobby/${savedRegion}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:-translate-y-0.5"
                    >
                      <Play className="h-4 w-4" /> Enter {savedRegionData.name} lobby
                    </a>
                    <a href={`/pvp/draft/${savedRegion}/new`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10">
                      <Sparkles className="h-4 w-4" /> Draft another
                    </a>
                  </>
                ) : (
                  <a
                    href={`/pvp/draft/${savedRegion}/new`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:bg-amber-300"
                  >
                    <Sparkles className="h-4 w-4" /> Draft for {savedRegionData.name}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Rules card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> House rules
            </div>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>Decks expire <strong className="text-white">{pvpDeckExpiryHours} hours</strong> after you draft them.</span></li>
              <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /><span>Strict 1v1. You are matched with the next player in your region.</span></li>
              <li className="flex gap-2"><Trophy className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" /><span>Competitive: no take-backs, no undo.</span></li>
            </ul>
            <button
              onClick={() => setHowItWorksOpen(v => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
              aria-expanded={howItWorksOpen}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${howItWorksOpen ? 'rotate-180' : ''}`} />
              {howItWorksOpen ? 'Hide' : 'How a match works'}
            </button>
          </div>
        </div>

        {howItWorksOpen && (
          <div className="relative grid gap-3 border-t border-white/5 bg-black/20 p-6 sm:grid-cols-2 lg:grid-cols-4 md:px-10">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/15 text-[11px] font-bold text-amber-300">{i + 1}</span>
                  <step.icon className="h-4 w-4 text-slate-300" />
                </div>
                <div className="text-sm font-semibold text-white">{step.title}</div>
                <div className="text-xs text-slate-400">{step.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regions */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold">Choose a region</h2>
            <p className="text-sm text-slate-400">Each region runs its own queue. Counts refresh every few seconds.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REGION_LIST.map((region) => {
            const decks = decksByRegion[region.id as Region] || [];
            const hasValidDeck = decks.length > 0;
            const isPreferred = savedRegion === region.id;
            const stats = queueStats?.[region.id as Region];
            const queued = stats?.queueSize ?? 0;

            return (
              <div
                key={region.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                  isPreferred ? 'border-amber-400/50 bg-amber-400/[0.06] ring-1 ring-amber-400/30' : 'border-white/10 bg-slate-950/60 hover:border-white/20'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{region.flag}</span>
                    <div>
                      <div className="font-bold text-white">{region.name}</div>
                      <div className="text-xs text-slate-400">{region.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRegionSelect(region.id as Region)}
                    title={isPreferred ? 'Preferred region' : 'Make this my region'}
                    className={`rounded-full p-1.5 transition-colors ${isPreferred ? 'text-amber-300' : 'text-slate-600 hover:text-amber-300'}`}
                  >
                    <Star className="h-4 w-4" fill={isPreferred ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ${
                    queued > 0 ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/30' : 'bg-white/5 text-slate-400 ring-white/10'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${queued > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    {queued > 0 ? `${queued} searching` : 'Queue empty'}
                  </span>
                  {hasValidDeck && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-200 ring-1 ring-sky-400/30">
                      <Layers className="h-3 w-3" /> {decks.length} deck{decks.length === 1 ? '' : 's'} ready
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  {hasValidDeck ? (
                    <>
                      <a
                        href={`/pvp/lobby/${region.id}`}
                        onClick={() => handleRegionSelect(region.id as Region)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:from-rose-400 hover:to-orange-400"
                      >
                        <Play className="h-4 w-4" /> Enter lobby
                      </a>
                      <a
                        href={`/pvp/draft/${region.id}/new`}
                        onClick={() => handleRegionSelect(region.id as Region)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Draft new deck
                      </a>
                    </>
                  ) : (
                    <a
                      href={`/pvp/draft/${region.id}/new`}
                      onClick={() => handleRegionSelect(region.id as Region)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
                    >
                      <Sparkles className="h-4 w-4" /> Start draft
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'live' }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
      <div className={`flex items-center gap-1.5 text-xl font-bold tabular-nums ${tone === 'live' ? 'text-emerald-300' : 'text-white'}`}>
        {tone === 'live' && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}
