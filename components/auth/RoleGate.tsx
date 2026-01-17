'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Me = { account_type?: string | null; status?: string | null };

// Pagine che non devono essere bloccate dal gate (evita loop)
const EXCLUDE_PREFIXES = [
  '/onboarding/choose-role',
  '/login',
  '/logout',
  '/reset-password',
  '/blocked',
];

export default function RoleGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    let active = true;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 350;

    (async () => {
      try {
        // Se la path è esclusa, non fare nulla
        if (EXCLUDE_PREFIXES.some(p => pathname.startsWith(p))) {
          if (active) setReady(true);
          return;
        }

        let j: any = {};
        let data: Me = {};

        for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
          const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
          j = await r.json().catch(() => ({}));
          data = (j?.profile as any) ?? {};
          if (j?.user?.id) break;
          if (attempt < MAX_RETRIES - 1) {
            await delay(RETRY_DELAY_MS);
          }
        }

        const next = pathname + (search?.toString() ? `?${search.toString()}` : '');

        if (!j?.user?.id) {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        // Se manca account_type → vai alla scelta ruolo
        if (!data?.account_type) {
          router.replace(`/onboarding/choose-role?next=${encodeURIComponent(next)}`);
          return;
        }

        // Se non è attivo → pagina bloccata
        const status = String(data.status ?? '').toLowerCase();
        if (status && status !== 'active') {
          router.replace(`/blocked?status=${encodeURIComponent(status)}`);
          return;
        }

        if (active) setReady(true);
      } catch {
        // In caso di errore non bloccare l'UI
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [pathname, router, search]);

  if (!ready) {
    return (
      <div className="p-8 text-sm text-neutral-600">
        Controllo impostazioni dell’account…
      </div>
    );
  }

  return <>{children}</>;
}
