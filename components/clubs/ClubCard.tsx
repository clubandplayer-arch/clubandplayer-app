'use client';

import NextImage from 'next/image';

export type Club = {
  id: string;
  name: string;
  handle?: string | null;
  city?: string | null;
  region?: string | null;
  province?: string | null;
  sport?: string | null;
  league?: string | null;
  followers?: number | null;
  avatar_url?: string | null;
};

type Props = {
  club: Club;
};

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" rx="16" fill="%23e5e7eb"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="18" fill="%239ca3af">CLUB</text></svg>';

export default function ClubCard({ club }: Props) {
  const src = club.avatar_url || FALLBACK_AVATAR;

  return (
    <div className="rounded-2xl border p-4 shadow-sm hover:shadow transition bg-white/70 dark:bg-zinc-900/60">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
          <NextImage src={src} alt={club.name || 'Club'} fill className="object-cover" sizes="64px" unoptimized />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{club.name || '—'}</div>
          <div className="truncate text-xs text-zinc-500">
            {club.handle ? `@${club.handle}` : null}
            {club.city ? (club.handle ? ' · ' : '') + club.city : null}
            {club.sport ? ' · ' + club.sport : null}
            {club.league ? ' · ' + club.league : null}
          </div>
        </div>
      </div>
    </div>
  );
}
