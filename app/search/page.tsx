'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import SearchResultRow, { type SearchResult } from '@/components/search/SearchResultRow';
import { COUNTRIES, getCountryName } from '@/lib/geo/countries';
import { SPORTS, SPORTS_ROLES, normalizeSport } from '@/lib/opps/constants';

type SearchType = 'all' | 'opportunities' | 'clubs' | 'players' | 'posts' | 'events';
type LocationOption = { id: number; name: string };

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
const DEFAULT_COUNTRY = 'IT';
const ITALY_LABEL = getCountryName(DEFAULT_COUNTRY) ?? 'Italia';
const COUNTRY_OPTIONS = [
  { code: '', label: 'Tutte le nazioni' },
  ...COUNTRIES.filter((country) => country.code !== 'OTHER'),
];

type SearchFilters = {
  country: string;
  region: string;
  province: string;
  city: string;
  sport: string;
  role: string;
};

const EMPTY_FILTERS: SearchFilters = {
  country: '',
  region: '',
  province: '',
  city: '',
  sport: '',
  role: '',
};

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

function readFilters(searchParams: URLSearchParams | ReturnType<typeof useSearchParams>): SearchFilters {
  return {
    country: (searchParams.get('country') || '').trim().toUpperCase(),
    region: (searchParams.get('region') || '').trim(),
    province: (searchParams.get('province') || '').trim(),
    city: (searchParams.get('city') || '').trim(),
    sport: normalizeSport(searchParams.get('sport')) ?? '',
    role: (searchParams.get('role') || '').trim(),
  };
}

function hasActiveFilters(filters: SearchFilters) {
  return Boolean(filters.country || filters.region || filters.province || filters.city || filters.sport || filters.role);
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
  const [filters, setFilters] = useState<SearchFilters>(() => readFilters(searchParams));
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setFilters(readFilters(searchParams));
  }, [searchParams]);

  const selectedCountry = filters.country || '';
  const isItalySelected = !selectedCountry || selectedCountry === DEFAULT_COUNTRY;
  const availableRoles = useMemo(() => {
    const sport = normalizeSport(filters.sport);
    return sport ? (SPORTS_ROLES[sport] ?? []) : [];
  }, [filters.sport]);

  useEffect(() => {
    setPage(1);
  }, [queryParam, type, filters.country, filters.region, filters.province, filters.city, filters.sport, filters.role]);

  useEffect(() => {
    if (!isItalySelected) {
      setRegions([]);
      setProvinces([]);
      setCities([]);
      return;
    }

    let cancelled = false;
    const loadRegions = async () => {
      try {
        const res = await fetch('/api/geo/regions', { cache: 'no-store' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || 'Errore caricamento regioni');
        if (!cancelled) {
          setRegions(Array.isArray(payload?.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) setRegions([]);
      }
    };

    loadRegions();
    return () => {
      cancelled = true;
    };
  }, [isItalySelected]);

  useEffect(() => {
    if (!isItalySelected || !filters.region) {
      setProvinces([]);
      setCities([]);
      return;
    }

    const selectedRegion = regions.find((region) => region.name === filters.region);
    if (!selectedRegion) {
      setProvinces([]);
      setCities([]);
      return;
    }

    let cancelled = false;
    const loadProvinces = async () => {
      try {
        const res = await fetch(`/api/geo/provinces?regionId=${selectedRegion.id}`, { cache: 'no-store' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || 'Errore caricamento province');
        if (!cancelled) setProvinces(Array.isArray(payload?.data) ? payload.data : []);
      } catch {
        if (!cancelled) setProvinces([]);
      }
    };

    loadProvinces();
    return () => {
      cancelled = true;
    };
  }, [filters.region, isItalySelected, regions]);

  useEffect(() => {
    if (!isItalySelected || !filters.province) {
      setCities([]);
      return;
    }

    const selectedProvince = provinces.find((province) => province.name === filters.province);
    if (!selectedProvince) {
      setCities([]);
      return;
    }

    let cancelled = false;
    const loadCities = async () => {
      try {
        const res = await fetch(`/api/geo/municipalities?provinceId=${selectedProvince.id}`, { cache: 'no-store' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || 'Errore caricamento città');
        if (!cancelled) setCities(Array.isArray(payload?.data) ? payload.data : []);
      } catch {
        if (!cancelled) setCities([]);
      }
    };

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [filters.province, isItalySelected, provinces]);

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

        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
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
  }, [queryParam, type, page, filters]);

  const activeResults = useMemo(() => resultsForType(results, type), [results, type]);
  const hasMore = useMemo(() => {
    if (type === 'all' || !counts) return false;
    return activeResults.length < counts[type];
  }, [activeResults.length, counts, type]);

  const applySearch = (nextQuery: string, nextType: SearchType, nextFilters: SearchFilters) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    params.set('type', nextType);

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/search?${params.toString()}`);
  };

  const handleTabChange = (next: SearchType) => {
    if (!queryParam) return;
    applySearch(queryParam, next, filters);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    applySearch(trimmed, 'all', filters);
  };

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => {
      const next: SearchFilters = { ...prev, [key]: value };

      if (key === 'country') {
        next.country = value.toUpperCase();
        next.region = '';
        next.province = '';
        next.city = '';
      }

      if (key === 'region') {
        next.province = '';
        next.city = '';
      }

      if (key === 'province') {
        next.city = '';
      }

      if (key === 'sport') {
        const normalized = normalizeSport(value) ?? '';
        next.sport = normalized;
        if (prev.role && !(SPORTS_ROLES[normalized] ?? []).includes(prev.role)) {
          next.role = '';
        }
      }

      return next;
    });
  };

  const applyFilters = () => {
    if (!queryParam) return;
    applySearch(queryParam, type, filters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    if (!queryParam) return;
    applySearch(queryParam, type, EMPTY_FILTERS);
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Nazione</span>
              <select
                value={filters.country}
                onChange={(event) => updateFilter('country', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code || 'all'} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Regione</span>
              <select
                value={filters.region}
                onChange={(event) => updateFilter('region', event.target.value)}
                disabled={!isItalySelected}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">{isItalySelected ? 'Tutte le regioni' : `Disponibile solo con ${ITALY_LABEL}`}</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Provincia</span>
              <select
                value={filters.province}
                onChange={(event) => updateFilter('province', event.target.value)}
                disabled={!isItalySelected || !filters.region}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Tutte le province</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Città</span>
              <select
                value={filters.city}
                onChange={(event) => updateFilter('city', event.target.value)}
                disabled={!isItalySelected || !filters.province}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Tutte le città</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Sport</span>
              <select
                value={filters.sport}
                onChange={(event) => updateFilter('sport', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                <option value="">Tutti gli sport</option>
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Ruolo</span>
              <select
                value={filters.role}
                onChange={(event) => updateFilter('role', event.target.value)}
                disabled={!filters.sport}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Tutti i ruoli</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">I ruoli mostrati dipendono dallo sport scelto.</p>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={applyFilters}
              disabled={!queryParam}
              className="inline-flex items-center justify-center rounded-full border border-[var(--brand)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Applica filtri
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters(filters)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset filtri
            </button>
          </div>
        </div>

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
                        Vedi tutti{total != null ? ` (${total})` : ''}
                      </button>
                    </div>
                    {items.length ? (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <SearchResultRow key={`${section.key}-${item.id}`} result={item} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        Nessun risultato trovato in questa sezione.
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="space-y-3">
              {activeResults.length ? (
                <div className="space-y-3">
                  {activeResults.map((item) => (
                    <SearchResultRow key={`${type}-${item.id}`} result={item} />
                  ))}
                </div>
              ) : !loading ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                  Nessun risultato trovato per questa ricerca.
                </div>
              ) : null}

              {hasMore && !loading && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Carica altri risultati
                </button>
              )}
            </section>
          )}

          {loading && (
            <div className="text-sm text-slate-500">Caricamento risultati…</div>
          )}
        </div>
      )}
    </div>
  );
}
