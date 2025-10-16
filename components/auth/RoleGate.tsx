'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Me = { account_type?: string | null };

// Pagine che non devono essere bloccate dal gate (evita loop)
const EXCLUDE_PREFIXES = [
  '/onboarding/choose-role',
  '/login',
  '/logout',
  '/reset-password',
];

export default function RoleGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        // Se la path è esclusa, non fare nulla
        if (EXCLUDE_PREFIXES.some(p => pathname.startsWith(p))) {
          setReady(true);
          return;
        }

        // Leggi profilo corrente
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        if (r.status === 401) {
          // layout autenticato: in teoria non ci arrivi
          setReady(true);
          return;
        }
        const j = await r.json().catch(() => ({}));
        const data: Me = (j && typeof j === 'object' && 'data' in j) ? (j as any).data : j;

        // Se manca account_type → vai alla scelta ruolo
        if (!data?.account_type) {
          const next = pathname + (search?.toString() ? `?${search.toString()}` : '');
          router.replace(`/onboarding/choose-role?next=${encodeURIComponent(next)}`);
          return;
        }

        setReady(true);
      } catch {
        // In caso di errore non bloccare l'UI
        setReady(true);
      }
    })();
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
