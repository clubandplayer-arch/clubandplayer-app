'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { cache: 'no-store', credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const role = String(j?.role ?? '').toLowerCase();
        if (role === 'club') router.replace('/club/profile');
        else if (role === 'athlete') router.replace('/profile');
        else router.replace('/feed');
      } catch {
        if (!cancelled) router.replace('/feed');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return null;
}
