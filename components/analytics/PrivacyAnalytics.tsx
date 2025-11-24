'use client';

import { useEffect } from 'react';

const CONSENT_KEY = 'cp-consent-v1';
const ANALYTICS_DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN || '';
const ANALYTICS_SRC =
  process.env.NEXT_PUBLIC_ANALYTICS_SRC || 'https://plausible.io/js/script.outbound-links.js';
const ANALYTICS_API = process.env.NEXT_PUBLIC_ANALYTICS_API || '';

function hasDoNotTrack(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as Window & { doNotTrack?: string };
  const nav = window.navigator as Navigator & { msDoNotTrack?: string; doNotTrack?: string };
  const signals = [win?.doNotTrack, nav?.doNotTrack, nav?.msDoNotTrack];
  return signals.some((value) => value === '1' || value === 'yes');
}

function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.consent === 'all';
  } catch {
    return false;
  }
}

export default function PrivacyAnalytics() {
  useEffect(() => {
    if (!ANALYTICS_DOMAIN) return;
    if (hasDoNotTrack()) {
      console.info('[Analytics] DNT attivo: script non caricato');
      return;
    }
    if (!hasConsent()) {
      console.info('[Analytics] Consenso non presente: analytics disattivati');
      return;
    }

    const script = document.createElement('script');
    script.src = ANALYTICS_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-domain', ANALYTICS_DOMAIN);
    if (ANALYTICS_API) {
      script.setAttribute('data-api', ANALYTICS_API);
    }

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
