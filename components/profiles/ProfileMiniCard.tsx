'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type Profile = {
  account_type?: string | null;
  profile_type?: string | null;
  type?: string | null;

  display_name?: string | null;
  full_name?: string | null;
  country?: string | null;
  city?: string | null;

  sport?: string | null;
  role?: string | null;

  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;

  club_league_category?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;

  avatar_url?: string | null;
};

type Row = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ---------- helpers country ---------- */

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  'u.k.': 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  usa: 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'stati uniti': 'US',
  'czech republic': 'CZ',
  'repubblica ceca': 'CZ',
  'cote d’ivoire': 'CI',
  "côte d’ivoire": 'CI',
  russia: 'RU',
  'south korea': 'KR',
  'north korea': 'KP',
  'viet nam': 'VN',
};

function safeTrim(v?: string | null) {
  return (v ?? '').trim();
}

function getRegionCodes(): string[] {
  try {
    return (Intl as any).supportedValuesOf?.('region') ?? [];
  } catch {
    return [];
  }
}
const REGION_CODES = getRegionCodes();
const DN_IT = new Intl.DisplayNames(['it'], { type: 'region' });
const DN_EN = new Intl.DisplayNames(['en'], { type: 'region' });

function nameToIso2(v?: string | null): string | null {
  const raw = safeTrim(v);
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const key = raw.toLowerCase();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  for (const code of REGION_CODES) {
    const it = (DN_IT.of(code) || '').toLowerCase();
    const en = (DN_EN.of(code) || '').toLowerCase();
    if (key === it || key === en) return code as string;
  }
  return null;
}

function flagEmoji(iso2?: string | null): string {
  const code = nameToIso2(iso2);
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  const base = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  return (
    String.fromCodePoint(base + code.charCodeAt(0) - a) +
    String.fromCodePoint(base + code.charCodeAt(1) - a)
  );
}

function countryLabel(v?: string | null): string {
  const code = nameToIso2(v);
  if (!code) return '';
  try {
    const dn = new Intl.DisplayNames(['it'], { type: 'region' });
    return dn.of(code) || code;
  } catch {
    return code;
  }
}

function displayName(p?: Profile | null): string {
  return (
    safeTrim(p?.display_name) ||
    safeTrim(p?.full_name) ||
    'Profilo'
  );
}

function detectRole(p?: Profile | null): 'club' | 'athlete' | null {
  const raw =
    (p?.account_type ??
      p?.profile_type ??
      p?.type ??
      '') as string;
  const t = raw.toLowerCase();
  if (t.includes('club')) return 'club';
  if (t.includes('athlete') || t.includes('atlet')) return 'athlete';
  return null;
}

/* ------------------------------ component ------------------------------ */

export default function ProfileMiniCard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [location, setLocation] = useState<string>('');
  const [role, setRole] = useState<'club' | 'athlete' | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const raw = await r.json().catch(() => ({}));
        const data =
          (raw && typeof raw === 'object' && 'data' in raw
            ? (raw as any).data
            : raw) || null;

        if (cancelled) return;

        setProfile(data);
        const detected = detectRole(data);
        setRole(detected);

        // location: city se presente, altrimenti prova da interesse geo
        if (data?.city) {
          setLocation(data.city);
        } else if (
          data?.interest_municipality_id ||
          data?.interest_province_id ||
          data?.interest_region_id
        ) {
          const [mun, prov, reg] = await Promise.all([
            data.interest_municipality_id
              ? supabase
                  .from('municipalities')
                  .select('id,name')
                  .eq('id', data.interest_municipality_id)
                  .maybeSingle()
              : Promise.resolve<{ data: Row | null }>({
                  data: null,
                }),
            data.interest_province_id
              ? supabase
                  .from('provinces')
                  .select('id,name')
                  .eq('id', data.interest_province_id)
                  .maybeSingle()
              : Promise.resolve<{ data: Row | null }>({
                  data: null,
                }),
            data.interest_region_id
              ? supabase
                  .from('regions')
                  .select('id,name')
                  .eq('id', data.interest_region_id)
                  .maybeSingle()
              : Promise.resolve<{ data: Row | null }>({
                  data: null,
                }),
          ]);

          if (!cancelled) {
            const parts = [
              mun.data?.name,
              prov.data?.name,
              reg.data?.name,
            ].filter(Boolean);
            setLocation(parts.join(', '));
          }
        }
      } catch (e) {
        if (!cancelled) {
          setProfile(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const name = displayName(profile);
  const flag = flagEmoji(profile?.country);
  const countryText = countryLabel(profile?.country);

  const href =
    role === 'club'
      ? '/club/profile'
      : '/profile';

  if (!profile) {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
          P
        </div>
        <div className="flex flex-col">
          <div className="text-sm text-gray-500">
            Completa il tuo profilo
          </div>
          <div className="text-base font-semibold leading-tight">
            Vai al profilo
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gray-200 text-lg font-semibold text-gray-700">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex flex-col">
          <div className="text-xs text-gray-500">
            Il tuo profilo
          </div>
          <div className="text-base font-semibold leading-tight">
            {name}
          </div>
          {(countryText || location) && (
            <div className="text-xs text-gray-500">
              {flag && <span className="mr-1">{flag}</span>}
              {countryText}
              {countryText && location && ' · '}
              {location}
            </div>
          )}
        </div>
      </div>

      {/* Riga extra sintetica per ruolo / club */}
      {role === 'club' && (
        <div className="text-xs text-gray-600">
          {profile.sport && (
            <>
              <span className="font-semibold">
                Sport:
              </span>{' '}
              {profile.sport}
            </>
          )}
          {profile.club_league_category && (
            <>
              {' · '}
              <span className="font-semibold">
                Categoria:
              </span>{' '}
              {profile.club_league_category}
            </>
          )}
        </div>
      )}

      {role === 'athlete' && (
        <div className="text-xs text-gray-600">
          {profile.sport && (
            <>
              <span className="font-semibold">
                Sport:
              </span>{' '}
              {profile.sport}
            </>
          )}
          {profile.role && (
            <>
              {' · '}
              <span className="font-semibold">
                Ruolo:
              </span>{' '}
              {profile.role}
            </>
          )}
        </div>
      )}

      <div className="mt-1 text-right">
        <span className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-medium text-gray-700">
          Modifica profilo
        </span>
      </div>
    </Link>
  );
}
