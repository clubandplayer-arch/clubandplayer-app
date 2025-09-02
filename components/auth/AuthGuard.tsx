'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

// Rotte sempre pubbliche (nessun redirect)
const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/reset-password',
  '/update-password',
  '/debug/env',
  '/', // opzionale: lasciare libera la home se vuoi landing pubblica
]);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      // Se la rotta è pubblica → non fare controlli
      if (PUBLIC_PATHS.has(pathname)) {
        if (mounted) setChecked(true);
        return;
      }

      // Controllo sessione SOLO lato client
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        // Utente non loggato → porta a /login
        router.replace('/login');
      } else {
        if (mounted) setChecked(true);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  // Fallback di caricamento (opzionale)
  if (!checked) return null;

  return <>{children}</>;
}
