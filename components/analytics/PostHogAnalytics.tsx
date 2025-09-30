'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const PH_KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

export default function PostHogAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // init + first pageview + identify
  useEffect(() => {
    if (!PH_KEY) return;

    if (!(posthog as any).__loaded) {
      posthog.init(PH_KEY, {
        api_host: PH_HOST,
        capture_pageview: false,         // lo mandiamo noi a mano
        person_profiles: 'identified_only',
      });
    }

    posthog.capture('$pageview');

    // prova ad identificare l'utente (se loggato)
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j?.user?.id) {
          posthog.identify(j.user.id, {
            email: j.user.email || undefined,
            role:  j.role || undefined,
          });
        }
      })
      .catch(() => {});
  }, []);

  // pageview su navigazioni client-side
  useEffect(() => {
    if (!PH_KEY) return;
    posthog.capture('$pageview');
  }, [pathname, searchParams]);

  return null;
}
