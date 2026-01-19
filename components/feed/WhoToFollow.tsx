'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useFollow } from '@/components/follow/FollowProvider';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import CertifiedClubMark from '@/components/ui/CertifiedClubMark';
import { CountryFlag } from '@/components/ui/CountryFlag';

type Suggestion = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
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

const VISIBLE_COUNT = 3;
const REQUEST_TIMEOUT_MS = 8000;
const VERSION_BADGE = 'v2026-01-18c';

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

export default function WhoToFollow() {
  const { role: contextRole } = useCurrentProfileContext();
  const { toggleFollow, ensureState, pending, currentProfileId } = useFollow();
  const [role, setRole] = useState<ProfileRole>('guest');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [booting, setBooting] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const inFlight = useRef(false);

  const normalizeSuggestions = useCallback(
    (rawItems: any[]): Suggestion[] => (
      rawItems.map((item: any) => ({
        id: item.id,
        display_name: item.display_name ?? item.name ?? null,
        full_name: item.full_name ?? item.name ?? null,
        kind:
          item.kind ??
          (item.account_type === 'club' || item.type === 'CLUB'
            ? 'club'
            : item.account_type || item.type
              ? 'player'
              : null),
        type: item.type ?? null,
        category: item.category ?? null,
        location: item.location ?? null,
        city: item.city ?? null,
        country: item.country ?? null,
        sport: item.sport ?? null,
        role: item.role ?? null,
        avatar_url: item.avatar_url ?? null,
        is_verified: item.is_verified ?? item.isVerified ?? null,
        isVerified: item.isVerified ?? null,
      })) as Suggestion[]
    ),
    [],
  );

  const fetchSuggestions = useCallback(async () => {
    const url = `/api/follows/suggestions?limit=${VISIBLE_COUNT}`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      const textBody = await res.text().catch(() => '');
      if (!res.ok) {
        console.error('[WhoToFollow] fetch failed', { url, status: res.status, body: textBody });
        throw new Error(`HTTP ${res.status}`);
      }
      const data = textBody ? JSON.parse(textBody) : {};
      if (data?.ok === false) {
        console.error('[WhoToFollow] fetch failed', { url, status: res.status, body: textBody });
        throw new Error('Impossibile caricare i suggerimenti');
      }
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.suggestions)
            ? data.suggestions
            : [];
      const normalized = normalizeSuggestions(rawItems);
      const ids = normalized.map((item) => item.id).filter(Boolean);
      if (ids.length) {
        await ensureState(ids);
      }
      const uniqueSuggestions = normalized.filter((item) => {
        if (!item.id) return false;
        if (item.id === currentProfileId) return false;
        if (seenIds.current.has(item.id)) return false;
        return true;
      });
      return {
        role: (data?.role as ProfileRole) || contextRole || 'guest',
        suggestions: uniqueSuggestions,
      };
    } catch (err) {
      console.error('[WhoToFollow] fetch error', err);
      throw err;
    } finally {
      window.clearTimeout(timeout);
    }
  }, [contextRole, currentProfileId, ensureState, normalizeSuggestions]);

  const markSeen = useCallback((items: Suggestion[]) => {
    items.forEach((item) => {
      if (item.id) seenIds.current.add(item.id);
    });
  }, []);

  const loadSuggestions = useCallback(async (mode: 'boot' | 'reload') => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (mode === 'boot') {
      setBooting(true);
    } else {
      setIsReloading(true);
    }
    setError(null);
    seenIds.current = new Set();
    try {
      const { role: resolvedRole, suggestions: nextSuggestions } = await fetchSuggestions();
      setRole(resolvedRole);
      markSeen(nextSuggestions);
      setItems(nextSuggestions.slice(0, VISIBLE_COUNT));
      setError(null);
    } catch (err) {
      setItems([]);
      setRole(contextRole || 'guest');
      setError(err instanceof Error ? err.message : 'Impossibile caricare i suggerimenti.');
    } finally {
      setBooting(false);
      setIsReloading(false);
      inFlight.current = false;
    }
  }, [contextRole, fetchSuggestions, markSeen]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!inFlight.current) return;
      setBooting(false);
      setError('Timeout caricamento suggerimenti');
      setIsReloading(false);
      inFlight.current = false;
    }, REQUEST_TIMEOUT_MS);
    void loadSuggestions('boot').finally(() => window.clearTimeout(timeout));
    return () => window.clearTimeout(timeout);
  }, [loadSuggestions]);

  const handleFollow = useCallback(async (targetId: string) => {
    const cleanId = (targetId || '').trim();
    if (!cleanId) return;
    if (localPending.has(cleanId) || pending.has(cleanId)) return;
    setLocalPending((prev) => new Set(prev).add(cleanId));
    try {
      await toggleFollow(cleanId);
      setRemovingId(cleanId);
      window.setTimeout(async () => {
        setItems((prevItems) => prevItems.filter((item) => item.id !== cleanId));
        setRemovingId(null);
        await loadSuggestions('reload');
      }, 220);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[who-to-follow] follow error', error);
      }
    } finally {
      setLocalPending((prev) => {
        const next = new Set(prev);
        next.delete(cleanId);
        return next;
      });
    }
  }, [loadSuggestions, localPending, pending, toggleFollow]);

  if (booting) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>Chi seguire</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
              {VERSION_BADGE}
            </span>
          </div>
          <Link href="/discover" className="text-xs font-semibold text-[var(--brand)] hover:underline">
            Vedi tutti
          </Link>
        </div>
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

  const heading = 'Chi seguire';
  const subtitle = 'Suggeriti per te';
  const itemsToShow = items;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <span>{heading}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
            {VERSION_BADGE}
          </span>
        </div>
        <Link href="/discover" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          Vedi tutti
        </Link>
      </div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
      {error ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <p>Impossibile caricare i suggerimenti.</p>
          <button
            type="button"
            onClick={() => loadSuggestions('boot')}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Riprova
          </button>
        </div>
      ) : itemsToShow.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <p>Nessun suggerimento al momento.</p>
          <button
            type="button"
            onClick={() => loadSuggestions('reload')}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Ricarica
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {itemsToShow.map((it) => {
            const name = displayName(it);
            const href = targetHref(it);
            const itemType = it.type ?? (it.kind === 'club' ? 'CLUB' : it.kind === 'player' ? 'PLAYER' : null);
            const isCertified = itemType === 'CLUB' && Boolean((it as any).is_verified ?? (it as any).isVerified ?? false);
            const isLoading = localPending.has(it.id) || pending.has(it.id);
            const isRemoving = removingId === it.id;
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
                    {isCertified ? <CertifiedClubMark size="sm" className="absolute -top-1 -right-1" /> : null}
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
                    onClick={() => handleFollow(it.id)}
                    disabled={isLoading || isReloading}
                    className={`inline-flex items-center gap-2 rounded-md border transition ${
                      isLoading || isReloading
                        ? 'border-neutral-200 bg-neutral-50 text-neutral-400'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                    } px-2 py-1 text-sm`}
                  >
                    {isLoading ? '...' : 'Segui'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
