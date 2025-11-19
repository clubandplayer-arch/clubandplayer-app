'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ClubsApiResponse, Club } from '@/types/club';

const PAGE_SIZE = 20;
type FiltersState = {
  q: string;
  city: string;
  province: string;
  region: string;
  country: string;
};
const initialFilters: FiltersState = { q: '', city: '', province: '', region: '', country: '' };
type FilterKey = keyof FiltersState;

const FILTER_FIELDS: Array<{
  key: FilterKey;
  label: string;
  placeholder: string;
}> = [
  { key: 'q', label: 'Cerca per nome', placeholder: 'Es. ASD Carlentini' },
  { key: 'city', label: 'Città / Comune', placeholder: 'Es. Carlentini' },
  { key: 'province', label: 'Provincia', placeholder: 'Es. Siracusa' },
  { key: 'region', label: 'Regione', placeholder: 'Es. Sicilia' },
  { key: 'country', label: 'Paese', placeholder: 'Es. Italia' },
];

const formatPlace = (club: Pick<Club, 'city' | 'province' | 'region' | 'country'>) =>
  [club.city, club.province, club.region, club.country].filter(Boolean).join(', ') || '—';

export default function SearchClubPage() {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [items, setItems] = useState<Club[]>([]);
  const [meta, setMeta] = useState<Pick<ClubsApiResponse, 'total' | 'pageCount'>>({ total: 0, pageCount: 1 });

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    (Object.keys(appliedFilters) as FilterKey[]).forEach((key) => {
      const value = appliedFilters[key].trim();
      if (value) params.set(key, value);
    });
    return params;
  }, [appliedFilters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/clubs?${searchParams.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      const json: Partial<ClubsApiResponse> & { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setItems(Array.isArray(json.data) ? json.data : []);
      setMeta({
        total: json.total ?? 0,
        pageCount: json.pageCount ?? 1,
      });
    } catch (e: any) {
      setMsg(e?.message || 'Errore ricerca club');
      setItems([]);
      setMeta({ total: 0, pageCount: 1 });
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const reset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const canGoPrev = page > 1;
  const canGoNext = page < meta.pageCount;

  return (
    <main
      id="search-club-main"
      className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8"
      aria-labelledby="search-club-heading"
    >
      <header className="flex flex-wrap items-start gap-3">
        <div>
          <h1 id="search-club-heading" className="text-3xl font-semibold tracking-tight">
            Cerca club
          </h1>
          <p className="text-sm text-gray-600">
            Filtra i club per nome o zona geografica e apri il profilo per i dettagli.
          </p>
        </div>
        <div className="ml-auto text-sm">
          <Link href="/opportunities" className="link">
            ← Torna alle opportunità
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-4 shadow-sm" aria-labelledby="filters-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="filters-heading" className="text-xl font-semibold">
              Filtra i club
            </h2>
            <p id="filters-help" className="text-sm text-gray-500">
              Tutti i campi sono facoltativi: applica i filtri e la lista si aggiorna in pochi secondi.
            </p>
          </div>
          <span className="text-xs text-gray-500">API: `/api/clubs` + indici pg_trgm / created_at</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" aria-describedby="filters-help">
          <div className="grid gap-4 md:grid-cols-2">
            {FILTER_FIELDS.map(({ key, label, placeholder }) => {
              const inputId = `club-filter-${key}`;
              return (
                <div key={key} className="space-y-1">
                  <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <input
                    id={inputId}
                    value={filters[key]}
                    onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg border px-3 py-2"
                    type="text"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary min-w-[140px]">
              Applica filtri
            </button>
            <button type="button" onClick={reset} className="btn btn-outline min-w-[120px]">
              Reset
            </button>
          </div>
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
        {msg && (
          <p className="text-red-600" role="alert">
            {msg}
          </p>
        )}
        {loading && (
          <p role="status" className="text-gray-600">
            Caricamento…
          </p>
        )}
        {!loading && !msg && (
          <p className="text-gray-600">
            {meta.total} risultati · Pagina {page} di {meta.pageCount}
          </p>
        )}
      </div>

      <section className="space-y-3" aria-live="polite" aria-busy={loading}>
        {items.length === 0 && !loading && !msg && <p>Nessun club trovato.</p>}
        {items.map((c) => (
          <article key={c.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {c.logo_url ? (
                  <Image
                    src={c.logo_url}
                    alt={c.display_name || c.name}
                    width={56}
                    height={56}
                    sizes="56px"
                    loading="lazy"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-gray-100" aria-hidden="true" />
                )}
                <div>
                  <p className="text-base font-semibold">{c.display_name || c.name}</p>
                  <p className="text-sm text-gray-600">{formatPlace(c)}</p>
                </div>
              </div>
              <div>
                <Link href={`/c/${c.id}`} className="btn btn-outline">
                  Vedi profilo club →
                </Link>
              </div>
            </div>
            {c.bio && (
              <p className="mt-3 text-sm text-gray-700" style={{ whiteSpace: 'pre-wrap' }}>
                {c.bio}
              </p>
            )}
          </article>
        ))}
      </section>

      <nav
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label="Paginazione risultati"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => canGoPrev && setPage((p) => Math.max(1, p - 1))}
            disabled={!canGoPrev}
            className="btn btn-outline disabled:opacity-40"
          >
            ← Pagina precedente
          </button>
          <button
            type="button"
            onClick={() => canGoNext && setPage((p) => Math.min(meta.pageCount, p + 1))}
            disabled={!canGoNext}
            className="btn btn-outline disabled:opacity-40"
          >
            Pagina successiva →
          </button>
        </div>
        <p className="text-xs text-gray-500">
          I filtri interrogano `/api/clubs` sfruttando gli indici `pg_trgm` e `created_at`.
        </p>
      </nav>
    </main>
  );
}
