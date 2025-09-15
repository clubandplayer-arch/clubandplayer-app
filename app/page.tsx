'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const role = String(j?.role ?? '').toLowerCase();

        if (role === 'club') router.replace('/club/profile');
        else if (role === 'athlete') router.replace('/profile');
        else router.replace('/feed');
      } catch {
        router.replace('/feed');
      }
    })();
  }, [router]);

  return <div className="p-6 text-gray-500">Reindirizzamento…</div>;
}
