'use client';

import Image from 'next/image';

import FollowButton from '@/components/clubs/FollowButton';
import { useFollowState } from '@/hooks/useFollowState';

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

export default function ClubProfileHeader({ profile }: { profile: ClubProfile }) {
  const name = profile.display_name || profile.full_name || 'Club';
  const location = formatLocation(profile);
  const { following } = useFollowState();
  const initialIsFollowing = following.has(profile.id);

  return (
    <header className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-neutral-200 md:h-32 md:w-32">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={name}
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold leading-tight text-neutral-900 md:text-3xl">{name}</h1>
              <p className="text-sm font-medium text-neutral-700 md:text-base">
                {[profile.club_league_category, profile.sport].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {location ? <p className="text-xs text-neutral-500">{location}</p> : <p className="text-xs text-neutral-400">Località —</p>}
          </div>

          <div className="flex items-start justify-end">
            <FollowButton
              targetId={profile.id}
              targetType="club"
              targetName={name}
              initialIsFollowing={initialIsFollowing}
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
