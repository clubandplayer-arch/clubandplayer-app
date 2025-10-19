// hooks/useIsClub.ts
'use client';

import { useEffect, useState } from 'react';

export default function useIsClub() {
  const [isClub, setIsClub] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await r.json().catch(() => ({}));
        const j = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
        setIsClub((j?.account_type ?? '') === 'club');
      } catch {
        setIsClub(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { isClub, loading };
}
