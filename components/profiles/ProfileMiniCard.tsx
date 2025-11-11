'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type ProfileRow = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  birth_year?: number | null;
  birth_place?: string | null;
  city?: string | null;
  country?: string | null;
  foot?: string | null;
  sport?: string | null;
  role?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  avatar_url?: string | null;
  links?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    x?: string | null;
  } | null;
};

type LocationRow = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ---------- helpers paese & formattazioni ---------- */

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

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  usa: 'US',
  'united states': 'US',
  'stati uniti': 'US',
  'czech republic': 'CZ',
  'repubblica ceca': 'CZ',
  'cote d’ivoire': 'CI',
  "côte d’ivoire": 'CI',
};

function nameToIso2(v?: string | null): string | null {
  const raw = (v || '').trim();
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

function formatDominantSide(value?: string | null): string {
  const raw = (value ?? '').toString().toLowerCase();
  if (!raw) return '';
  if (['destro', 'right', 'dx', 'r'].includes(raw)) return 'Destro';
  if (['sinistro', 'left', 'sx', 'l'].includes(raw)) return 'Sinistro';
  if (['ambidestro', 'both', 'ambi', 'ambidextrous'].includes(raw))
    return 'Ambidestro';
  return '';
}

function formatSport(slug?: string | null): string {
  if (!slug) return '';
  return slug
    .replace(/_/g, ' ')
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/* ================= COMPONENT ================= */

export default function ProfileMiniCard() {
  const [p, setP] = useState<ProfileRow | null>(null);
  const [place, setPlace] = useState<string>('—');
  const [roleType, setRoleType] = useState<'club' | 'athlete' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) {
          setP(null);
          return;
        }
        const raw = await r.json().catch(() => ({}));
        const data =
          raw && typeof raw === 'object' && 'data' in raw
            ? (raw as any).data
            : raw;

        const profile: ProfileRow = data || {};
        setP(profile);

        const type = (
          profile.account_type ||
          (profile as any).profile_type ||
          (profile as any).type ||
          ''
        )
          .toString()
          .toLowerCase();

        if (type.includes('club')) setRoleType('club');
        else if (type.includes('athlete') || type.includes('atlet'))
          setRoleType('athlete');
        else setRoleType(null);

        // luogo di residenza:
        if (profile.city && profile.city.trim()) {
          setPlace(profile.city.trim());
        } else {
          const [mun, prov, reg] = await Promise.all([
            profile.interest_municipality_id
              ? supabase
                  .from('municipalities')
                  .select('id,name')
                  .eq('id', profile.interest_municipality_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            profile.interest_province_id
              ? supabase
                  .from('provinces')
                  .select('id,name')
                  .eq('id', profile.interest_province_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            profile.interest_region_id
              ? supabase
                  .from('regions')
                  .select('id,name')
                  .eq('id', profile.interest_region_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          const m = (mun as any)?.data as LocationRow | null;
          const pr = (prov as any)?.data as LocationRow | null;
          const re = (reg as any)?.data as LocationRow | null;

          const label = [m?.name, pr?.name, re?.name].filter(Boolean).join(', ');
          setPlace(label || '—');
        }
      } catch (e) {
        console.error(e);
        setP(null);
      }
    })();
  }, []);

  if (!p) return null;

  const year = new Date().getFullYear();
  const age =
    p.birth_year && p.birth_year > 1900
      ? Math.max(0, year - p.birth_year)
      : null;

  const name = p.full_name || p.display_name || 'Completa il tuo profilo';

  const iso = nameToIso2(p.country);
  const countryLabel = iso ? DN_IT.of(iso) || iso : p.country || '';
  const flagUrl = iso
    ? `https://flagcdn.com/20x15/${iso.toLowerCase()}.png`
    : null;

  const dominant = formatDominantSide(p.foot);
  const sportLabel = formatSport(p.sport);
  const roleLabel = (p.role || '').toString().trim();

  const editHref = roleType === 'club' ? '/club/profile' : '/profile';

  // socials usati solo se servono (icone piccole)
  const socials = {
    instagram: p.links?.instagram,
    facebook: p.links?.facebook,
    tiktok: p.links?.tiktok,
    x: p.links?.x,
  };

  const IconWrap = ({
    href,
    label,
    children,
  }: {
    href: string;
    label: string;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-neutral-700 hover:bg-neutral-50"
    >
      {children}
    </a>
  );

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* avatar più grande */}
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={name}
            className="h-24 w-24 flex-shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="h-24 w-24 flex-shrink-0 rounded-2xl bg-gray-200" />
        )}

        <div className="min-w-0 flex-1">
          <div className="text-sm text-gray-500">
            {roleType === 'club' ? 'Profilo Club' : 'Profilo Atleta'}
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {name}
          </div>

          {place && place !== '—' && (
            <div className="text-sm text-gray-600">
              Luogo di residenza:{' '}
              <span className="font-normal">{place}</span>
            </div>
          )}

          {p.birth_place && (
            <div className="text-sm text-gray-600">
              Luogo di nascita:{' '}
              <span className="font-normal">{p.birth_place}</span>
            </div>
          )}

          {(iso || p.country) && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>Nazionalità:</span>
              {flagUrl && (
                <img
                  src={flagUrl}
                  alt={countryLabel || ''}
                  width={20}
                  height={15}
                  className="inline-block rounded-[2px]"
                />
              )}
              <span className="font-normal">
                {countryLabel || p.country}
              </span>
            </div>
          )}

          {sportLabel && (
            <div className="text-sm text-gray-600">
              Sport principale:{' '}
              <span className="font-normal">{sportLabel}</span>
            </div>
          )}

          {roleLabel && (
            <div className="text-sm text-gray-600">
              Ruolo:{' '}
              <span className="font-normal">{roleLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Età:</span>{' '}
          <span className="font-medium text-gray-800">
            {age ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Lato dominante:</span>{' '}
          <span className="font-medium text-gray-800">
            {dominant || '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Altezza:</span>{' '}
          <span className="font-medium text-gray-800">
            {p.height_cm ? `${p.height_cm} cm` : '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Peso:</span>{' '}
          <span className="font-medium text-gray-800">
            {p.weight_kg ? `${p.weight_kg} kg` : '—'}
          </span>
        </div>
      </div>

      {p.bio && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-700">
          {p.bio}
        </p>
      )}

      {(socials.instagram ||
        socials.facebook ||
        socials.tiktok ||
        socials.x) && (
        <div className="mt-3 flex items-center gap-2">
          {socials.instagram && (
            <IconWrap href={socials.instagram} label="Instagram">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#E1306C"
                  d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3.2"
                  fill="#fff"
                />
                <circle
                  cx="17.3"
                  cy="6.7"
                  r="1.4"
                  fill="#fff"
                />
              </svg>
            </IconWrap>
          )}
          {socials.facebook && (
            <IconWrap href={socials.facebook} label="Facebook">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#1877F2"
                  d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"
                />
              </svg>
            </IconWrap>
          )}
          {socials.tiktok && (
            <IconWrap href={socials.tiktok} label="TikTok">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#000"
                  d="M16 3c.6 2.2 2.2 4 4.3 4.7V11a8.3 8.3 0 0 1-4.3-1.3v6.1a5.9 5.9 0 1 1-5.9-5.9c.5 0 1 .1 1.5.2v2.7a3.2 3.2 0 1 0 2.2 3V3h2.2z"
                />
              </svg>
            </IconWrap>
          )}
          {socials.x && (
            <IconWrap href={socials.x} label="X">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#111"
                  d="M3 3h4.6l4.1 5.8L16.8 3H21l-7.2 9.1L21.5 21h-4.6l-4.6-6.4L7.2 21H3l7.6-9.6L3 3z"
                />
              </svg>
            </IconWrap>
          )}
        </div>
      )}

      <div className="mt-4">
        <Link
          href={editHref}
          className="inline-block rounded-xl border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Modifica profilo
        </Link>
      </div>
    </div>
  );
}
