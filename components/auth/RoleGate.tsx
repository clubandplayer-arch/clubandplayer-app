'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function RoleGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Evita loop sulla stessa pagina
    if (pathname?.startsWith('/onboarding/choose-role')) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) return;
        const j = await r.json().catch(() => ({}));
        const accountType = (j?.account_type ?? '').toString();
        if (!cancelled && (!accountType || accountType === 'null')) {
          router.replace('/onboarding/choose-role');
        }
      } catch (_e) {
        // Silenzioso: in caso di errore non blocchiamo la navigazione
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
