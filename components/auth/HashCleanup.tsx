'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

/**
 * Rileva i token nell'hash (#access_token=...) dopo l'OAuth,
 * lascia a Supabase il tempo di registrare la sessione,
 * poi rimuove l'hash dall'URL e (opzionale) reindirizza.
 */
export default function HashCleanup() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash) return;

    const hasTokens =
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('provider_token=') ||
      hash.includes('type=recovery') || // reset pwd
      hash.includes('code=');

    if (!hasTokens) return;

    // Assicuriamoci che Supabase “catturi” la sessione dall’URL
    supabaseBrowser()
      .auth.getSession()
      .finally(() => {
        // 1) Pulisci l’URL (rimuovi il #...)
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, cleanUrl);

        // 2) (Opzionale) porta l’utente su una pagina “post login”
        // Se non hai una dashboard specifica, commenta la riga sotto.
        if (pathname === '/' || pathname === '/login') {
          router.replace('/'); // oppure '/opportunities'
        }
      });
  }, [pathname, router]);

  return null;
}
