'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';

import FollowButton from '@/components/common/FollowButton';
import { buildDirectConversationUrl } from '@/lib/services/messaging';
import { SearchMapProfile } from '@/lib/services/search';
import { buildProfileDisplayName } from '@/lib/displayName';
import { getCountryName } from '@/lib/geo/countries';

export type SearchResultsListProps = {
  results: SearchMapProfile[];
  loading?: boolean;
  hasArea?: boolean;
  error?: string | null;
  selectedId?: string | null;
  onSelect?: (result: SearchMapProfile) => void;
  query?: string;
  profileCount?: number;
  opportunityCount?: number;
  activeTab?: 'profiles' | 'opportunities';
  onTabChange?: (tab: 'profiles' | 'opportunities') => void;
  className?: string;
};

function MarkerIcon({ type }: { type?: string | null }) {
  const lower = (type || '').toLowerCase();
  const isClub = lower.includes('club');
  const isOpp = lower === 'opportunity';
  return (
    <span
      className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold ${
        isOpp
          ? 'bg-amber-50 text-amber-700'
          : isClub
            ? 'bg-blue-50 text-blue-700'
            : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {isOpp ? 'OPP' : isClub ? 'CLUB' : 'PLAYER'}
    </span>
  );
}

function Avatar({ profile }: { profile: SearchMapProfile }) {
  const lower = (profile.type || profile.account_type || '').toLowerCase();
  const isOpp = lower === 'opportunity';
  if (isOpp) {
    const display = profile.title || profile.friendly_name || 'Annuncio';
    const initial = display.trim()[0]?.toUpperCase() || 'P';
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
        <span>{initial}</span>
      </div>
    );
  }

  const display =
    profile.friendly_name || buildProfileDisplayName(profile.full_name, profile.display_name, 'Profilo');
  const alt = display || 'Avatar profilo';
  const initial = display.trim()[0]?.toUpperCase() || 'P';

  if (profile.avatar_url) {
    return (
      <Image
        src={profile.avatar_url}
        alt={`Avatar di ${alt}`}
        width={48}
        height={48}
        className="h-12 w-12 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
      <span>{initial}</span>
    </div>
  );
}

function locationLabel(profile: SearchMapProfile) {
  const countryLabel = getCountryName(profile.country || null) ?? (profile.country || '');
  return [profile.city, profile.province, profile.region, countryLabel].filter(Boolean).join(' · ');
}

function detailsLabel(profile: SearchMapProfile) {
  return [profile.role, profile.sport].filter(Boolean).join(' · ');
}

function resolveProfileId(profile: SearchMapProfile) {
  return (profile.profile_id || profile.id || '').toString();
}

function resolvePublicHref(profile: SearchMapProfile) {
  const profileId = resolveProfileId(profile);
  if (!profileId) return '#';
  const type = (profile.type || profile.account_type || '').trim().toLowerCase();
  if (type === 'opportunity') return `/opportunities/${profileId}`;
  return type === 'club' ? `/clubs/${profileId}` : `/players/${profileId}`;
}

function highlightText(text: string, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  if (!lowerText.includes(lowerQuery)) return text;

  const parts: ReactNode[] = [];
  let startIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, startIndex);
  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push(text.slice(startIndex, matchIndex));
    }
    const matchText = text.slice(matchIndex, matchIndex + cleanQuery.length);
    parts.push(
      <mark
        key={`${matchIndex}-${matchText}`}
        className="rounded bg-amber-100 px-0.5 font-semibold text-amber-900"
      >
        {matchText}
      </mark>,
    );
    startIndex = matchIndex + cleanQuery.length;
    matchIndex = lowerText.indexOf(lowerQuery, startIndex);
  }
  if (startIndex < text.length) {
    parts.push(text.slice(startIndex));
  }
  return parts;
}

function buildSnippet(text: string, query: string, maxLength = 120) {
  const cleanQuery = query.trim();
  if (!cleanQuery || !text) return null;
  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) return null;

  const padding = Math.max(0, Math.floor((maxLength - cleanQuery.length) / 2));
  const start = Math.max(0, matchIndex - padding);
  const end = Math.min(text.length, matchIndex + cleanQuery.length + padding);
  const snippetText = text.slice(start, end).trim();
  return {
    text: snippetText,
    prefix: start > 0 ? '…' : '',
    suffix: end < text.length ? '…' : '',
  };
}

export default function SearchResultsList({
  results,
  loading,
  hasArea,
  error,
  selectedId,
  onSelect,
  query,
  profileCount = 0,
  opportunityCount = 0,
  activeTab = 'profiles',
  onTabChange,
  className,
}: SearchResultsListProps) {
  const hasResults = results.length > 0;
  const cleanQuery = query?.trim() ?? '';

  const content = useMemo(() => {
    if (error) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      );
    }

    if (!hasArea && !loading) {
      return (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700">
            Disegna un’area sulla mappa e premi “Chiudi area e cerca”.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            La ricerca mostra solo i risultati all’interno dell’area selezionata.
          </p>
        </div>
      );
    }

    if (hasArea && !hasResults && !loading) {
      return <div className="text-sm text-gray-600">Nessun risultato nell’area selezionata.</div>;
    }

    return null;
  }, [error, hasArea, hasResults, loading]);

  return (
    <section className={`rounded-xl border bg-white/80 p-3 shadow-sm ${className || ''}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="heading-h2 text-lg">Risultati</h2>
          {loading && <span className="text-xs text-gray-500">Caricamento…</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTabChange?.('profiles')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              activeTab === 'profiles' ? 'border-blue-300 bg-blue-50 text-blue-800' : 'hover:bg-gray-50'
            }`}
          >
            Profili ({profileCount})
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.('opportunities')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              activeTab === 'opportunities'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'hover:bg-gray-50'
            }`}
          >
            Opportunità ({opportunityCount})
          </button>
        </div>
      </div>

      {content}

      {loading && !hasResults && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse rounded-lg border border-gray-200 bg-white px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasResults && (
        <div className="mt-3 space-y-2 overflow-y-auto pr-1 max-h-[520px] lg:max-h-[calc(100vh-320px)]">
          {results.map((profile) => {
            const profileId = resolveProfileId(profile);
            const href = resolvePublicHref(profile);
            const isActive = selectedId === profileId;
            const location = locationLabel(profile);
            const details = detailsLabel(profile);
            const canMessage = !!profileId;
            const lowerType = (profile.type || profile.account_type || '').toLowerCase();
            const isOpportunity = lowerType === 'opportunity';
            const displayName = isOpportunity
              ? profile.title || profile.friendly_name || 'Annuncio'
              : profile.friendly_name || buildProfileDisplayName(profile.full_name, profile.display_name, 'Profilo');
            const clubLabel = isOpportunity ? profile.club_name || 'Club' : null;
            const locationText = isOpportunity
              ? profile.location_label || location || 'Località non disponibile'
              : location || 'Località non disponibile';
            const description = isOpportunity ? (profile.description as string | null) || profile.bio || '' : '';
            const snippet = isOpportunity && cleanQuery ? buildSnippet(description, cleanQuery, 120) : null;
            const titleNode =
              isOpportunity && cleanQuery ? highlightText(displayName, cleanQuery) : displayName;
            const locationNode =
              isOpportunity && cleanQuery ? highlightText(locationText, cleanQuery) : locationText;
            return (
              <div
                key={profile.id}
                className={`cursor-pointer rounded-lg border px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/60 ${
                  isActive ? 'border-blue-300 bg-blue-50/70 shadow-sm' : 'border-gray-200 bg-white'
                }`}
                onClick={() => onSelect?.(profile)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(profile);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <Link href={href} className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Avatar profile={profile} />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold leading-tight text-blue-800 underline-offset-2 hover:underline"
                      >
                        {titleNode}
                      </Link>
                      <MarkerIcon type={profile.type || profile.account_type} />
                    </div>
                    {isOpportunity ? (
                      <>
                        <div className="text-xs text-gray-600">{locationNode}</div>
                        {snippet && (
                          <div className="text-xs text-gray-500">
                            {snippet.prefix}
                            {highlightText(snippet.text, cleanQuery)}
                            {snippet.suffix}
                          </div>
                        )}
                        {!snippet && clubLabel && <div className="text-xs text-gray-500">{clubLabel}</div>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
                          >
                            Dettagli annuncio
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-gray-600">{location || 'Località non disponibile'}</div>
                        <div className="text-xs text-gray-500">{details || 'Ruolo/sport non specificato'}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {profileId && (
                            <FollowButton targetProfileId={profileId} size="sm" className="min-w-[90px]" />
                          )}
                          {canMessage && (
                            <Link
                              href={buildDirectConversationUrl(profileId)}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                            >
                              Messaggia
                            </Link>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
