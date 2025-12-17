'use client';

import { useEffect, useState } from 'react';

import { buildLocationLabel } from '@/lib/geo/locationLabel';

export type ProfileRole = 'guest' | 'athlete' | 'club';

export type CurrentProfileContext = {
  id: string | null;
  account_type: ProfileRole | null;
  status?: string | null;
  country?: string | null;
  city?: string | null;
  display_name?: string | null;
  full_name?: string | null;
};

export function useCurrentProfileContext() {
  const [role, setRole] = useState<ProfileRole>('guest');
  const [profile, setProfile] = useState<CurrentProfileContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const who = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const whoJson = await who.json().catch(() => ({}));
        const nextRole: ProfileRole =
          whoJson?.role === 'club' || whoJson?.role === 'athlete' ? whoJson.role : 'guest';
        if (!active) return;
        setRole(nextRole);

        const me = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const meJson = await me.json().catch(() => ({}));
        const data = meJson?.data || null;
        if (!active) return;
        if (data) {
          const interestLocation = buildLocationLabel({
            interest_city: data.interest_city ?? null,
            interest_province: data.interest_province ?? null,
            interest_region: data.interest_region ?? null,
            interest_country: data.interest_country ?? data.country ?? null,
          });
          const fallbackLocation =
            interestLocation === 'Località n/d'
              ? buildLocationLabel({
                  city: data.city ?? null,
                  province: data.province ?? null,
                  region: data.region ?? null,
                  country: data.country ?? null,
                })
              : interestLocation;
          setProfile({
            id: data.id ?? null,
            account_type: data.account_type ?? nextRole ?? null,
            status: data.status ?? null,
            country: data.interest_country ?? data.country ?? null,
            city: fallbackLocation === 'Località n/d' ? null : fallbackLocation,
            display_name: data.display_name ?? null,
            full_name: data.full_name ?? null,
          });
        } else {
          setProfile(null);
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Impossibile recuperare il profilo corrente');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { role, profile, loading, error };
}
