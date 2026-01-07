'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import SearchResultRow, { type SearchResult } from '@/components/search/SearchResultRow';

type SearchType = 'all' | 'opportunities' | 'clubs' | 'players' | 'posts' | 'events';

type SearchResultsByKind = {
  opportunities: SearchResult[];
  clubs: SearchResult[];
  players: SearchResult[];
  posts: SearchResult[];
  events: SearchResult[];
};

type CountsByKind = {
  opportunities: number;
  clubs: number;
  players: number;
  posts: number;
  events: number;
};

const EMPTY_RESULTS: SearchResultsByKind = {
  opportunities: [],
  clubs: [],
  players: [],
  posts: [],
  events: [],
};

const TAB_ITEMS: Array<{ label: string; value: SearchType }> = [
  { label: 'Tutti', value: 'all' },
  { label: 'Opportunità', value: 'opportunities' },
  { label: 'Club', value: 'clubs' },
  { label: 'Player', value: 'players' },
  { label: 'Post', value: 'posts' },
  { label: 'Eventi', value: 'events' },
];

const PAGE_LIMIT = 10;

function normalizeType(raw?: string | null): SearchType {
  const value = (raw || '').trim().toLowerCase();
  const aliases: Record<string, SearchType> = {
    all: 'all',
    opportunity: 'opportunities',
    opportunities: 'opportunities',
    club: 'clubs',
    clubs: 'clubs',
    player: 'players',
    players: 'players',
    post: 'posts',
    posts: 'posts',
    event: 'events',
    events: 'events',
  };
  const resolved = aliases[value] ?? value;
  if (resolved === 'opportunities' || resolved === 'clubs' || resolved === 'players' || resolved === 'posts' || resolved === 'events') {
    return resolved;
  }
  return 'all';
}

function resultsForType(results: SearchResultsByKind, type: SearchType) {
  if (type === 'all') return [];
  return results[type];
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = (searchParams.get('q') || '').trim();
  const type = normalizeType(searchParams.get('type'));

  const [inputValue, setInputValue] = useState(queryParam);
  const [results, setResults] = useState<SearchResultsByKind>(EMPTY_RESULTS);
  const [counts, setCounts] = useState<CountsByKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setPage(1);
  }, [queryParam, type]);

  useEffect(() => {
    if (!queryParam) {
      setResults(EMPTY_RESULTS);
      setCounts(null);
      setError(null);
      return;
    }

    if (queryParam.length < 2) {
      setResults(EMPTY_RESULTS);
      setCounts(null);
      setError('Inserisci almeno 2 caratteri per avviare la ricerca.');
      return;
    }

    const controller = new AbortController();

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: queryParam,
          type,
          page: String(page),
          limit: String(PAGE_LIMIT),
        });
        const res = await fetch(`/api/search?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await res.json();
        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.message || 'Errore nel caricamento dei risultati');
        }

        const nextResults = (payload?.results || EMPTY_RESULTS) as SearchResultsByKind;
        const nextCounts = payload?.counts as CountsByKind | undefined;

        setCounts(nextCounts ?? null);

        setResults((prev) => {
          if (type === 'all' || page === 1) {
            return nextResults;
          }
          return {
            ...prev,
            [type]: [...(prev[type] || []), ...(nextResults[type] || [])],
          } as SearchResultsByKind;
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setError((err as Error)?.message || 'Errore inatteso nella ricerca');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    return () => controller.abort();
  }, [queryParam, type, page]);

  const activeResults = useMemo(() => resultsForType(results, type), [results, type]);
  const hasMore = useMemo(() => {
    if (type === 'all' || !counts) return false;
    return activeResults.length < counts[type];
  }, [activeResults.length, counts, type]);

  const handleTabChange = (next: SearchType) => {
    if (!queryParam) return;
    router.push(`/search?q=${encodeURIComponent(queryParam)}&type=${next}`);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}&type=all`);
  };

  return (
    <div className="page-shell space-y-6">
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Cerca club, player, opportunità, post, eventi…"
              aria-label="Cerca"
              className="h-11 w-full rounded-full border border-slate-200 bg-white px-10 text-sm text-slate-700 shadow-sm transition focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full border border-[var(--brand)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Cerca
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {TAB_ITEMS.map((tab) => {
            const isActive = tab.value === type;
            const countLabel =
              tab.value === 'all'
                ? null
                : counts
                  ? ` (${counts[tab.value] ?? 0})`
                  : ' (…)';
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {countLabel}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!error && !queryParam && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          Inizia a digitare per cercare club, player, opportunità, post ed eventi.
        </div>
      )}

      {!error && queryParam && queryParam.length >= 2 && (
        <div className="space-y-8">
          {type === 'all' ? (
            <div className="space-y-8">
              {(
                [
                  { key: 'opportunities', label: 'Opportunità' },
                  { key: 'clubs', label: 'Club' },
                  { key: 'players', label: 'Player' },
                  { key: 'posts', label: 'Post' },
                  { key: 'events', label: 'Eventi' },
                ] as Array<{ key: Exclude<SearchType, 'all'>; label: string }>
              ).map((section) => {
                const items = results[section.key];
                const total = counts?.[section.key] ?? null;
                return (
                  <section key={section.key} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
                      <button
                        type="button"
                        className="text-sm font-medium text-[var(--brand)] hover:underline"
                        onClick={() => handleTabChange(section.key)}
                      >
                        Vedi tutti
                      </button>
                    </div>
                    {loading && items.length === 0 ? (
                      <div className="text-sm text-slate-500">Caricamento…</div>
                    ) : items.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        {total === 0 ? 'Nessun risultato.' : 'Nessun risultato disponibile.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <SearchResultRow key={`${section.key}-${item.id}`} result={item} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {loading && activeResults.length === 0 ? (
                <div className="text-sm text-slate-500">Caricamento…</div>
              ) : activeResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                  Nessun risultato trovato per questa ricerca.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeResults.map((item) => (
                    <SearchResultRow key={`${type}-${item.id}`} result={item} />
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => prev + 1)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Carica altri
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
