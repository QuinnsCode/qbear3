'use client';

import { useState } from 'react';
import { X, Calendar, Hash, Users, Sparkles } from 'lucide-react';
import type { Deck } from '@/app/types/Deck';

interface CommunityDeck {
  deck: Deck;
  userId: string;
  userName?: string;
}

interface CommunityDecksModalProps {
  decks: CommunityDeck[];
  isOpen: boolean;
  onClose: () => void;
  cacheAge?: string;
}

export function CommunityDecksModal({ decks, isOpen, onClose, cacheAge }: CommunityDecksModalProps) {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatColors = (colors: string[]) => {
    const colorMap: Record<string, string> = {
      W: '⚪',
      U: '🔵',
      B: '⚫',
      R: '🔴',
      G: '🟢'
    };
    return colors.map(c => colorMap[c] || c).join('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-white" />
              Community Decks
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              Latest decks from the community • {cacheAge || 'Cached'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Deck List */}
        <div className="overflow-y-auto flex-1 p-6">
          {decks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No community decks yet</p>
              <p className="text-sm mt-2">Be the first to share a deck!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map(({ deck, userName }) => (
                <div
                  key={deck.id}
                  className="bg-slate-700 rounded-lg border border-slate-600 hover:border-purple-500 transition-all p-4 cursor-pointer"
                >
                  {/* Deck Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {deck.commanderImageUrls?.[0] ? (
                      <img
                        src={deck.commanderImageUrls[0]}
                        alt={deck.commanders?.[0] || 'Commander'}
                        className="w-16 h-16 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
                        <Hash className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate" title={deck.name}>
                        {deck.name}
                      </h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {userName}
                      </p>
                    </div>
                  </div>

                  {/* Deck Info */}
                  <div className="space-y-2 text-sm">
                    {deck.commanders && deck.commanders.length > 0 && (
                      <div className="text-amber-300">
                        <span className="font-medium">Commander:</span>{' '}
                        {deck.commanders.join(' & ')}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-gray-300">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {deck.totalCards} cards
                      </span>
                      {deck.colors.length > 0 && (
                        <span>{formatColors(deck.colors)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Calendar className="w-3 h-3" />
                      {formatDate(deck.createdAt)}
                    </div>

                    <div className="pt-2">
                      <span className="inline-block px-2 py-1 bg-slate-600 rounded text-xs text-gray-300">
                        {deck.format === 'commander' ? 'Commander' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-700 border-t border-slate-600 p-4 text-center">
          <p className="text-sm text-gray-400">
            Showing {decks.length} latest decks • Updates every 30 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
