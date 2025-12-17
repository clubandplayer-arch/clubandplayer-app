'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';

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
  className?: string;
};

function MarkerIcon({ type }: { type?: string | null }) {
  const lower = (type || '').toLowerCase();
  const isClub = lower.includes('club');
  return (
    <span
      className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold ${
        isClub ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {isClub ? 'CLUB' : 'PLAYER'}
    </span>
  );
}

function Avatar({ profile }: { profile: SearchMapProfile }) {
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
  return type === 'club' ? `/clubs/${profileId}` : `/players/${profileId}`;
}

export default function SearchResultsList({
  results,
  loading,
  hasArea,
  error,
  selectedId,
  onSelect,
  className,
}: SearchResultsListProps) {
  const hasResults = results.length > 0;

  const content = useMemo(() => {
    if (error) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      );
    }

    if (!hasArea && !loading) {
      return (
        <div className="text-sm text-gray-600">
          Disegna un’area sulla mappa o sposta la mappa e chiudi il poligono per iniziare la ricerca.
        </div>
      );
    }

    if (hasArea && !hasResults && !loading) {
      return <div className="text-sm text-gray-600">Nessun profilo nell’area selezionata.</div>;
    }

    return null;
  }, [error, hasArea, hasResults, loading]);

  return (
    <section className={`rounded-xl border bg-white/80 p-3 shadow-sm ${className || ''}`}>
      <div className="flex items-center justify-between">
        <h2 className="heading-h2 text-lg">Risultati</h2>
        {loading && <span className="text-xs text-gray-500">Caricamento…</span>}
      </div>

      {content}

      {hasResults && (
        <div className="mt-3 space-y-2 overflow-y-auto pr-1 max-h-[520px] lg:max-h-[calc(100vh-320px)]">
          {results.map((profile) => {
            const profileId = resolveProfileId(profile);
            const href = resolvePublicHref(profile);
            const isActive = selectedId === profileId;
            const location = locationLabel(profile);
            const details = detailsLabel(profile);
            const canMessage = !!profileId;
            const displayName =
              profile.friendly_name || buildProfileDisplayName(profile.full_name, profile.display_name, 'Profilo');

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
                  <Link
                    href={href}
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar profile={profile} />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold leading-tight text-blue-800 underline-offset-2 hover:underline"
                      >
                        {displayName}
                      </Link>
                      <MarkerIcon type={profile.type || profile.account_type} />
                    </div>
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
