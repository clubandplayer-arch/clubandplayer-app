'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Ripulisce l’URL dopo l’OAuth:
 * - se ci sono token in hash (#access_token=...) o un ?code= (PKCE),
 *   aspetta un attimo per permettere al client di salvare la sessione
 *   e poi rimuove hash/query.
 */
export default function HashCleanup() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { hash, search } = window.location;

    const hasTokens =
      /access_token=|refresh_token=|provider_token=|type=recovery/i.test(hash) ||
      /(^|\?)code=/.test(search);

    if (!hasTokens) return;

    // Dai tempo al client di persistere la sessione
    const t = setTimeout(() => {
      const url = new URL(window.location.href);

      // 1) pulisci hash
      url.hash = '';

      // 2) rimuovi il codice PKCE se presente
      if (url.searchParams.has('code')) {
        url.searchParams.delete('code');
      }

      // 3) applica l’URL pulito
      history.replaceState(null, '', url.toString());

      // 4) opzionale: porta l’utente dentro l’app se sei su / o /login
      if (pathname === '/' || pathname === '/login') {
        router.replace('/feed'); // cambia se preferisci
      }
    }, 400);

    return () => clearTimeout(t);
  }, [pathname, router]);

  return null;
}
