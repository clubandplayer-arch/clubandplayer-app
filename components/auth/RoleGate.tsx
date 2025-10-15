'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function RoleGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // evita loop se siamo già nella pagina di scelta
    if (pathname?.startsWith('/onboarding/choose-role')) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json().catch(() => ({}));
        const accountType = (j?.account_type ?? '').toString();
        if (!cancelled && (!accountType || accountType === 'null')) {
          router.replace('/onboarding/choose-role');
        }
      } catch {
        /* non bloccare la navigazione in caso di errore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
