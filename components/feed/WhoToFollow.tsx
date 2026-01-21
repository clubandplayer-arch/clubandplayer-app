'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import CertifiedCMarkSidebar from '@/components/badges/CertifiedCMarkSidebar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { toggleFollow } from '@/lib/services/follow';

type Suggestion = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  accountType?: string | null;
  account_type?: string | null;
  kind?: 'club' | 'player' | null;
  type?: string | null;
  category?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  isVerified?: boolean | null;
};

function targetHref(item: Suggestion) {
  return item.kind === 'club' ? `/clubs/${item.id}` : `/players/${item.id}`;
}

function displayName(item: Suggestion) {
  return item.kind === 'club'
    ? buildClubDisplayName(item.full_name ?? null, item.display_name ?? null, 'Club')
    : buildPlayerDisplayName(item.full_name ?? null, item.display_name ?? null, 'Profilo');
}

function joinWithSeparator(parts: ReactNode[], separator: string) {
  return parts.reduce<ReactNode[]>((acc, part, index) => {
    if (index > 0) {
      acc.push(
        <span key={`sep-${index}`} className="text-inherit">
          {separator}
        </span>
      );
    }
    acc.push(part);
    return acc;
  }, []);
}

function getCountryInfo(country?: string | null) {
  const raw = (country ?? '').trim();
  if (!raw) return { iso2: null, label: '' };
  const matchCountry = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  const iso2 = matchCountry ? matchCountry[1].trim().toUpperCase() : null;
  const label = (matchCountry ? (matchCountry[2]?.trim() || iso2 || '') : raw) || '';
  return { iso2, label };
}

function formatCountryNode(info: { iso2: string | null; label: string }) {
  if (!info.label) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <CountryFlag iso2={info.iso2} />
      <span>{info.label}</span>
    </span>
  );
}

function formatLocationNode(location?: string | null) {
  const raw = (location ?? '').trim();
  if (!raw) return null;
  const parts = raw.split(' · ');
  if (parts.length < 2) {
    return formatCountryNode(getCountryInfo(raw));
  }
  const last = parts[parts.length - 1];
  const formattedLast = formatCountryNode(getCountryInfo(last));
  if (!formattedLast) return raw;
  const leading = parts.slice(0, -1).join(' · ');
  const nodes: ReactNode[] = [];
  if (leading) {
    nodes.push(<span key="leading">{leading}</span>);
  }
  nodes.push(<span key="country">{formattedLast}</span>);
  return <>{joinWithSeparator(nodes, ' · ')}</>;
}

function detailLine(suggestion: Suggestion, viewerRole: ProfileRole): ReactNode {
  const countryInfo = getCountryInfo(suggestion.country);
  const countryNode = formatCountryNode(countryInfo);
  const locationParts: ReactNode[] = [];
  if (suggestion.city) {
    locationParts.push(<span key="city">{suggestion.city}</span>);
  }
  if (countryNode) {
    locationParts.push(<span key="country">{countryNode}</span>);
  }
  const location = locationParts.length ? <>{joinWithSeparator(locationParts, ', ')}</> : formatLocationNode(suggestion.location);
  const sportRole = [suggestion.category || suggestion.sport, suggestion.role].filter(Boolean).join(' · ');

  if (viewerRole === 'club') {
    return sportRole || location || '';
  }
  return location || sportRole || '';
}

type WhoToFollowVariant = 'sidebar' | 'page';

type WhoToFollowProps = {
  variant?: WhoToFollowVariant;
  visibleLimit?: number;
  prefetchLimit?: number;
};

const DEFAULT_VISIBLE_LIMIT = 3;
const DEFAULT_PREFETCH_LIMIT = 9;
const REFILL_LIMIT = 6;
const REFILL_THRESHOLD = 3;
const REMOVE_DELAY_MS = 200;

function normalizeSuggestions(rawItems: any[]): Suggestion[] {
  return rawItems.map((item: any) => ({
    id: item.id,
    display_name: item.display_name ?? item.name ?? null,
    full_name: item.full_name ?? item.name ?? null,
    accountType: item.accountType ?? item.account_type ?? null,
    account_type: item.account_type ?? null,
    kind:
      item.kind ??
      (item.account_type === 'club' || item.type === 'CLUB' ? 'club' : item.account_type || item.type ? 'player' : null),
    type: item.type ?? null,
    category: item.category ?? null,
    location: item.location ?? null,
    city: item.city ?? null,
    country: item.country ?? null,
    sport: item.sport ?? null,
    role: item.role ?? null,
    avatar_url: item.avatar_url ?? null,
    is_verified: item.is_verified ?? item.isVerified ?? null,
    isVerified: item.is_verified ?? item.isVerified ?? false,
  })) as Suggestion[];
}

export default function WhoToFollow({
  variant = 'sidebar',
  visibleLimit = DEFAULT_VISIBLE_LIMIT,
  prefetchLimit = DEFAULT_PREFETCH_LIMIT,
}: WhoToFollowProps) {
  const { role: contextRole } = useCurrentProfileContext();
  const isSidebar = variant === 'sidebar';
  const skeletonCount = Math.min(visibleLimit, 6);
  const [role, setRole] = useState<ProfileRole>('guest');
  const [visible, setVisible] = useState<Suggestion[]>([]);
  const [queue, setQueue] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const removingIdsRef = useRef(new Set<string>());
  const [removingIdsVersion, setRemovingIdsVersion] = useState(0);
  const inFlightFollowRef = useRef(new Set<string>());
  const seenRef = useRef(new Set<string>());
  const replacementRef = useRef(new Map<string, Suggestion>());
  const refillInFlightRef = useRef(false);
  const canRefillRef = useRef(true);
  const isMountedRef = useRef(true);
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const hadDataRef = useRef(false);
  const contextRoleRef = useRef<ProfileRole>('guest');

  const loadSuggestions = useCallback(async (limit: number) => {
    const myReqId = ++reqIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setIsEmpty(false);
    canRefillRef.current = true;
    seenRef.current.clear();
    try {
      const res = await fetch(`/api/follows/suggestions?limit=${limit}`, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('[WhoToFollow] suggestions failed', { status: res.status, body });
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json().catch(() => ({}));
      if (myReqId !== reqIdRef.current || !isMountedRef.current) return 0;
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.suggestions)
        ? data.suggestions
        : [];
      const suggestions = normalizeSuggestions(rawItems);
      const filtered: Suggestion[] = [];
      suggestions.forEach((item) => {
        const id = (item.id || '').trim();
        if (!id || seenRef.current.has(id)) return;
        seenRef.current.add(id);
        filtered.push(item);
      });
      if (filtered.length === 0) {
        if (!hadDataRef.current) {
          setVisible([]);
          setQueue([]);
          setIsEmpty(true);
        } else {
          console.warn('[WhoToFollow] empty response ignored because we already had data');
        }
        return 0;
      }
      hadDataRef.current = true;
      setIsEmpty(false);
      setRole((data?.role as ProfileRole) || contextRoleRef.current || 'guest');
      setVisible(filtered.slice(0, visibleLimit));
      setQueue(filtered.slice(visibleLimit));
      return filtered.length;
    } catch (err) {
      if (myReqId !== reqIdRef.current || !isMountedRef.current) return 0;
      if ((err as Error)?.name === 'AbortError') return 0;
      console.error('[WhoToFollow] load error', err);
      setError(err instanceof Error ? err.message : 'Errore caricamento suggerimenti');
      if (!hadDataRef.current) {
        setVisible([]);
      }
      return 0;
    } finally {
      if (myReqId === reqIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [visibleLimit]);

  const refillSuggestions = useCallback(async (limit: number) => {
    try {
      const res = await fetch(`/api/follows/suggestions?limit=${limit}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return 0;
      const data = await res.json().catch(() => ({}));
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.suggestions)
        ? data.suggestions
        : [];
      const suggestions = normalizeSuggestions(rawItems);
      const filtered: Suggestion[] = [];
      suggestions.forEach((item) => {
        const id = (item.id || '').trim();
        if (!id || seenRef.current.has(id)) return;
        seenRef.current.add(id);
        filtered.push(item);
      });
      if (!isMountedRef.current) return 0;
      if (filtered.length) {
        setQueue((prev) => [...prev, ...filtered]);
      }
      return filtered.length;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[WhoToFollow] refill error', err);
      }
      return 0;
    }
  }, []);

  useEffect(() => {
    contextRoleRef.current = contextRole || 'guest';
  }, [contextRole]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadSuggestions(prefetchLimit);
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [loadSuggestions, prefetchLimit]);

  useEffect(() => {
    if (loading || error || !canRefillRef.current) return;
    if (queue.length >= REFILL_THRESHOLD) return;
    if (refillInFlightRef.current) return;
    refillInFlightRef.current = true;
    void refillSuggestions(REFILL_LIMIT).then((added) => {
      if (added === 0) {
        canRefillRef.current = false;
      }
    }).finally(() => {
      refillInFlightRef.current = false;
    });
  }, [error, loading, queue.length, refillSuggestions]);

  if (loading) {
    return (
      <div className="space-y-3">
        {isSidebar ? (
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Chi seguire</div>
            <Link href="/discover" className="text-xs font-semibold text-[var(--brand)] hover:underline">
              Vedi tutti
            </Link>
          </div>
        ) : null}
        <ul className="space-y-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1">
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const handleFollow = async (item: Suggestion) => {
    const id = (item.id || '').trim();
    if (!id || inFlightFollowRef.current.has(id)) return;
    inFlightFollowRef.current.add(id);
    setError(null);
    removingIdsRef.current.add(id);
    setRemovingIdsVersion((version) => version + 1);

    const removalTimer = window.setTimeout(() => {
      setVisible((prev) => prev.filter((current) => current.id !== id));
      setQueue((prevQ) => {
        const nextIndex = prevQ.findIndex((candidate) => candidate.id !== id && !removingIdsRef.current.has(candidate.id));
        if (nextIndex === -1) return prevQ;
        const nextReplacement = prevQ[nextIndex];
        replacementRef.current.set(id, nextReplacement);
        setVisible((prev) => [...prev, nextReplacement].slice(0, visibleLimit));
        return prevQ.filter((_, index) => index !== nextIndex);
      });
      removingIdsRef.current.delete(id);
      setRemovingIdsVersion((version) => version + 1);
    }, REMOVE_DELAY_MS);

    try {
      await toggleFollow(id);
    } catch (err) {
      window.clearTimeout(removalTimer);
      removingIdsRef.current.delete(id);
      setRemovingIdsVersion((version) => version + 1);
      setVisible((prev) => {
        if (prev.some((current) => current.id === id)) return prev;
        const nextVisible = [item, ...prev];
        if (nextVisible.length > visibleLimit) {
          const removed = nextVisible.pop();
          if (removed) {
            setQueue((prevQ) => [removed, ...prevQ]);
          }
        }
        return nextVisible;
      });
      const replacementItem = replacementRef.current.get(id);
      if (replacementItem) {
        setVisible((prev) => prev.filter((current) => current.id !== replacementItem.id));
        setQueue((prevQ) => [replacementItem, ...prevQ.filter((current) => current.id !== replacementItem.id)]);
      }
      setError('Impossibile seguire, riprova.');
    } finally {
      replacementRef.current.delete(id);
      inFlightFollowRef.current.delete(id);
    }
  };

  return (
    <div className="space-y-3">
      {isSidebar ? (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Chi seguire</div>
            <Link href="/discover" className="text-xs font-semibold text-[var(--brand)] hover:underline">
              Vedi tutti
            </Link>
          </div>
          <div className="text-xs text-zinc-500">Suggeriti per te</div>
        </>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadSuggestions(prefetchLimit)}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Riprova
          </button>
        </div>
      ) : visible.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((it) => {
            const isRemoving = removingIdsRef.current.has(it.id) && removingIdsVersion >= 0;
            const name = displayName(it);
            const href = targetHref(it);
            const rawType = String(it.accountType ?? it.account_type ?? it.type ?? it.kind ?? '').toLowerCase();
            const isClub = rawType === 'club';
            const isCertified = isClub && Boolean(it.is_verified ?? it.isVerified ?? false);
            return (
              <li
                key={it.id}
                className={`relative flex items-center gap-3 transition-all duration-200 ease-out ${
                  isRemoving ? 'opacity-0 -translate-y-1 scale-95 pointer-events-none' : ''
                }`}
              >
                <Link
                  href={href}
                  aria-label={`Apri profilo ${name}`}
                  className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                />
                <div className="relative z-20 flex min-w-0 flex-1 items-center gap-3 pointer-events-none">
                  <div className="relative">
                    <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-800">
                      <img
                        src={it.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {isCertified ? <CertifiedCMarkSidebar className="absolute -top-2 -right-2 scale-[0.75]" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate text-sm font-medium">{name}</span>
                    </div>
                    <div className="truncate text-xs text-zinc-500">{detailLine(it, role) || '—'}</div>
                  </div>
                </div>

                {it.kind ? (
                  <span className="relative z-20 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 pointer-events-none">
                    {it.kind === 'club' ? 'CLUB' : 'PLAYER'}
                  </span>
                ) : null}
                <div
                  className="relative z-30"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleFollow(it)}
                    disabled={inFlightFollowRef.current.has(it.id)}
                    className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {inFlightFollowRef.current.has(it.id) ? '...' : 'Segui'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Nessun suggerimento al momento.
        </div>
      ) : null}
    </div>
  );
}
