'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ProfileMini = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  type?: string | null;
  city?: string | null;
  region?: string | null;
};

type Props = {
  profile?: ProfileMini;
};

export default function ProfileMiniCard({ profile }: Props) {
  const [me, setMe] = useState<ProfileMini | null>(null);

  useEffect(() => {
    if (profile) return;
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (j?.data?.id) {
          setMe(j.data as ProfileMini);
        }
      } catch {
        if (!cancelled) setMe(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const p = profile || me;
  if (!p) return null;

  const rawType =
    (p.account_type ?? p.type ?? '').toString().toLowerCase();
  const isClub = rawType.includes('club');

  const href = isClub
    ? `/c/${p.id}`
    : `/athletes/${p.id}`; // se nel repo è /u/[id], sostituisci qui

  const initial =
    p.display_name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border bg-white p-2 text-sm hover:bg-gray-50"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold uppercase">
        {initial}
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {p.display_name || 'Profilo'}
        </span>
        {(p.city || p.region) && (
          <span className="text-[10px] text-gray-500">
            {p.city}
            {p.city && p.region && ' · '}
            {p.region}
          </span>
        )}
      </div>
    </Link>
  );
}
