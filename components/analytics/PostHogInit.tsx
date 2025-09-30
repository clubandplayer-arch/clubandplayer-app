'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

// piccolo helper: legge consenso dal nostro banner
function hasConsent() {
  try {
    return localStorage.getItem('cnp-consent') === 'granted';
  } catch {
    return false;
  }
}

export default function PostHogInit() {
  useEffect(() => {
    // evita init se manca la key o non c’è consenso
    if (!KEY || !hasConsent()) return;

    // init idempotente
    if (!posthog.__loaded) {
      posthog.init(KEY, {
        api_host: HOST,
        autocapture: true,
        capture_pageview: true,
        persistence: 'localStorage+cookie',
      });
    }

    // identify utente (usa la nostra whoami API)
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const json = await res.json();
        const uid = json?.user?.id as string | undefined;
        if (uid) {
          posthog.identify(uid, {
            role: json?.role,
            profile_type: json?.profile?.type,
          });
        } else {
          posthog.reset(); // utente guest
        }
      } catch {
        /* ignore */
      }
    })();

    // pulizia opzionale quando si smonta
    return () => {};
  }, []);

  return null;
}
