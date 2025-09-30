'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';

const KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

export default function PostHogInit() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // 1) Init una volta sola, rispettando il consenso
  useEffect(() => {
    if (typeof window === 'undefined' || !KEY || (posthog as any).__loaded) return;

    const hasConsent = localStorage.getItem('cp-consent') === 'true';

    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,          // tracciamo noi manualmente
      persistence: 'localStorage+cookie',
      opt_out_capturing_by_default: !hasConsent,
    });

    // opzionale: ascolta eventi del banner (se li emette)
    window.addEventListener('cp:consent-accepted', () => {
      posthog.opt_in_capturing();
      posthog.capture('consent_accepted');
    });
    window.addEventListener('cp:consent-declined', () => {
      posthog.opt_out_capturing();
    });

    // 2) Identifica utente (se loggato)
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.user?.id) {
          posthog.identify(d.user.id, { role: d.role, email: d.user.email });
        }
      })
      .catch(() => {});
  }, []);

  // 3) Pageview su ogni cambio route/query
  useEffect(() => {
    if (!KEY || typeof window === 'undefined' || !(posthog as any).__loaded) return;
    posthog.capture('$pageview', { path: pathname, search: searchParams?.toString() });
  }, [pathname, searchParams]);

  return null;
}
