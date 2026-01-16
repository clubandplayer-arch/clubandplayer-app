'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/common/FollowButton';
import { CountryFlag } from '@/components/ui/CountryFlag';
import ClubAvatarVerified from '@/components/ui/ClubAvatarVerified';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';

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

type TabKey = 'club' | 'player';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'club', label: 'Club' },
  { key: 'player', label: 'Player' },
];

function targetHref(item: Suggestion) {
  return item.kind === 'club' ? `/clubs/${item.id}` : `/players/${item.id}`;
}

function displayName(item: Suggestion) {
  return item.kind === 'club'
    ? buildClubDisplayName(item.full_name ?? null, item.display_name ?? null, 'Club')
    : buildPlayerDisplayName(item.full_name ?? null, item.display_name ?? null, 'Profilo');
}

function extractIso2(text?: string | null) {
  const raw = (text ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/([A-Za-z]{2})\s*$/);
  return match ? match[1].toUpperCase() : null;
}

function getCountryLabel(text?: string | null, iso2?: string | null) {
  const raw = (text ?? '').trim();
  if (!raw) return iso2 ?? '';
  const match = raw.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  if (match) {
    return match[2]?.trim() || match[1].toUpperCase();
  }
  return raw;
}

function clubDetailLine(suggestion: Suggestion) {
  const locationText = (suggestion.location || [suggestion.city, suggestion.country].filter(Boolean).join(', ')).trim();
  const iso2 = extractIso2(suggestion.country || locationText);
  const region = iso2 ? locationText.replace(new RegExp(`[\\s,]*${iso2}$`, 'i'), '').trim() : locationText;

  return (
    <div className="flex min-w-0 items-center gap-1 text-xs text-neutral-500">
      {region ? <span className="truncate">{region}</span> : null}
      {iso2 ? (
        <>
          {region ? <span>·</span> : null}
          <CountryFlag iso2={iso2} />
          <span>{iso2}</span>
        </>
      ) : null}
    </div>
  );
}

function playerDetailLine(suggestion: Suggestion) {
  const iso2 = extractIso2(suggestion.country);
  const label = getCountryLabel(suggestion.country, iso2);
  if (!iso2 && !label) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-neutral-500">
      {iso2 ? <CountryFlag iso2={iso2} /> : null}
      <span>{label || '—'}</span>
    </div>
  );
}

function detailLine(suggestion: Suggestion, viewerRole: ProfileRole, tab: TabKey): ReactNode {
  if (tab === 'club') return clubDetailLine(suggestion);
  if (tab === 'player') return playerDetailLine(suggestion);
  const location = suggestion.location || [suggestion.city, suggestion.country].filter(Boolean).join(', ');
  const sportRole = [suggestion.category || suggestion.sport, suggestion.role].filter(Boolean).join(' · ');
  if (viewerRole === 'club') {
    return sportRole || location;
  }
  return location || sportRole;
}

export default function DiscoverPage() {
  const { role: contextRole } = useCurrentProfileContext();
  const [role, setRole] = useState<ProfileRole>('guest');
  const [activeTab, setActiveTab] = useState<TabKey>('club');
  const [items, setItems] = useState<Record<TabKey, Suggestion[]>>({ club: [], player: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchSuggestions = async (kind: TabKey) => {
      const params = new URLSearchParams({ kind, limit: '50' });
      const res = await fetch(`/api/follows/suggestions?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        const message = data?.message || `Errore nel caricamento dei suggerimenti (${kind}).`;
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

      return { suggestions, role: (data?.role as ProfileRole) || contextRole || 'guest' };
    };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clubs, players] = await Promise.all([fetchSuggestions('club'), fetchSuggestions('player')]);
        if (cancelled) return;
        setItems({ club: clubs.suggestions, player: players.suggestions });
        setRole(clubs.role || players.role || contextRole || 'guest');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Impossibile caricare i suggerimenti.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contextRole]);

  const activeItems = useMemo(() => items[activeTab] || [], [items, activeTab]);

  return (
    <div className="page-shell space-y-6">
      <header className="space-y-2">
        <h1 className="heading-h1">Scopri profili</h1>
        <p className="text-sm text-neutral-600">
          Suggerimenti ordinati per zona di interesse (città, provincia, regione).
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-600">Caricamento suggerimenti…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : activeItems.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-600">
          Nessun suggerimento disponibile.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeItems.map((item) => {
            const name = displayName(item);
            const href = targetHref(item);
            return (
              <li key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link href={href} className="flex min-w-0 items-center gap-3">
                    <ClubAvatarVerified
                      src={
                        item.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
                      }
                      alt={name}
                      sizeClass="h-11 w-11"
                      isVerified={item.kind === 'club' && item.is_verified}
                      className="ring-1 ring-neutral-200 rounded-full"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-neutral-900">{name}</span>
                      </div>
                      {detailLine(item, role, activeTab) || <span className="text-xs text-neutral-500">—</span>}
                    </div>
                  </Link>
                  <div
                    className="shrink-0"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <FollowButton targetProfileId={item.id} size="sm" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
