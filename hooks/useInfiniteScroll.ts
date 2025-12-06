import { useEffect, useRef } from 'react';
import type React from 'react';

export type UseInfiniteScrollOptions = {
  enabled: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void | Promise<void>;
  rootMargin?: string;
  threshold?: number | number[];
};

export function useInfiniteScroll<T extends HTMLElement>(
  sentinelRef: React.RefObject<T | null>,
  {
    enabled,
    hasNextPage,
    isLoading,
    onLoadMore,
    rootMargin = '800px 0px 200px 0px',
    threshold = 0,
  }: UseInfiniteScrollOptions,
): void {
  const loadingRef = useRef(isLoading);
  const loadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!enabled || !hasNextPage) return;
    const target = sentinelRef.current;
    if (!target) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingRef.current) {
            loadMoreRef.current?.();
          }
        });
      },
      { root: null, rootMargin, threshold },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [enabled, hasNextPage, rootMargin, sentinelRef, threshold]);
}

export default useInfiniteScroll;
