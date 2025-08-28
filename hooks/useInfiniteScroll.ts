"use client";

/**
 * useInfiniteScroll (no external deps)
 * - Gestisce items, pagina, hasMore, loading, error
 * - Usa IntersectionObserver su un ref-sentinella
 *
 * USO:
 * const {
 *   items, loading, error, hasMore,
 *   sentinelRef, reset, reload, setItems
 * } = useInfiniteScroll<T>({
 *   loader: async (page) => fetchFn(page), // deve restituire { items, page, hasMore }
 *   initialPage: 1
 * });
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface InfinitePage<T> {
  items: T[];
  page: number;
  hasMore: boolean;
}

export interface UseInfiniteScrollParams<T> {
  loader: (page: number, signal?: AbortSignal) => Promise<InfinitePage<T>>;
  initialPage?: number;
  enabled?: boolean; // per disattivare temporaneamente il caricamento
}

export interface UseInfiniteScrollReturn<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  sentinelRef: React.RefObject<HTMLDivElement>;
  reset: () => void;
  reload: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

export default function useInfiniteScroll<T>(
  params: UseInfiniteScrollParams<T>
): UseInfiniteScrollReturn<T> {
  const { loader, initialPage = 1, enabled = true } = params;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState<number>(initialPage);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const loadPage = useCallback(
    async (p: number, replace = false) => {
      if (!enabled) return;
      if (loading) return;
      if (!replace && !hasMore) return;

      setLoading(true);
      setError(null);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const data = await loader(p, ac.signal);
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
        setPage(data.page);
      } catch (e: unknown) {
        if ((e as any)?.name !== "AbortError") {
          const msg =
            (e as Error)?.message ||
            (typeof e === "string" ? e : "Errore sconosciuto");
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled, hasMore, loader, loading]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  const reload = useCallback(() => {
    reset();
    // carica la prima pagina subito dopo il reset
    // microtask per assicurare stato aggiornato
    Promise.resolve().then(() => loadPage(initialPage, true));
  }, [initialPage, loadPage, reset]);

  // IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    if (ioRef.current) {
      ioRef.current.disconnect();
      ioRef.current = null;
    }

    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !loading && hasMore && enabled) {
        // richiedi la pagina successiva
        loadPage(page + 1, false);
      }
    });

    io.observe(el);
    ioRef.current = io;

    return () => {
      io.disconnect();
    };
  }, [enabled, hasMore, loadPage, loading, page]);

  // cleanup abort
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    page,
    sentinelRef,
    reset,
    reload,
    setItems,
  };
}
