'use client';

import { useEffect, useState } from 'react';

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
          setProfile({
            id: data.id ?? null,
            account_type: data.account_type ?? nextRole ?? null,
            status: data.status ?? null,
            country: data.interest_country ?? data.country ?? null,
            city: data.interest_city ?? data.city ?? null,
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
