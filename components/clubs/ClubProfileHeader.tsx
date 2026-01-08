'use client';

import Image from 'next/image';

import FollowButton from '@/components/clubs/FollowButton';
import { MessageButton } from '@/components/messaging/MessageButton';
import { normalizeSport } from '@/lib/opps/constants';

type ClubProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  club_league_category: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
};

function formatLocation(profile: ClubProfile) {
  return [profile.city, profile.province, profile.region, profile.country].filter(Boolean).join(' · ');
}

function initialsFromName(name: string) {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ClubProfileHeader({ profile }: { profile: ClubProfile }) {
  const name = profile.display_name || profile.full_name || 'Club';
  const location = formatLocation(profile);
  const sportLabel = normalizeSport(profile.sport ?? null) ?? profile.sport ?? null;

  return (
    <header className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-transparent ring-1 ring-white/60 shadow-sm md:h-32 md:w-32">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={name}
              fill
              sizes="128px"
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neutral-50 to-neutral-200 text-xl font-semibold text-neutral-600">
              {initialsFromName(name)}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold leading-tight text-neutral-900 md:text-3xl">{name}</h1>
              <p className="text-sm font-medium text-neutral-700 md:text-base">
                {[profile.club_league_category, sportLabel].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {location ? <p className="text-xs text-neutral-500">{location}</p> : <p className="text-xs text-neutral-400">Località —</p>}
          </div>

          <div className="flex items-start justify-end gap-2">
            <MessageButton
              targetProfileId={profile.id}
              label="Messaggia"
              className="border-neutral-200 bg-white hover:bg-neutral-50"
            />
            <FollowButton
              targetProfileId={profile.id}
              labelFollow="Segui"
              labelFollowing="Seguo"
              size="md"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
