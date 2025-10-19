// hooks/useIsClub.ts
'use client';

import { useEffect, useState } from 'react';

/** Ritorna { isClub, loading }.
 *  1) Tenta /api/auth/whoami (fonte server)
 *  2) Fallback: /api/profiles/me (account_type)
 */
export default function useIsClub() {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        // 1) whoami
        const r1 = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j1 = await r1.json().catch(() => ({}));
        const role = String(j1?.role ?? j1?.type ?? '').toLowerCase();
        if (!cancel && role === 'club') {
          setIsClub(true);
          setLoading(false);
          return;
        }

        // 2) fallback profilo
        const r2 = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r2.json().catch(() => ({}));
        const data = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
        if (!cancel) setIsClub(String(data?.account_type ?? '').toLowerCase() === 'club');
      } catch {
        if (!cancel) setIsClub(false);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, []);

  return { isClub, loading };
}
