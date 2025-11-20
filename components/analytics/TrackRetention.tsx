'use client';

import { useEffect } from 'react';
import { trackRetention } from '@/lib/analytics';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'cp-retention-';

export default function TrackRetention({ scope }: { scope: string }) {
  useEffect(() => {
    if (!scope) return;
    try {
      const key = `${KEY_PREFIX}${scope}`;
      const now = Date.now();
      const last = Number(localStorage.getItem(key) ?? 0);
      if (!last || now - last >= ONE_DAY_MS) {
        trackRetention(scope);
        localStorage.setItem(key, String(now));
      }
    } catch {
      // no-op: l'analytics non deve bloccare la UI
    }
  }, [scope]);

  return null;
}
