// app/pages/pvp/PvpLobbyClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { PVP_DECK_EXPIRY_MS } from "@/app/lib/constants/regions";
import {
  Swords, Clock, Users, Check, Loader2, ArrowLeft, Sparkles, ShieldAlert,
  Hourglass, Radio, XCircle, Layers, ChevronRight, Zap,
} from "lucide-react";

type LobbyPhase = 'select_deck' | 'ready' | 'searching' | 'match_found';

interface MatchmakingMessage {
  type: 'join_queue' | 'leave_queue' | 'queue_status' | 'match_found' | 'error' | 'ping' | 'pong';
  position?: number;
  queueSize?: number;
  longestWaitSeconds?: number;
  error?: string;
  matchId?: string;
  opponentName?: string;
}

interface PvpLobbyClientProps {
  userId: string;
  userName: string;
  region: string;
  regionName: string;
  regionFlag: string;
  pvpDecks: any[];
  initialDeckId: string | null;
}

const STEPS: Array<{ id: LobbyPhase; label: string }> = [
  { id: 'select_deck', label: 'Choose deck' },
  { id: 'ready', label: 'Ready up' },
  { id: 'searching', label: 'Find opponent' },
  { id: 'match_found', label: 'Battle' },
];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function formatAge(ms: number) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export function PvpLobbyClient({
  userId,
  userName,
  region,
  regionName,
  regionFlag,
  pvpDecks,
  initialDeckId
}: PvpLobbyClientProps) {
  const [phase, setPhase] = useState<LobbyPhase>(initialDeckId ? 'ready' : 'select_deck');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(initialDeckId);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [socketState, setSocketState] = useState<'idle' | 'connecting' | 'open'>('idle');
  const [now, setNow] = useState(() => Date.now());

  const wsRef = useRef<WebSocket | null>(null);
  const matchFoundRef = useRef(false);

  const selectedDeck = pvpDecks.find(d => d.id === selectedDeckId);
  const deckAgeMs = selectedDeck ? now - selectedDeck.createdAt : 0;
  const isDeckValid = !!selectedDeck && deckAgeMs < PVP_DECK_EXPIRY_MS;
  const deckTimeLeftMs = selectedDeck ? Math.max(0, PVP_DECK_EXPIRY_MS - deckAgeMs) : 0;

  // Keep deck-age math fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Search timer
  useEffect(() => {
    if (phase !== 'searching') {
      setSearchSeconds(0);
      return;
    }
    const t = setInterval(() => setSearchSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // WebSocket connection
  useEffect(() => {
    if (phase !== 'searching') return;

    matchFoundRef.current = false;
    setSocketState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/__matchmaking/${region}`);
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    ws.onopen = () => {
      setSocketState('open');
      ws.send(JSON.stringify({
        type: 'join_queue',
        userId,
        userName,
        deckId: selectedDeckId!,
        deckName: selectedDeck!.name,
        deckExportedAt: selectedDeck!.createdAt
      }));
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };

    ws.onmessage = (event) => {
      const message: MatchmakingMessage = JSON.parse(event.data);
      switch (message.type) {
        case 'queue_status':
          setQueuePosition(message.position ?? null);
          setQueueSize(message.queueSize ?? 0);
          break;
        case 'match_found':
          matchFoundRef.current = true;
          setMatchId(message.matchId ?? null);
          setOpponentName(message.opponentName ?? null);
          setPhase('match_found');
          setTimeout(() => {
            if (message.matchId) window.location.href = `/cardGame/${message.matchId}`;
          }, 2200);
          break;
        case 'error':
          setError(message.error ?? 'Unknown error');
          setPhase('ready');
          break;
      }
    };

    ws.onerror = () => {
      setError('Could not reach matchmaking. Please try again.');
      setPhase('ready');
    };

    ws.onclose = (event) => {
      setSocketState('idle');
      // If the server dropped us mid-search, do not leave the UI spinning forever
      if (!matchFoundRef.current && event.code !== 1000) {
        setError('Lost connection to matchmaking. You were removed from the queue.');
        setPhase('ready');
      }
    };

    wsRef.current = ws;

    return () => {
      if (pingTimer) clearInterval(pingTimer);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_queue', userId }));
      }
      ws.close(1000, 'Left lobby');
    };
  }, [phase, region, userId, userName, selectedDeckId, selectedDeck]);

  const handleReadyForBattle = () => {
    if (!isDeckValid) {
      setError('Deck is too old. Please draft a new deck.');
      return;
    }
    setError(null);
    setPhase('searching');
  };

  const handleCancelQueue = () => {
    setPhase('ready');
    setQueuePosition(null);
    setQueueSize(0);
  };

  const stepIndex = STEPS.findIndex(s => s.id === phase);

  return (
    <div className="draft-arena min-h-screen px-4 py-8 text-slate-100 md:py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <a href="/pvp" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Arena
          </a>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
            <span className="text-base leading-none">{regionFlag}</span> {regionName}
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur">
          {/* Title + stepper */}
          <div className="border-b border-white/5 bg-gradient-to-r from-rose-500/10 via-transparent to-amber-500/10 px-6 py-5 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30">
                <Swords className="h-5 w-5 text-rose-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">PVP Lobby</h1>
                <p className="text-sm text-slate-400">1v1 draft duel · best deck wins</p>
              </div>
            </div>

            <ol className="mt-5 grid grid-cols-4 gap-2">
              {STEPS.map((step, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li key={step.id} className="flex flex-col gap-1.5">
                    <div className={`h-1 rounded-full ${done ? 'bg-emerald-400' : active ? 'bg-amber-400' : 'bg-slate-800'}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${active ? 'text-amber-200' : done ? 'text-emerald-300/80' : 'text-slate-600'}`}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Phase 1: Select Deck */}
            {phase === 'select_deck' && (
              <div>
                <h2 className="text-lg font-bold">Choose your deck</h2>
                <p className="mb-4 text-sm text-slate-400">Only decks drafted in this region within the last 4 hours are eligible.</p>

                {pvpDecks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-white/5">
                      <Layers className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="font-medium text-white">No eligible decks yet</p>
                    <p className="mt-1 text-sm text-slate-400">Draft a fresh deck to enter matchmaking.</p>
                    <a
                      href={`/pvp/draft/${region}/new`}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
                    >
                      <Sparkles className="h-4 w-4" /> Start a draft
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pvpDecks.map((deck) => {
                      const age = now - deck.createdAt;
                      const isExpired = age > PVP_DECK_EXPIRY_MS;
                      const selected = selectedDeckId === deck.id;
                      const left = Math.max(0, PVP_DECK_EXPIRY_MS - age);
                      return (
                        <button
                          key={deck.id}
                          type="button"
                          disabled={isExpired}
                          onClick={() => setSelectedDeckId(deck.id)}
                          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? 'border-amber-400/60 bg-amber-400/10 ring-1 ring-amber-400/40'
                              : isExpired
                                ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50'
                                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                            {selected ? <Check className="h-5 w-5" strokeWidth={3} /> : <Layers className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-white">{deck.name}</div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                              <span>{deck.totalCards} cards</span>
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> drafted {formatAge(age)}</span>
                            </div>
                          </div>
                          {isExpired ? (
                            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/30">Expired</span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                              {formatDuration(Math.floor(left / 1000))} left
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <div className="flex flex-col gap-2 pt-3 sm:flex-row">
                      <button
                        onClick={() => setPhase('ready')}
                        disabled={!isDeckValid}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                      >
                        Continue <ChevronRight className="h-4 w-4" />
                      </button>
                      <a
                        href={`/pvp/draft/${region}/new`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                      >
                        <Sparkles className="h-4 w-4" /> Draft new
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Phase 2: Ready */}
            {phase === 'ready' && selectedDeck && (
              <div>
                <h2 className="text-lg font-bold">Ready up</h2>
                <p className="mb-4 text-sm text-slate-400">You will be matched with the next player who queues in {regionName}.</p>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/30">
                    <Layers className="h-5 w-5 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{selectedDeck.name}</div>
                    <div className="text-xs text-slate-400">{selectedDeck.totalCards} cards · eligible for {formatDuration(Math.floor(deckTimeLeftMs / 1000))} more</div>
                  </div>
                  <button onClick={() => setPhase('select_deck')} className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-white hover:underline">
                    Change
                  </button>
                </div>

                <button
                  onClick={handleReadyForBattle}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:-translate-y-0.5 hover:from-rose-400 hover:to-orange-400"
                >
                  <Swords className="h-5 w-5" /> Find an opponent
                </button>
                <p className="mt-3 text-center text-xs text-slate-500">Matches are competitive. Leaving a game counts as a loss.</p>
              </div>
            )}

            {/* Phase 3: Searching */}
            {phase === 'searching' && (
              <div className="text-center">
                <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/10" />
                  <span className="absolute inset-3 animate-pulse rounded-full bg-amber-400/10" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 ring-2 ring-amber-400/40">
                    <Radio className="h-7 w-7 text-amber-300" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">Searching for an opponent</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {socketState === 'connecting' ? 'Connecting to matchmaking…' : `Queued in ${regionName}`}
                </p>

                <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
                  <Tile icon={Hourglass} label="Waiting" value={formatDuration(searchSeconds)} />
                  <Tile icon={Users} label="In queue" value={String(queueSize)} />
                  <Tile icon={Zap} label="Your spot" value={queuePosition ? `#${queuePosition}` : '—'} />
                </div>

                {queueSize <= 1 && searchSeconds > 20 && (
                  <p className="mt-4 text-xs text-slate-500">
                    Quiet right now. Invite a friend to queue in {regionName} and you will match instantly.
                  </p>
                )}

                <button
                  onClick={handleCancelQueue}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-rose-500/10 hover:text-rose-200 hover:ring-rose-500/30"
                >
                  <XCircle className="h-4 w-4" /> Leave queue
                </button>
              </div>
            )}

            {/* Phase 4: Match Found */}
            {phase === 'match_found' && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 ring-2 ring-emerald-400/50 animate-in zoom-in-50 duration-300">
                  <Check className="h-8 w-8 text-emerald-300" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold">Match found</h2>

                <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-4">
                  <Fighter name={userName} tone="amber" />
                  <span className="text-xl font-black italic text-slate-500">VS</span>
                  <Fighter name={opponentName || 'Opponent'} tone="rose" />
                </div>

                <p className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Entering the arena…
                </p>
                {matchId && (
                  <p className="mt-1 text-[11px] text-slate-600">
                    Not redirected? <a className="underline" href={`/cardGame/${matchId}`}>Open the game</a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}

function Fighter({ name, tone }: { name: string; tone: 'amber' | 'rose' }) {
  const ring = tone === 'amber' ? 'from-amber-400 to-orange-500' : 'from-rose-500 to-fuchsia-600';
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${ring} text-xl font-black text-white shadow-lg`}>
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="max-w-[9rem] truncate text-sm font-semibold text-white">{name}</span>
    </div>
  );
}
