/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { resolveCountryName, resolveStateName } from '@/lib/geodata/countryStateCityDataset';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  sport?: string | null;
  club_league_category?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;
  club_stadium_address?: string | null;
  club_stadium_lat?: number | null;
  club_stadium_lng?: number | null;
};

type LocationRow = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function ClubProfileDetails() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ region?: string; province?: string; municipality?: string }>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;

        if (cancelled) return;
        setProfile(j || {});

        if (!j?.interest_region_id && !j?.interest_province_id && !j?.interest_municipality_id) return;

        const [reg, prov, mun] = await Promise.all([
          j?.interest_region_id
            ? supabase.from('regions').select('id,name').eq('id', j.interest_region_id).maybeSingle()
            : Promise.resolve({ data: null }),
          j?.interest_province_id
            ? supabase.from('provinces').select('id,name').eq('id', j.interest_province_id).maybeSingle()
            : Promise.resolve({ data: null }),
          j?.interest_municipality_id
            ? supabase
                .from('municipalities')
                .select('id,name')
                .eq('id', j.interest_municipality_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const region = (reg as any)?.data as LocationRow | null;
        const province = (prov as any)?.data as LocationRow | null;
        const municipality = (mun as any)?.data as LocationRow | null;

        if (!cancelled) {
          setLocation({
            region: region?.name,
            province: province?.name,
            municipality: municipality?.name,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isClub = profile?.account_type === 'club';

  const displayName = useMemo(
    () => profile?.full_name || profile?.display_name || 'Il tuo club',
    [profile?.display_name, profile?.full_name],
  );

  const country = useMemo(() => resolveCountryName(profile?.country || undefined), [profile?.country]);

  const cityLine = useMemo(() => {
    const city = profile?.city || location.municipality;
    const parts = [city, location.province, resolveStateName(profile?.country || null, location.region), country]
      .filter(Boolean)
      .map((p) => String(p));
    return parts.join(' · ');
  }, [country, location.municipality, location.province, location.region, profile?.city, profile?.country]);

  if (loading) {
    return (
      <section className="glass-panel space-y-4 p-5 md:p-6" aria-busy>
        <div className="h-6 w-40 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-64 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-full animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-4 w-5/6 animate-pulse rounded-xl bg-neutral-100" />
      </section>
    );
  }

  if (!isClub) return null;

  return (
    <section className="glass-panel space-y-6 p-5 md:p-6">
      <header className="text-center space-y-2">
        {profile?.avatar_url ? (
          <div className="mx-auto h-36 w-36 overflow-hidden rounded-full border border-white/60 shadow md:h-40 md:w-40">
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="mx-auto h-36 w-36 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 shadow md:h-40 md:w-40" />
        )}
        <div>
          <h2 className="heading-h2 mb-1">Dati club</h2>
          <p className="text-lg font-semibold leading-tight text-neutral-900">{displayName}</p>
          {cityLine ? <p className="text-sm text-neutral-600">{cityLine}</p> : null}
        </div>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Sport</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.sport || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Categoria / Campionato</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.club_league_category || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Anno di fondazione</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.club_foundation_year || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Stadio / Impianto</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.club_stadium || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Indirizzo impianto</dt>
          <dd className="text-base font-semibold text-neutral-900">
            {profile?.club_stadium_address || '—'}
          </dd>
        </div>
        <div className="sm:col-span-2 rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Biografia / Descrizione</dt>
          <dd className="mt-1 text-sm leading-relaxed text-neutral-800">
            {profile?.bio ? profile.bio : 'Aggiungi una descrizione per raccontare storia e valori del club.'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
