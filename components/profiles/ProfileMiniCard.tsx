'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AccountType = 'athlete' | 'club';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;

  // dettagli atleta
  city?: string | null;
  birth_year?: number | null;
  birth_place?: string | null;
  birth_country?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null; // lato dominante
  bio?: string | null;

  // club
  club_name?: string | null;
};

function normalizeAccountType(p?: Profile | null): AccountType {
  const raw =
    (p?.account_type ?? '').toString().toLowerCase();
  if (raw.includes('club')) return 'club';
  return 'athlete';
}

function getDisplayName(p: Profile | null): string {
  if (!p) return '';
  const full =
    (p.full_name || '').trim();
  const disp =
    (p.display_name || '').trim();

  // preferiamo SEMPRE il nome reale
  if (full) return full;
  if (disp) return disp;
  return '';
}

function getAge(birthYear?: number | null): number | null {
  if (!birthYear) return null;
  const year = Number(birthYear);
  if (!Number.isFinite(year)) return null;
  const now = new Date().getFullYear();
  if (year < now - 80 || year > now) return null;
  return now - year;
}

function mapFootLabel(foot?: string | null): string | null {
  if (!foot) return null;
  const v = foot.toLowerCase();
  if (v.startsWith('r')) return 'Destro';
  if (v.startsWith('l')) return 'Sinistro';
  if (v === 'both' || v.includes('ambi')) return 'Ambidestro';
  return null;
}

function isProfileComplete(p: Profile | null): boolean {
  if (!p) return false;
  const name = getDisplayName(p);
  const hasAvatar =
    !!(p.avatar_url && p.avatar_url.trim());
  // criteri minimi: nome o avatar
  return !!name || hasAvatar;
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
  const name = getDisplayName(profile);
  const href =
    role === 'club' ? '/club/profile' : '/profile';

  const avatarSrc =
    profile?.avatar_url &&
    profile.avatar_url.trim()
      ? profile.avatar_url
      : null;

  // 1) Nessun profilo / incompleto → card invito
  if (!complete) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
          <span>CP</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] text-gray-500">
            {role === 'club'
              ? 'Profilo Club'
              : 'Profilo Atleta'}
          </span>
          <span className="text-sm font-semibold">
            Completa il tuo profilo
          </span>
          <span className="text-[10px] text-blue-600">
            Vai al profilo →
          </span>
        </div>
      </Link>
    );
  }

  // 2) Club → card compatta (nome + avatar)
  if (role === 'club') {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-xs font-semibold text-gray-500">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={name || 'Avatar'}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>CP</span>
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] text-gray-500">
            Profilo Club
          </span>
          <span className="text-sm font-semibold">
            {name || 'Il tuo club'}
          </span>
          <span className="text-[10px] text-blue-600">
            Vai al profilo →
          </span>
        </div>
      </Link>
    );
  }

  // 3) Atleta con profilo completo → card dettagliata (come screenshot)
  const age = getAge(profile?.birth_year ?? null);
  const latoDominante = mapFootLabel(profile?.foot);
  const city = (profile?.city || '').trim();
  const birthPlace =
    (profile?.birth_place || '').trim();
  const nationality =
    (profile?.birth_country || '').trim();
  const height =
    profile?.height_cm && profile.height_cm > 0
      ? `${profile.height_cm} cm`
      : null;
  const weight =
    profile?.weight_kg && profile.weight_kg > 0
      ? `${profile.weight_kg} kg`
      : null;
  const bio =
    (profile?.bio || '').trim() || null;

  return (
    <div className="w-full rounded-2xl border bg-white px-4 py-3">
      <div className="flex gap-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-300">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="h-2 w-12 rounded-full bg-gray-200" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-start gap-0.5 text-xs leading-snug">
          <div className="text-[10px] text-gray-500">
            Il tuo profilo
          </div>
          <div className="text-sm font-semibold">
            {name}
          </div>
          {city && (
            <div className="text-[11px] text-gray-700">
              Luogo di residenza:{' '}
              <span className="font-medium">
                {city}
              </span>
            </div>
          )}
          {birthPlace && (
            <div className="text-[11px] text-gray-700">
              Luogo di nascita:{' '}
              <span className="font-medium">
                {birthPlace}
              </span>
            </div>
          )}
          {nationality && (
            <div className="text-[11px] text-gray-700">
              Nazionalità:{' '}
              <span className="font-medium">
                {nationality}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-y-1 gap-x-6 text-[11px] text-gray-800 md:grid-cols-2">
        {age !== null && (
          <div>
            <span className="font-semibold">
              Età:
            </span>{' '}
            {age}
          </div>
        )}

        {latoDominante && (
          <div>
            <span className="font-semibold">
              Lato dominante:
            </span>{' '}
            {latoDominante}
          </div>
        )}

        {height && (
          <div>
            <span className="font-semibold">
              Altezza:
            </span>{' '}
            {height}
          </div>
        )}

        {weight && (
          <div>
            <span className="font-semibold">
              Peso:
            </span>{' '}
            {weight}
          </div>
        )}
      </div>

      {bio && (
        <div className="mt-2 text-[11px] text-gray-800 line-clamp-2">
          {bio}
        </div>
      )}

      <div className="mt-3">
        <Link
          href="/profile"
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold text-gray-900 hover:bg-gray-50"
        >
          Modifica profilo
        </Link>
      </div>
    </div>
  );
}
