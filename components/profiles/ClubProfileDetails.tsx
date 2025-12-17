/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';

import { buildLocationLabel } from '@/lib/geo/locationLabel';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  province?: string | null;
  club_motto?: string | null;
  interest_country?: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
  sport?: string | null;
  club_league_category?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;
  club_stadium_address?: string | null;
  club_stadium_lat?: number | null;
  club_stadium_lng?: number | null;
};

export default function ClubProfileDetails() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;

        if (cancelled) return;
        setProfile(j || {});
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

  const cityLine = useMemo(() => {
    const interest = buildLocationLabel({
      interest_city: profile?.interest_city ?? null,
      interest_province: profile?.interest_province ?? null,
      interest_region: profile?.interest_region ?? null,
      interest_country: profile?.interest_country ?? profile?.country ?? null,
    });
    if (interest !== 'Località n/d') return interest;
    const base = buildLocationLabel({
      city: profile?.city ?? null,
      province: profile?.province ?? null,
      region: profile?.region ?? null,
      country: profile?.country ?? null,
    });
    return base === 'Località n/d' ? '' : base;
  }, [profile?.city, profile?.country, profile?.interest_city, profile?.interest_country, profile?.interest_province, profile?.interest_region, profile?.province, profile?.region]);

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
          <div className="mx-auto h-36 w-36 overflow-hidden rounded-full border border-white/60 md:h-40 md:w-40">
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="mx-auto h-36 w-36 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 md:h-40 md:w-40" />
        )}
        <div>
          <h2 className="heading-h2 mb-1">Dati club</h2>
          <p className="text-lg font-semibold leading-tight text-neutral-900">{displayName}</p>
          {cityLine ? <p className="text-sm text-neutral-600">{cityLine}</p> : null}
          {profile?.club_motto ? (
            <p className="text-sm italic text-neutral-700">{profile.club_motto}</p>
          ) : null}
        </div>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Sport</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.sport || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Categoria</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.club_league_category || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Anno di fondazione</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.club_foundation_year || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Impianto sportivo</dt>
          <dd className="text-base font-semibold text-neutral-900">{profile?.club_stadium || '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Indirizzo impianto</dt>
          <dd className="text-base font-semibold text-neutral-900">
            {profile?.club_stadium_address || '—'}
          </dd>
        </div>
        <div className="sm:col-span-2 rounded-xl border border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Biografia</dt>
          <dd className="mt-1 text-sm leading-relaxed text-neutral-800">
            {profile?.bio ? profile.bio : 'Aggiungi una descrizione per raccontare storia e valori del club.'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
