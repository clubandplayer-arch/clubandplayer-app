/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/common/FollowButton';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import { CountryFlag } from '@/components/ui/CountryFlag';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

type Suggestion = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  kind?: 'club' | 'player' | null;
  category?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
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

export default function WhoToFollow() {
  const { role: contextRole } = useCurrentProfileContext();
  const [role, setRole] = useState<ProfileRole>('guest');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/follows/suggestions?limit=3', {
          credentials: 'include',
          cache: 'no-store',
          next: { revalidate: 0 },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
          const message =
            data?.message || (res.status ? `Errore server (HTTP ${res.status}).` : 'Impossibile caricare i suggerimenti.');
          throw new Error(message);
        }
        const rawItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.suggestions)
          ? data.suggestions
          : [];
        const suggestions = rawItems.map((item: any) => ({
          id: item.id,
          display_name: item.display_name ?? item.name ?? null,
          full_name: item.full_name ?? item.name ?? null,
          kind: item.kind ?? (item.account_type === 'club' ? 'club' : item.account_type ? 'player' : null),
          category: item.category ?? null,
          location: item.location ?? null,
          city: item.city ?? null,
          country: item.country ?? null,
          sport: item.sport ?? null,
          role: item.role ?? null,
          avatar_url: item.avatar_url ?? null,
          is_verified: item.is_verified ?? null,
        })) as Suggestion[];
        if (cancelled) return;
        setRole((data?.role as ProfileRole) || contextRole || 'guest');
        setItems(suggestions);
        setError(null);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[who-to-follow] load error', err);
        }
        if (cancelled) return;
        setItems([]);
        setRole(contextRole || 'guest');
        setError(err instanceof Error ? err.message : 'Impossibile caricare i suggerimenti.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contextRole]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Chi seguire</div>
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
  const itemsToShow = items.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{heading}</div>
        <Link href="/discover" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          Vedi tutti
        </Link>
      </div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
      {error ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          {error}
        </div>
      ) : itemsToShow.length > 0 ? (
        <ul className="space-y-3">
          {itemsToShow.map((it) => {
            const name = displayName(it);
            const href = targetHref(it);
            return (
              <li key={it.id} className="relative flex items-center gap-3">
                <Link
                  href={href}
                  aria-label={`Apri profilo ${name}`}
                  className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                />
                <div className="relative z-20 flex min-w-0 flex-1 items-center gap-3 pointer-events-none">
                  <div className="relative">
                    <img
                      src={it.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
                      alt={name}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                    />
                    {it.kind === 'club' && it.is_verified ? (
                      <span className="absolute -bottom-1 -right-1">
                        <VerifiedBadge size="sm" />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
                  <FollowButton targetProfileId={it.id} size="sm" />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Nessun suggerimento al momento.
        </div>
      )}
    </div>
  );
}
