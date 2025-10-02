'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

export default function PostHogInit() {
  useEffect(() => {
    try {
      const consent = (localStorage.getItem('cookie_consent') ?? 'rejected') as
        | 'accepted'
        | 'rejected';

      const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';

      // Se mancano le ENV → non inizializzare
      if (!KEY) {
        console.info('[Analytics] PostHog DISABLED: missing NEXT_PUBLIC_POSTHOG_KEY');
        return;
      }

      // Se il consenso non è accettato → opt-out
      if (consent !== 'accepted') {
        try { posthog.opt_out_capturing(); } catch {}
        console.info('[Analytics] PostHog opt-out, consent =', consent);
        return;
      }

      // Inizializza una sola volta
      // (in alcune build Turbopack il global non viene esposto: lo forziamo su window)
      if (!(window.posthog as any)?._isInited) {
        posthog.init(KEY, {
          api_host: HOST,
          capture_pageview: false,   // tracciamo noi le pageview
          autocapture: false,        // tracciamo solo eventi espliciti
          person_profiles: 'identified_only',
        });
        (posthog as any)._isInited = true;
        window.posthog = posthog;
        console.info('[Analytics] PostHog initialized');
      }

      // Abilita debug se ?ph_debug=1
      if (new URLSearchParams(location.search).get('ph_debug') === '1') {
        posthog.debug(true);
        console.log('[PostHog] debug ON');
      }
    } catch (e) {
      console.error('[Analytics] PostHog init error', e);
    }
  }, []);

  return null;
}
