import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';

export type FeedScope = 'all' | 'following';

export type UseFeedOptions = {
  initialScope?: FeedScope;
  pageSize?: number;
  authorId?: string | null;
};

export type UseFeedResult = {
  posts: FeedPost[];
  scope: FeedScope;
  setScope: (scope: FeedScope) => void;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updatePost: (next: FeedPost) => void;
  removePost: (postId: string) => void;
};

async function fetchPosts(
  params: {
    signal?: AbortSignal;
    authorId?: string | null;
    page: number;
    scope: FeedScope;
    pageSize: number;
  },
): Promise<{ items: FeedPost[]; nextPage: number | null }> {
  const { authorId, page, signal, scope, pageSize } = params;
  const searchParams = new URLSearchParams({
    limit: String(pageSize),
    page: String(page),
    scope,
  });
  if (authorId) searchParams.set('authorId', authorId);

  const res = await fetch(`/api/feed/posts?${searchParams.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });

  if (!res.ok) return { items: [], nextPage: null };

  const json = await res.json().catch(() => ({} as any));
  const rawItems = Array.isArray(json?.items ?? json?.data) ? json.items ?? json.data : [];
  const normalized = rawItems.map(normalizePost);
  const nextFromApi = typeof json?.nextPage === 'number' ? json.nextPage : null;
  const fallbackNext = normalized.length >= pageSize ? page + 1 : null;

  return { items: normalized, nextPage: nextFromApi ?? fallbackNext };
}

export function useFeed(options?: UseFeedOptions): UseFeedResult {
  const pageSize = options?.pageSize ?? 10;
  const authorId = options?.authorId ?? null;
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [scope, setScopeState] = useState<FeedScope>(options?.initialScope ?? 'all');
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abortOngoing = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const performLoad = useCallback(
    async (page: number, opts?: { reset?: boolean; signal?: AbortSignal }) => {
      const controller = opts?.signal ? null : new AbortController();
      const signal = opts?.signal ?? controller?.signal;
      if (!opts?.signal) abortRef.current = controller;

      if (opts?.reset) {
        setPosts([]);
        setNextPage(null);
        setError(null);
      }

      try {
        const { items, nextPage: apiNext } = await fetchPosts({
          authorId,
          page,
          scope,
          pageSize,
          signal: signal ?? undefined,
        });
        setPosts((curr) => {
          if (opts?.reset) return items;
          const seen = new Set(curr.map((p) => String(p.id)));
          const fresh = items.filter((p) => !seen.has(String(p.id)));
          return [...curr, ...fresh];
        });
        setNextPage(apiNext);
      } catch (err: any) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err : new Error(err?.message || 'Errore caricamento bacheca'));
      } finally {
        if (!signal?.aborted && controller) {
          abortRef.current = null;
        }
      }
    },
    [authorId, pageSize, scope],
  );

  const refresh = useCallback(async () => {
    abortOngoing();
    setIsInitialLoading(true);
    try {
      await performLoad(0, { reset: true });
    } finally {
      setIsInitialLoading(false);
    }
  }, [abortOngoing, performLoad]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || nextPage === null) return;
    setIsLoadingMore(true);
    try {
      await performLoad(nextPage, { reset: false });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextPage, performLoad]);

  useEffect(() => {
    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as any).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 120);
    const cancelIdle =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? (window as any).cancelIdleCallback
        : clearTimeout;

    const handle = idle(() => {
      void refresh();
    });

    return () => {
      cancelIdle(handle);
      abortOngoing();
    };
  }, [refresh, abortOngoing, scope]);

  const setScope = useCallback((next: FeedScope) => {
    setScopeState((curr) => (curr === next ? curr : next));
  }, []);

  const updatePost = useCallback((next: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const hasNextPage = useMemo(() => nextPage !== null, [nextPage]);

  return {
    posts,
    scope,
    setScope,
    isInitialLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    refresh,
    updatePost,
    removePost,
  };
}

export default useFeed;
