'use client';

import { useState } from 'react';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { getCommunityDecks } from '@/app/serverActions/community/getCommunityDecks';
import type { CommunityDeck } from '@/app/services/community/communityService';

interface CommunityDeckListProps {
  initialDecks: CommunityDeck[];
  initialHasMore: boolean;
  initialTotal: number;
}

export function CommunityDeckList({
  initialDecks,
  initialHasMore,
  initialTotal
}: CommunityDeckListProps) {
  const [decks, setDecks] = useState(initialDecks);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getCommunityDecks(decks.length, 20);

      if (result.success) {
        setDecks(prev => [...prev, ...result.decks]);
        setHasMore(result.hasMore || false);
      } else {
        setError(result.error || 'Failed to load more decks');
      }
    } catch (err) {
      setError('Network error loading decks');
      console.error('[CommunityDeckList] Error loading more:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMore,
    isLoading,
    hasMore,
    threshold: 400
  });

  if (decks.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">No community decks yet</p>
        <p className="text-sm mt-2">Be the first to share a deck!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map(({ deck, userName }) => (
          <DeckCard key={deck.id} deck={deck} userName={userName} />
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-gray-400 mt-2">Loading more decks...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-center py-4 text-red-400">
          {error}
        </div>
      )}

      {/* End message */}
      {!hasMore && decks.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>🎉 You've seen all {initialTotal} community decks!</p>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="h-4" />
    </>
  );
}

function DeckCard({ deck, userName }: { deck: any; userName?: string }) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatColors = (colors: string[] | undefined) => {
    if (!colors || !Array.isArray(colors)) return '';

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
    <div className="bg-slate-700 rounded-lg border border-slate-600 hover:border-purple-500 transition-all p-4 cursor-pointer">
      {/* Deck Header */}
      <div className="flex items-start gap-3 mb-3">
        {deck.commanderImageUrls?.[0] ? (
          <img
            src={deck.commanderImageUrls[0]}
            alt={deck.commanders?.[0] || 'Commander'}
            className="w-16 h-16 rounded object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
            <span className="text-2xl text-gray-400">#</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate" title={deck.name}>
            {deck.name}
          </h3>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            👤 {userName}
          </p>
        </div>
      </div>

      {/* Deck Info */}
      <div className="space-y-2 text-sm">
        {deck.commanders && Array.isArray(deck.commanders) && deck.commanders.length > 0 && (
          <div className="text-amber-300">
            <span className="font-medium">Commander:</span>{' '}
            {deck.commanders.join(' & ')}
          </div>
        )}

        <div className="flex items-center justify-between text-gray-300">
          <span className="flex items-center gap-1">
            # {deck.totalCards || 0} cards
          </span>
          {deck.colors && Array.isArray(deck.colors) && deck.colors.length > 0 && (
            <span>{formatColors(deck.colors)}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-gray-400 text-xs">
          📅 {formatDate(deck.createdAt)}
        </div>

        <div className="pt-2">
          <span className="inline-block px-2 py-1 bg-slate-600 rounded text-xs text-gray-300">
            {deck.format === 'commander' ? 'Commander' : 'Draft'}
          </span>
        </div>
      </div>
    </div>
  );
}
