'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import SearchResultRow, { type SearchResult } from '@/components/search/SearchResultRow';
import { useItalyLocations } from '@/hooks/useItalyLocations';
import { COUNTRIES } from '@/lib/opps/geo';
import { normalizeSport, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { CATEGORIES_BY_SPORT } from '@/lib/opps/categories';

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

type SearchFilters = {
  q: string;
  country: string;
  region: string;
  province: string;
  city: string;
  sport: string;
  category: string;
  role: string;
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

function readFiltersFromParams(params: URLSearchParams | ReturnType<typeof useSearchParams>): SearchFilters {
  return {
    q: (params.get('q') || '').trim(),
    country: (params.get('country') || '').trim(),
    region: (params.get('region') || '').trim(),
    province: (params.get('province') || '').trim(),
    city: (params.get('city') || '').trim(),
    sport: (params.get('sport') || '').trim(),
    category: (params.get('category') || '').trim(),
    role: (params.get('role') || '').trim(),
  };
}

function hasGeo(filters: SearchFilters) {
  return Boolean(filters.country || filters.region || filters.province || filters.city);
}

function isRunnable(filters: SearchFilters) {
  return hasGeo(filters) || filters.q.length >= 2;
}

function buildQueryString(filters: SearchFilters, type: SearchType) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.country) params.set('country', filters.country);
  if (filters.region) params.set('region', filters.region);
  if (filters.province) params.set('province', filters.province);
  if (filters.city) params.set('city', filters.city);
  if (filters.sport) params.set('sport', filters.sport);
  if (filters.category) params.set('category', filters.category);
  if (filters.role) params.set('role', filters.role);
  params.set('type', type);
  return params.toString();
}

function resultsForType(results: SearchResultsByKind, type: SearchType) {
  if (type === 'all') return [];
  return results[type];
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = normalizeType(searchParams.get('type'));
  const appliedFilters = useMemo(() => readFiltersFromParams(searchParams), [searchParams]);

  const [formFilters, setFormFilters] = useState<SearchFilters>(appliedFilters);
  const [results, setResults] = useState<SearchResultsByKind>(EMPTY_RESULTS);
  const [counts, setCounts] = useState<CountsByKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: italyLocations } = useItalyLocations();

  useEffect(() => {
    setFormFilters(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    setPage(1);
  }, [searchParams, type]);

  const availableRegions = useMemo(() => (formFilters.country === 'IT' ? italyLocations.regions : []), [formFilters.country, italyLocations.regions]);
  const availableProvinces = useMemo(() => (formFilters.country === 'IT' ? italyLocations.provincesByRegion[formFilters.region] ?? [] : []), [formFilters.country, formFilters.region, italyLocations.provincesByRegion]);
  const availableCities = useMemo(() => (formFilters.country === 'IT' ? italyLocations.citiesByProvince[formFilters.province] ?? [] : []), [formFilters.country, formFilters.province, italyLocations.citiesByProvince]);

  const normalizedSport = normalizeSport(formFilters.sport) ?? formFilters.sport;
  const roleOptions = useMemo(() => (normalizedSport ? SPORTS_ROLES[normalizedSport] ?? [] : []), [normalizedSport]);
  const categoryOptions = useMemo(() => (normalizedSport ? CATEGORIES_BY_SPORT[normalizedSport] ?? [] : []), [normalizedSport]);

  useEffect(() => {
    if (!isRunnable(appliedFilters)) {
      setResults(EMPTY_RESULTS);
      setCounts(null);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const runSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(buildQueryString(appliedFilters, type));
        params.set('page', String(page));
        params.set('limit', String(PAGE_LIMIT));

        const res = await fetch(`/api/search?${params.toString()}`, { credentials: 'include', cache: 'no-store', signal: controller.signal });
        const payload = await res.json();
        if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'Errore nel caricamento dei risultati');

        const nextResults = (payload?.results || EMPTY_RESULTS) as SearchResultsByKind;
        const nextCounts = payload?.counts as CountsByKind | undefined;
        setCounts(nextCounts ?? null);

        setResults((prev) => {
          if (type === 'all' || page === 1) return nextResults;
          return { ...prev, [type]: [...(prev[type] || []), ...(nextResults[type] || [])] } as SearchResultsByKind;
        });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setError((err as Error)?.message || 'Errore inatteso nella ricerca');
        }
      } finally {
        setLoading(false);
      }
    };

    runSearch();
    return () => controller.abort();
  }, [appliedFilters, page, type]);

  const activeResults = useMemo(() => resultsForType(results, type), [results, type]);
  const hasMore = useMemo(() => {
    if (type === 'all' || !counts) return false;
    return activeResults.length < counts[type];
  }, [activeResults.length, counts, type]);

  const handleTabChange = (next: SearchType) => {
    router.push(`/search?${buildQueryString(appliedFilters, next)}`);
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/search?${buildQueryString(formFilters, 'all')}`);
  };

  return (
    <div className="page-shell space-y-6">
      <form onSubmit={applyFilters} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={formFilters.q} onChange={(e) => setFormFilters((p) => ({ ...p, q: e.target.value }))} placeholder="Cerca club, player, opportunità, post" aria-label="Cerca" className="h-11 w-full rounded-full border border-slate-200 bg-white px-10 text-sm text-slate-700 shadow-sm transition focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select value={formFilters.country} onChange={(e) => setFormFilters((p) => ({ ...p, country: e.target.value, region: '', province: '', city: '' }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">Paese</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.label}</option>
            ))}
          </select>

          <select value={formFilters.region} onChange={(e) => setFormFilters((p) => ({ ...p, region: e.target.value, province: '', city: '' }))} disabled={formFilters.country !== 'IT'} className="h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100">
            <option value="">Regione</option>
            {availableRegions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>

          <select value={formFilters.province} onChange={(e) => setFormFilters((p) => ({ ...p, province: e.target.value, city: '' }))} disabled={!formFilters.region || formFilters.country !== 'IT'} className="h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100">
            <option value="">Provincia</option>
            {availableProvinces.map((province) => <option key={province} value={province}>{province}</option>)}
          </select>

          <select value={formFilters.city} onChange={(e) => setFormFilters((p) => ({ ...p, city: e.target.value }))} disabled={!formFilters.province || formFilters.country !== 'IT'} className="h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100">
            <option value="">Città</option>
            {availableCities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>

          <select value={formFilters.sport} onChange={(e) => setFormFilters((p) => ({ ...p, sport: e.target.value, role: '', category: '' }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">Sport</option>
            {SPORTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
          </select>

          <select value={formFilters.category} onChange={(e) => setFormFilters((p) => ({ ...p, category: e.target.value }))} disabled={!normalizedSport} className="h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100">
            <option value="">Categoria</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>

          <select value={formFilters.role} onChange={(e) => setFormFilters((p) => ({ ...p, role: e.target.value }))} disabled={!normalizedSport} className="h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100">
            <option value="">Ruolo</option>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>

          <button type="submit" className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--brand)] bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90">Applica filtri</button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {TAB_ITEMS.map((tab) => {
          const isActive = tab.value === type;
          const countLabel = tab.value === 'all' ? null : counts ? ` (${counts[tab.value] ?? 0})` : ' (…)';
          return (
            <button key={tab.value} type="button" onClick={() => handleTabChange(tab.value)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${isActive ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {tab.label}{countLabel}
            </button>
          );
        })}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!error && !isRunnable(appliedFilters) && <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">Imposta almeno un filtro geografico oppure una query testuale di almeno 2 caratteri.</div>}

      {!error && isRunnable(appliedFilters) && (
        <div className="space-y-8">
          {type === 'all' ? (
            <div className="space-y-8">
              {([
                { key: 'opportunities', label: 'Opportunità' },
                { key: 'clubs', label: 'Club' },
                { key: 'players', label: 'Player' },
                { key: 'posts', label: 'Post' },
                { key: 'events', label: 'Eventi' },
              ] as Array<{ key: Exclude<SearchType, 'all'>; label: string }>).map((section) => {
                const items = results[section.key];
                const total = counts?.[section.key] ?? null;
                return (
                  <section key={section.key} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
                      <button type="button" className="text-sm font-medium text-[var(--brand)] hover:underline" onClick={() => handleTabChange(section.key)}>Vedi tutti</button>
                    </div>
                    {loading && items.length === 0 ? <div className="text-sm text-slate-500">Caricamento…</div> : items.length === 0 ? <div className="text-sm text-slate-500">{total === 0 ? 'Nessun risultato.' : 'Nessun risultato disponibile.'}</div> : <div className="space-y-3">{items.map((item) => <SearchResultRow key={`${section.key}-${item.id}`} result={item} />)}</div>}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {loading && activeResults.length === 0 ? <div className="text-sm text-slate-500">Caricamento…</div> : activeResults.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">Nessun risultato trovato per questa ricerca.</div> : <div className="space-y-3">{activeResults.map((item) => <SearchResultRow key={`${type}-${item.id}`} result={item} />)}</div>}
              {hasMore && <div className="flex justify-center"><button type="button" onClick={() => setPage((prev) => prev + 1)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Carica altri</button></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
