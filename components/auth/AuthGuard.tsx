'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

// Pagine pubbliche (nessun controllo auth)
const PUBLIC_PATHS = new Set<string>([
  '/',               // se vuoi landing libera
  '/login',
  '/signup',         // 👈 aggiunta qui
  '/reset-password',
  '/update-password',
  '/debug/env',
]);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (PUBLIC_PATHS.has(pathname)) {
        if (mounted) setChecked(true);
        return;
      }
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
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

  if (!checked) return null;
  return <>{children}</>;
}
