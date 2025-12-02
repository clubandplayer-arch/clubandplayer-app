'use client';

import Image from 'next/image';
import FollowButton from '@/components/clubs/FollowButton';
import { MessageButton } from '@/components/messaging/MessageButton';

type AthleteProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  headline: string | null;
  sport: string | null;
  role: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  avatar_url: string | null;
};

function resolveName(profile: AthleteProfile) {
  return profile.display_name || profile.full_name || 'Player';
}

export default function AthleteProfileHeader({
  profile,
  isMe,
}: {
  profile: AthleteProfile;
  isMe: boolean;
}) {
  const name = resolveName(profile);

  const subtitle = (() => {
    const parts = [profile.role, profile.sport].filter(Boolean);
    return parts.join(' · ') || '—';
  })();

  const headline = (profile.headline || '').trim();

  const location = [profile.city, profile.province, profile.region, profile.country]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200 md:h-32 md:w-32">
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
              <p className="text-sm font-medium text-neutral-700 md:text-base">{subtitle}</p>
            </div>
            {headline ? <p className="text-sm text-neutral-600">{headline}</p> : null}
            {location ? <p className="text-xs text-neutral-500">{location}</p> : <p className="text-xs text-neutral-400">Località —</p>}
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span>ID profilo: <code>{profile.id}</code></span>
              <MessageButton
                targetProfileId={profile.id}
                label="Messaggia →"
                className="border-neutral-200 bg-white text-blue-700 hover:bg-neutral-50"
              />
            </div>
          </div>

          {!isMe && (
            <div className="flex items-start justify-end">
              <FollowButton
                targetProfileId={profile.id}
                labelFollow="Segui"
                labelFollowing="Seguo"
                size="md"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
