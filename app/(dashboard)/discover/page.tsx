'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FollowButton from '@/components/common/FollowButton';
import CertifiedCMarkFollowing from '@/components/badges/CertifiedCMarkFollowing';
import { Lightbox } from '@/components/media/Lightbox';
import { CountryFlag } from '@/components/ui/CountryFlag';
import FanVoteBadge from '@/components/fan-votes/FanVoteBadge';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import { useI18n } from '@/components/i18n/I18nProvider';
import CanonicalGeographySelector from '@/components/geo/CanonicalGeographySelector';
import { localizeAccountType, localizeSport, localizeSportRole } from '@/lib/i18n/controlledVocabulary';

type Suggestion = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  kind?: 'institution' | 'club' | 'player' | 'staff' | null;
  category?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  fan_vote_count?: number | null;
};

type TabKey = 'institution' | 'club' | 'player' | 'staff';
type GeoScope = 'country' | 'region' | 'province' | 'city';
type SportScope = 'mine' | 'all';

function targetHref(item: Suggestion) {
  return item.kind === 'club' ? `/clubs/${item.id}` : item.kind === 'institution' ? `/institutions/${item.id}` : `/players/${item.id}`;
}

function displayName(item: Suggestion) {
  return item.kind === 'institution'
    ? buildClubDisplayName(item.full_name ?? null, item.display_name ?? null, 'Ente')
    : item.kind === 'club'
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

function normalizeRoleLabel(value?: string | null) {
  const text = (value ?? '').trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized === 'athlete' || normalized === 'player' || normalized === 'club') return null;
  return text;
}

function playerCountryLine(suggestion: Suggestion) {
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

function secondaryMetaLine(suggestion: Suggestion, t: ReturnType<typeof useI18n>['t']): ReactNode {
  const meta = [suggestion.city, localizeSport(suggestion.category || suggestion.sport, t), localizeSportRole(normalizeRoleLabel(suggestion.role), t)]
    .filter(Boolean)
    .join(' · ');
  if (!meta) return <span className="text-xs text-neutral-500">—</span>;
  return <p className="text-xs text-neutral-600 truncate">{meta}</p>;
}

export default function DiscoverPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'institution', label: t('profile.institution') }, { key: 'club', label: 'Club' },
    { key: 'player', label: t('profile.player') }, { key: 'staff', label: t('navigation.staff') },
  ];
  const { role: contextRole } = useCurrentProfileContext();
  const [activeTab, setActiveTab] = useState<TabKey>('club');
  const [items, setItems] = useState<Record<TabKey, Suggestion[]>>({ institution: [], club: [], player: [], staff: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<{ url: string; alt: string } | null>(null);
  const [geoScope, setGeoScope] = useState<GeoScope>('province');
  const [sportScope, setSportScope] = useState<SportScope>('mine');
  const [countryId, setCountryId] = useState<string | null>(() => searchParams.get('countryId'));
  const [geoAreaId, setGeoAreaId] = useState<string | null>(() => searchParams.get('geoAreaId'));
  const countryChangeResetsArea = useRef(false);

  useEffect(() => {
    setCountryId(searchParams.get('countryId'));
    setGeoAreaId(searchParams.get('geoAreaId'));
  }, [searchParams]);

  const updateScoutingUrl = (nextCountryId: string | null, nextGeoAreaId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCountryId) params.set('countryId', nextCountryId); else params.delete('countryId');
    if (nextGeoAreaId) params.set('geoAreaId', nextGeoAreaId); else params.delete('geoAreaId');
    router.replace(params.size ? `/discover?${params.toString()}` : '/discover', { scroll: false });
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchSuggestions = async (kind: TabKey) => {
      const params = new URLSearchParams({
        kind,
        limit: '200',
        geoScope,
        sportScope,
        includeFollowed: 'true',
      });
      if (countryId) params.set('countryId', countryId);
      if (geoAreaId) params.set('geoAreaId', geoAreaId);
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
          kind: item.kind ?? (item.account_type === 'institution' ? 'institution' : item.account_type === 'club' ? 'club' : item.account_type === 'staff' ? 'staff' : item.account_type ? 'player' : null),
        category: item.category ?? null,
        location: item.location ?? null,
        city: item.city ?? null,
          country: item.country ?? null,
          sport: item.sport ?? null,
          role: item.role ?? null,
          avatar_url: item.avatar_url ?? null,
          is_verified: item.is_verified ?? null,
          fan_vote_count: Number(item.fan_vote_count ?? item.fanVoteCount ?? 0),
        })) as Suggestion[];

      return { suggestions, role: (data?.role as ProfileRole) || contextRole || 'guest' };
    };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [institutions, clubs, players, staff] = await Promise.all([
          fetchSuggestions('institution'),
          fetchSuggestions('club'),
          fetchSuggestions('player'),
          fetchSuggestions('staff'),
        ]);
        if (cancelled) return;
        setItems({ institution: institutions.suggestions, club: clubs.suggestions, player: players.suggestions, staff: staff.suggestions });
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
  }, [contextRole, countryId, geoAreaId, geoScope, sportScope]);

  const activeItems = useMemo(() => items[activeTab] || [], [items, activeTab]);

  return (
    <div className="page-shell space-y-6">
      <header className="space-y-2">
        <h1 className="heading-h1">{t('discover.title')}</h1>
        <p className="text-sm text-neutral-600">
          {t('discover.subtitle')}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
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
      <section className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-sm font-semibold text-neutral-900">{t('discover.scoutingArea')}</h2>
          <p className="text-xs text-neutral-600">{t('discover.scoutingHelp')}</p>
        </div>
        <CanonicalGeographySelector
          idPrefix="discover-scouting-geography"
          labels={{ selectCountry: t('map.allCountries') }}
          countryId={countryId}
          geoAreaId={geoAreaId}
          onCountryChange={(nextCountryId) => {
            countryChangeResetsArea.current = true;
            setCountryId(nextCountryId);
            setGeoAreaId(null);
            updateScoutingUrl(nextCountryId, null);
          }}
          onGeoAreaChange={(nextGeoAreaId) => {
            if (countryChangeResetsArea.current && !nextGeoAreaId) {
              countryChangeResetsArea.current = false;
              return;
            }
            countryChangeResetsArea.current = false;
            setGeoAreaId(nextGeoAreaId);
            updateScoutingUrl(countryId, nextGeoAreaId);
          }}
        />
        <div className="my-4 border-t border-neutral-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            {t('discover.personalizedScope')}
            <select
              value={geoScope}
              onChange={(event) => setGeoScope(event.target.value as GeoScope)}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none ring-[var(--brand)] focus:ring-2"
            >
              <option value="country">{t('discover.countryInterest')}</option>
              <option value="region">{t('discover.regionInterest')}</option>
              <option value="province">{t('discover.interestProvince')}</option>
              <option value="city">{t('discover.cityInterest')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            {t('discover.sport')}
            <select
              value={sportScope}
              onChange={(event) => setSportScope(event.target.value as SportScope)}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none ring-[var(--brand)] focus:ring-2"
            >
              <option value="mine">{t('discover.mySport')}</option>
              <option value="all">{t('discover.allSports')}</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-600">{t('discover.loadingSuggestions')}</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : activeItems.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-600">
          {t('discover.noSuggestions')}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeItems.map((item) => {
            const name = displayName(item);
            const href = targetHref(item);
            const isCertified = item.kind === 'club' && Boolean((item as any).is_verified ?? (item as any).isVerified ?? false);
            const logoSizePx = 44;
            const feedLogoSizePx = 140;
            const feedCSizePx = 40;
            const feedOffsetPx = 8;
            const cSizePx = Math.round(logoSizePx * (feedCSizePx / feedLogoSizePx) * 1.15);
            const offsetPx = Math.round(logoSizePx * (feedOffsetPx / feedLogoSizePx) * 1.6);
            return (
              <li key={item.id} className="flex h-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setAvatarPreview({
                          url: item.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
                          alt: name,
                        })
                      }
                      aria-label={`Apri avatar ${name}`}
                      className="relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/40 text-sm font-semibold uppercase text-[var(--brand)] aspect-square"
                    >
                      <img
                        src={item.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    {isCertified ? (
                      <span className="pointer-events-none absolute" style={{ width: cSizePx, height: cSizePx, right: -offsetPx, top: -offsetPx }}>
                        <CertifiedCMarkFollowing className="h-full w-full [&_svg]:h-full [&_svg]:w-full" />
                      </span>
                    ) : null}
                  </div>
                  <Link href={href} className="flex min-w-0 flex-1 gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="truncate text-sm font-semibold text-neutral-900">{name}</span>
                        {activeTab === 'player' ? <FanVoteBadge count={item.fan_vote_count} compact /> : null}
                      </div>
                      {activeTab === 'institution' ? (
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                          {localizeAccountType('institution', t)}
                        </span>
                      ) : activeTab === 'staff' ? (
                        <span className="inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-700">
                          {localizeAccountType('staff', t)}
                        </span>
                      ) : null}
                      {(activeTab === 'player' || activeTab === 'staff') ? playerCountryLine(item) : null}
                      {secondaryMetaLine(item, t)}
                      <p className="mt-1 text-[11px] font-medium text-[var(--brand)]">
                        {countryId ? t('discover.reasonScoutingArea') : t('discover.reasonPersonalized')}
                      </p>
                    </div>
                  </Link>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <div className="min-h-[24px]" aria-hidden="true" />
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
                    <FollowButton targetProfileId={item.id} size="sm" className="min-w-[96px] shrink-0" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {avatarPreview ? (
        <Lightbox
          items={[{ url: avatarPreview.url, type: 'image', alt: avatarPreview.alt }]}
          index={0}
          onClose={() => setAvatarPreview(null)}
        />
      ) : null}
    </div>
  );
}
