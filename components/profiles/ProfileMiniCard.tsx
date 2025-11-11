'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AccountType = 'athlete' | 'club';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;

  // qualche campo extra possibile ma non obbligatorio
  bio?: string | null;
  sport?: string | null;
  club_league_category?: string | null;
  club_foundation_year?: number | null;
};

function normalizeAccountType(p?: Profile | null): AccountType {
  const raw = (p?.account_type ?? '')
    .toString()
    .toLowerCase();

  if (raw.includes('club')) return 'club';
  return 'athlete';
}

function isProfileComplete(p: Profile | null): boolean {
  if (!p) return false;

  const hasName =
    !!(p.display_name && p.display_name.trim()) ||
    !!(p.full_name && p.full_name.trim());
  const hasAvatar =
    !!(p.avatar_url && p.avatar_url.trim());

  // criteri semplici ma efficaci
  return hasName || hasAvatar;
}

export default function ProfileMiniCard() {
  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [role, setRole] =
    useState<AccountType>('athlete');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          // es. 401 → utente non loggato, lascio la card "vuota"
          console.warn(
            '[ProfileMiniCard] /api/profiles/me status',
            res.status
          );
          return;
        }

        const json = await res.json().catch(() => ({}));
        const data: Profile | null =
          (json && json.data) ||
          (json && json.profile) ||
          null;

        if (cancelled || !data) return;

        setProfile(data);
        setRole(normalizeAccountType(data));
      } catch (err) {
        if (!cancelled) {
          console.error(
            '[ProfileMiniCard] load error',
            err
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const complete = isProfileComplete(profile);

  const displayName =
    (profile?.display_name &&
      profile.display_name.trim()) ||
    (profile?.full_name && profile.full_name.trim()) ||
    '';

  const title = complete
    ? displayName || 'Il tuo profilo'
    : 'Completa il tuo profilo';

  const href =
    role === 'club' ? '/club/profile' : '/profile';

  const avatarSrc = complete && profile?.avatar_url
    ? profile.avatar_url
    : null;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
    >
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt={displayName || 'Avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>CP</span>
        )}
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-[11px] text-gray-500">
          {role === 'club'
            ? 'Profilo Club'
            : 'Profilo Atleta'}
        </span>
        <span className="text-sm font-semibold">
          {title}
        </span>
        <span className="text-[10px] text-blue-600">
          Vai al profilo →
        </span>
      </div>
    </Link>
  );
}
