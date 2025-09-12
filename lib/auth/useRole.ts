// lib/auth/useRole.ts
'use client';

import { useEffect, useState } from 'react';

export type Role = 'athlete' | 'club' | 'guest';

type WhoAmIResponse = {
  user: { id: string; email?: string | null } | null;
  role?: string | null;
};

export function useRole() {
  const [role, setRole] = useState<Role>('guest');
  const [user, setUser] = useState<WhoAmIResponse['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: WhoAmIResponse = await res.json();
        if (aborted) return;

        const raw = (data.role ?? '').toString().toLowerCase();
        const mapped: Role = raw === 'club' ? 'club' : raw === 'athlete' ? 'athlete' : 'guest';

        setRole(mapped);
        setUser(data.user ?? null);
      } catch {
        if (!aborted) {
          setRole('guest');
          setUser(null);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  return { role, user, loading };
}

export default useRole;
