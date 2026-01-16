// components/profiles/ProfileMiniCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import FollowButton from '@/components/clubs/FollowButton';
import { CountryFlag } from '@/components/ui/CountryFlag';
import ClubAvatarVerified from '@/components/ui/ClubAvatarVerified';

import { resolveCountryName, resolveStateName } from '@/lib/geodata/countryStateCityDataset';
import { normalizeSport } from '@/lib/opps/constants';
import { getCountryDisplay } from '@/lib/utils/countryDisplay';

type P = {
  id?: string | null;
  user_id?: string | null;

  account_type?: 'club' | 'athlete' | null;

  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  birth_year?: number | null;
  city?: string | null;            // residenza libera (estero)
  country?: string | null;         // nazionalità ISO2 o testo

  role?: string | null;

  // residenza IT (atleta)
  residence_region_id?: number | null;
  residence_province_id?: number | null;
  residence_municipality_id?: number | null;

  // nascita (atleta)
  birth_country?: string | null;   // ISO2
  birth_place?: string | null;     // città estera fallback
  birth_region_id?: number | null;
  birth_province_id?: number | null;
  birth_municipality_id?: number | null;

  // atleta
  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;

  // club
  sport?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;
  club_stadium_address?: string | null;
  club_stadium_lat?: number | null;
  club_stadium_lng?: number | null;
  club_league_category?: string | null;
  club_motto?: string | null;

  // interesse (non mostrato)
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  interest_country?: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;

  avatar_url?: string | null;
  links?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    x?: string | null;
  } | null;
  is_verified?: boolean | null;
};

type Row = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type InterestGeo = {
  city: string;
  region: string;
  country: string;
};

/* ---------- helpers bandiera/nome paese ---------- */

export default function ProfileMiniCard() {
  const [p, setP] = useState<P | null>(null);
  const [interest, setInterest] = useState<InterestGeo>({ city: '—', region: '', country: '' });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = (raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw) || {};
        setP(j || {});

        const countryCode = (j?.interest_country || j?.country || '').trim() || null;
        const countryName = resolveCountryName(countryCode) || getCountryDisplay(countryCode).label || '';

        let cityName = (j?.interest_city || '').trim();
        let regionName = (j?.interest_region || j?.interest_province || '').trim();

        if (j?.interest_municipality_id || j?.interest_province_id || j?.interest_region_id) {
          const [mun, prov, reg] = await Promise.all([
            j?.interest_municipality_id
              ? supabase.from('municipalities').select('id,name').eq('id', j.interest_municipality_id).maybeSingle()
              : Promise.resolve({ data: null }),
            j?.interest_province_id
              ? supabase.from('provinces').select('id,name').eq('id', j.interest_province_id).maybeSingle()
              : Promise.resolve({ data: null }),
            j?.interest_region_id
              ? supabase.from('regions').select('id,name').eq('id', j.interest_region_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          const m = (mun as any)?.data as Row | null;
          const pr = (prov as any)?.data as Row | null;
          const re = (reg as any)?.data as Row | null;

          cityName = cityName || m?.name || '';
          regionName = regionName || pr?.name || re?.name || '';
        }

        setInterest({
          city: cityName || '—',
          region: resolveStateName(countryCode, regionName),
          country: countryName || '—',
        });
      } catch {
        setP({});
      }
    })();
  }, []);

  const isClub = p?.account_type === 'club';
  const targetId = p?.id ? String(p.id) : p?.user_id ? String(p.user_id) : '';
  const isSelf =
    !!targetId && ((!!p?.id && targetId === String(p.id)) || (!!p?.user_id && targetId === String(p.user_id)));
  const year = new Date().getFullYear();
  const age = !isClub && p?.birth_year ? Math.max(0, year - p.birth_year) : null;
  const name = p?.full_name || p?.display_name || (isClub ? 'Il tuo club' : 'Benvenuto!');
  const interestLabel = [interest.city, interest.region, interest.country].filter(Boolean).join(', ');
  const sportLabel = normalizeSport(p?.sport ?? null) ?? p?.sport ?? null;

  // nazionalità con bandiera
  const rawCountry = (p?.country ?? '').trim();
  const matchCountry = rawCountry.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
  const iso2 = matchCountry ? matchCountry[1].trim().toUpperCase() : null;
  const countryLabel = (matchCountry ? (matchCountry[2]?.trim() || iso2 || '') : rawCountry) || '';

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasStadiumCoords =
    isClub && p?.club_stadium_lat != null && p?.club_stadium_lng != null;
  const mapEmbedUrl =
    hasStadiumCoords && mapsKey
      ? `https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${p?.club_stadium_lat},${p?.club_stadium_lng}&zoom=15&maptype=roadmap`
      : null;

  const socials = {
    instagram: p?.links?.instagram,
    facebook: p?.links?.facebook,
    tiktok: p?.links?.tiktok,
    x: p?.links?.x,
  };

  const IconWrap = ({ href, label, children, className = '' }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-neutral-50 ${className}`}
    >
      {children}
    </a>
  );

  return (
    <div className="glass-panel p-4 space-y-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <ClubAvatarVerified
          src={p?.avatar_url || null}
          alt={name}
          sizeClass="w-3/4 max-w-[140px] aspect-square md:w-2/3 md:max-w-[160px]"
          isVerified={isClub && p?.is_verified}
          badgeSize="lg"
          className="ring-1 ring-white/70 rounded-full"
          imageClassName="object-cover"
          fallback={<div className="h-full w-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200" />}
        />

        <div className="w-full space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="break-words text-base font-semibold">{name}</div>
          </div>

          {/* righe info */}
          {!isClub && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-700">
              <span className="text-gray-500">Nazionalità:</span>
              <CountryFlag iso2={iso2} />
              <span className="font-medium text-gray-900">{countryLabel || '—'}</span>
            </div>
          )}

          {!isClub && (
            <div className="text-xs text-gray-600">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Zona di interesse</div>
              <div className="text-sm font-semibold text-gray-800">{interestLabel || '—'}</div>
            </div>
          )}

          {isClub && interestLabel ? (
            <p className="text-sm font-medium text-gray-800">{interestLabel}</p>
          ) : null}
          {isClub && p?.club_motto ? (
            <p className="text-xs italic text-gray-600">{p.club_motto}</p>
          ) : null}
        </div>
      </div>

          {isClub ? (
            <div className="space-y-3">
              {targetId && !isSelf ? (
                <div className="flex justify-center">
                  <FollowButton
                    targetProfileId={targetId}
                    labelFollow="Segui"
                    labelFollowing="Seguo"
                    size="md"
                    className="w-full justify-center"
                  />
            </div>
          ) : null}

          <div className="space-y-1 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dettagli club</div>
          </div>
          <dl className="space-y-2 rounded-xl bg-white/70 p-3 text-sm text-gray-800 shadow-sm ring-1 ring-gray-100">
            {p?.sport && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sport</dt>
                <dd className="font-medium text-gray-900">{sportLabel}</dd>
              </div>
            )}
            {p?.club_league_category && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria</dt>
                <dd className="font-medium text-gray-900">{p.club_league_category}</dd>
              </div>
            )}
            {p?.club_stadium && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Impianto sportivo</dt>
                <dd className="font-medium text-gray-900">{p.club_stadium}</dd>
              </div>
            )}
            {p?.club_stadium_address && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Indirizzo</dt>
                <dd className="whitespace-pre-line font-medium text-gray-900">{p.club_stadium_address}</dd>
              </div>
            )}
          </dl>

          {p?.bio ? (
            <div className="rounded-xl bg-white/70 p-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biografia</div>
              <p className="mt-1 line-clamp-3 whitespace-pre-line break-words leading-snug">{p.bio}</p>
            </div>
          ) : null}

          {mapEmbedUrl ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mappa</div>
              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <iframe
                  title={`Mappa stadio ${p?.club_stadium || 'club'}`}
                  aria-label="Mappa stadio"
                  src={mapEmbedUrl}
                  className="h-32 w-full"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}

        </div>
      ) : (
        <div className="space-y-3">
          {targetId && !isSelf ? (
            <div className="flex justify-center">
              <FollowButton
                targetProfileId={targetId}
                labelFollow="Segui"
                labelFollowing="Seguo"
                size="md"
                className="w-full justify-center"
              />
            </div>
          ) : null}

          <div className="space-y-1 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dettagli player</div>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-white/70 p-3 text-sm text-gray-800 shadow-sm ring-1 ring-gray-100">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Età</dt>
              <dd className="font-medium text-gray-900">{age ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Altezza</dt>
              <dd className="font-medium text-gray-900">{p?.height_cm ? `${p.height_cm} cm` : '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Peso</dt>
              <dd className="font-medium text-gray-900">{p?.weight_kg ? `${p.weight_kg} kg` : '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Piede</dt>
              <dd className="font-medium text-gray-900">{p?.foot || '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sport</dt>
              <dd className="font-medium text-gray-900">{p?.sport || '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ruolo</dt>
              <dd className="font-medium text-gray-900">{p?.role || '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5 col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Città / Paese</dt>
              <dd className="font-medium text-gray-900">{p?.city || interestLabel || '—'}</dd>
            </div>
          </dl>

          {p?.bio ? (
            <div className="rounded-xl bg-white/70 p-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biografia</div>
              <p className="mt-1 line-clamp-3 whitespace-pre-line break-words leading-snug">{p.bio}</p>
            </div>
          ) : null}

        </div>
      )}

      {isClub
        ? null
        : (socials.instagram || socials.facebook || socials.tiktok || socials.x) && (
            <div className="mt-3 flex items-center gap-2">
              {socials.instagram && (
                <IconWrap href={socials.instagram} label="Instagram" className="border-[#E1306C]/30 text-[#E1306C]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9zm4.5-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>
                </IconWrap>
              )}
              {socials.facebook && (
                <IconWrap href={socials.facebook} label="Facebook" className="border-[#1877F2]/30 text-[#1877F2]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.4V12h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"/></svg>
                </IconWrap>
              )}
              {socials.tiktok && (
                <IconWrap href={socials.tiktok} label="TikTok" className="border-black/20 text-black">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.6 2.2 2.2 4 4.3 4.7V11a8.3 8.3 0 0 1-4.3-1.3v6.1a5.9 5.9 0 1 1-5.9-5.9c.5 0 1 .1 1.5.2v2.7a3.2 3.2 0 1 0 2.2 3V3h2.2z"/></svg>
                </IconWrap>
              )}
              {socials.x && (
                <IconWrap href={socials.x} label="X" className="border-black/20 text-black">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h4.6l4.1 5.8L16.8 3H21l-7.2 9.1L21.5 21h-4.6l-4.6-6.4L7.2 21H3l7.6-9.6L3 3z"/></svg>
                </IconWrap>
              )}
            </div>
          )}
    </div>
  );
}
