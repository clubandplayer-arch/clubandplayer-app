'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AccountType = 'athlete' | 'club';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

function normalizeAccountType(p?: Profile | null): AccountType {
  const raw =
    (p?.account_type ?? '').toString().toLowerCase();
  if (raw.includes('club')) return 'club';
  return 'athlete';
}

export default function ProfileMiniCard() {
  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [role, setRole] =
    useState<AccountType>('athlete');

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const res = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const data: Profile | null =
          (json && (json.data || json.profile)) || null;

        if (ignore || !data) return;

        setProfile(data);
        setRole(normalizeAccountType(data));
      } catch (err) {
        console.error(
          '[ProfileMiniCard] load error',
          err
        );
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const name =
    profile?.display_name ||
    profile?.full_name ||
    'Completa il tuo profilo';

  const href =
    role === 'club' ? '/club/profile' : '/profile';

  const avatar =
    profile?.avatar_url ||
    'https://placehold.co/80x80?text=CP';

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border bg-white px-3 py-2 hover:bg-gray-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar}
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
      />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">
          {role === 'club'
            ? 'Profilo Club'
            : 'Profilo Atleta'}
        </span>
        <span className="text-sm font-semibold leading-tight">
          {name}
        </span>
        <span className="text-[10px] text-blue-600">
          Vai al profilo →
        </span>
      </div>
    </Link>
  );
}
