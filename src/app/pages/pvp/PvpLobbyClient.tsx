// app/pages/pvp/PvpLobbyClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import type { Region } from "@/app/lib/constants/regions";
import { PVP_DECK_EXPIRY_MS } from "@/app/lib/constants/regions";
import { Swords, Clock, Users, Check, Loader2 } from "lucide-react";

type LobbyPhase = 'select_deck' | 'ready' | 'searching' | 'match_found';

interface MatchmakingMessage {
  type: 'join_queue' | 'leave_queue' | 'queue_status' | 'match_found' | 'error';
  position?: number;
  queueSize?: number;
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

export function PvpLobbyClient({
  userId,
  userName,
  region,
  regionName,
  regionFlag,
  pvpDecks,
  initialDeckId
}: PvpLobbyClientProps) {
  const [phase, setPhase] = useState<LobbyPhase>('select_deck');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(initialDeckId);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const selectedDeck = pvpDecks.find(d => d.id === selectedDeckId);

  // Check deck validity (4-hour expiry)
  const isDeckValid = selectedDeck && (Date.now() - selectedDeck.createdAt) < PVP_DECK_EXPIRY_MS;

  // WebSocket connection
  useEffect(() => {
    if (phase !== 'searching') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/__matchmaking/${region}`);

    ws.onopen = () => {
      console.log('Connected to matchmaking');

      // Join queue
      const joinMessage: MatchmakingMessage = {
        type: 'join_queue',
        userId,
        userName,
        deckId: selectedDeckId!,
        deckName: selectedDeck!.name,
        deckExportedAt: selectedDeck!.createdAt
      } as any;

      ws.send(JSON.stringify(joinMessage));
    };

    ws.onmessage = (event) => {
      const message: MatchmakingMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'queue_status':
          setQueuePosition(message.position ?? null);
          setQueueSize(message.queueSize ?? 0);
          break;

        case 'match_found':
          setMatchId(message.matchId ?? null);
          setOpponentName(message.opponentName ?? null);
          setPhase('match_found');

          // Redirect to game after brief delay
          setTimeout(() => {
            if (message.matchId) {
              window.location.href = `/cardGame/${message.matchId}`;
            }
          }, 2000);
          break;

        case 'error':
          setError(message.error ?? 'Unknown error');
          setPhase('ready');
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please try again.');
      setPhase('ready');
    };

    ws.onclose = () => {
      console.log('Disconnected from matchmaking');
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_queue', userId }));
      }
      ws.close();
    };
  }, [phase, region, userId, userName, selectedDeckId, selectedDeck]);

  const handleReadyForBattle = () => {
    if (!isDeckValid) {
      setError('Deck is too old. Please draft a new deck.');
      return;
    }

    setPhase('searching');
    setError(null);
  };

  const handleCancelQueue = () => {
    setPhase('ready');
    setQueuePosition(null);
    setQueueSize(0);
  };

  return (
    <div className="min-h-screen bg-slate-700">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 shadow-xl mb-8">
          <div className="flex items-center gap-4">
            <Swords className="w-12 h-12 text-white" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">PVP Lobby</h1>
              <p className="text-red-100">
                {regionFlag} {regionName} Region
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4 mb-6">
            <div className="font-bold text-red-400 mb-2">Error</div>
            <div className="text-red-300">{error}</div>
          </div>
        )}

        {/* Phase 1: Select/Finalize Deck */}
        {phase === 'select_deck' && (
          <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Select Your Deck</h2>

            {pvpDecks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-300 mb-4">No eligible decks found.</div>
                <div className="text-sm text-gray-400 mb-6">
                  Draft a new deck to participate in PVP matchmaking.
                </div>
                <a
                  href={`/pvp/draft/${region}/new`}
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Start New Draft
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {pvpDecks.map((deck) => {
                  const deckAge = Date.now() - deck.createdAt;
                  const isExpired = deckAge > PVP_DECK_EXPIRY_MS;
                  const hoursOld = Math.floor(deckAge / (60 * 60 * 1000));

                  return (
                    <div
                      key={deck.id}
                      onClick={() => !isExpired && setSelectedDeckId(deck.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedDeckId === deck.id
                          ? 'bg-blue-900/30 border-blue-500'
                          : isExpired
                          ? 'bg-slate-700/30 border-slate-700 opacity-50 cursor-not-allowed'
                          : 'bg-slate-700/70 border-slate-600 hover:border-blue-500'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{deck.name}</div>
                          <div className="text-sm text-gray-300">
                            {deck.totalCards} cards • {hoursOld}h old
                          </div>
                        </div>
                        {isExpired && (
                          <div className="text-red-400 text-sm font-semibold">Expired</div>
                        )}
                        {selectedDeckId === deck.id && !isExpired && (
                          <Check className="w-6 h-6 text-blue-400" />
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => setPhase('ready')}
                  disabled={!isDeckValid}
                  className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                >
                  Confirm Deck
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Ready for Battle */}
        {phase === 'ready' && (
          <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Ready for Battle</h2>

            <div className="bg-slate-700/70 rounded-lg p-4 mb-6">
              <div className="font-bold text-white mb-2">Selected Deck:</div>
              <div className="text-gray-300">{selectedDeck?.name}</div>
              <div className="text-sm text-gray-400">{selectedDeck?.totalCards} cards</div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReadyForBattle}
                className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Swords className="w-5 h-5" />
                <span>Ready for Battle!</span>
              </button>

              <button
                onClick={() => setPhase('select_deck')}
                className="px-6 py-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
              >
                Change Deck
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Searching for Match */}
        {phase === 'searching' && (
          <div className="bg-slate-800 rounded-lg border-2 border-blue-500 p-6 shadow-lg animate-pulse">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-4">Searching for Opponent...</h2>

              <div className="bg-slate-700/70 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <Users className="w-5 h-5" />
                  <span>Queue: {queueSize} {queueSize === 1 ? 'player' : 'players'}</span>
                </div>
                {queuePosition !== null && (
                  <div className="text-sm text-gray-400 mt-2">
                    Position: #{queuePosition}
                  </div>
                )}
              </div>

              <button
                onClick={handleCancelQueue}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel Search
              </button>
            </div>
          </div>
        )}

        {/* Phase 4: Match Found */}
        {phase === 'match_found' && (
          <div className="bg-slate-800 rounded-lg border-2 border-green-500 p-6 shadow-lg">
            <div className="text-center">
              <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Match Found!</h2>

              <div className="bg-slate-700/70 rounded-lg p-4 mb-6">
                <div className="text-gray-300 mb-2">Opponent:</div>
                <div className="text-xl font-bold text-white">{opponentName}</div>
              </div>

              <div className="text-gray-400">Entering game...</div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <a
            href="/pvp"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            <span>←</span>
            <span>Back to PVP Arena</span>
          </a>
        </div>
      </div>
    </div>
  );
}
