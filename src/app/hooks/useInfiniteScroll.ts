// src/app/hooks/useInfiniteScroll.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /**
   * Callback fired when user scrolls near bottom
   */
  onLoadMore: () => void;

  /**
   * Whether more items are currently being loaded
   */
  isLoading: boolean;

  /**
   * Whether there are more items to load
   */
  hasMore: boolean;

  /**
   * Distance from bottom (in pixels) to trigger load
   * @default 200
   */
  threshold?: number;

  /**
   * Root element for intersection observer
   * @default window
   */
  root?: HTMLElement | null;
}

/**
 * Reusable hook for infinite scroll / load-more-on-scroll
 *
 * Usage:
 * ```tsx
 * const loadMoreRef = useInfiniteScroll({
 *   onLoadMore: () => fetchNextBatch(),
 *   isLoading: loading,
 *   hasMore: hasMoreItems
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={loadMoreRef} />
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 200,
  root = null
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // If the sentinel element is visible and we're not loading and there's more to load
      if (entry.isIntersecting && !isLoading && hasMore) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoading, hasMore]
  );

  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root,
      rootMargin: `${threshold}px`,
      threshold: 0.1
    });

    // Observe the sentinel element
    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    // Cleanup on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, root]);

  return loadMoreRef;
}
