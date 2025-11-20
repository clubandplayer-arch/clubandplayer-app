// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';
import CookieConsent from '@/components/misc/CookieConsent';
import PrivacyAnalytics from '@/components/analytics/PrivacyAnalytics';
import WebVitalsReporter from '@/components/analytics/WebVitalsReporter';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clubandplayer.com';
const SITE_NAME = 'Club & Player';
const DEFAULT_TITLE = SITE_NAME;
const DEFAULT_DESC = 'Club & Player App';
const OG_IMAGE = '/og.jpg'; // /public/og.jpg (1200x630)

// Disabilita la prerenderizzazione statica per evitare errori quando le variabili
// Supabase non sono disponibili in fase di build.
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,

  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    locale: 'it_IT',
  },

  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [OG_IMAGE],
  },
};

// ✅ Next 15: viewport deve essere un export separato (non dentro metadata)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // facoltativi:
  // themeColor: '#0b6cff',
  // colorScheme: 'light dark',
};

const FOOTER_LINKS = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Termini' },
  { href: '/legal/beta', label: 'Informativa Beta' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD (Organization)
  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}${OG_IMAGE}`,
  };

  // JSON-LD (WebSite)
  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
  };

  return (
    <html lang="it">
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
      </head>

      <body className="antialiased text-neutral-900 font-sans">
        <a href="#main-content" className="skip-link">
          Salta al contenuto principale
        </a>
        {/* Analytics privacy-first: si attiva solo con consenso e DNT disattivato */}
        <Suspense fallback={null}>
          <PrivacyAnalytics />
        </Suspense>

        {/* Web Vitals reali (solo produzione, privacy-first) */}
        <Suspense fallback={null}>
          <WebVitalsReporter />
        </Suspense>

        {/* Pulisce hash OAuth e fa redirect sicuro */}
        <Suspense fallback={null}>
          <HashCleanup />
        </Suspense>

        {/* Contenuto pagina */}
        <div id="main-content" tabIndex={-1}>
          <Suspense fallback={null}>{children}</Suspense>
        </div>

        <footer className="border-t border-neutral-200 bg-white/90 py-6 text-sm text-neutral-600">
          <div className="container mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              © {new Date().getFullYear()} Club &amp; Player
            </p>
            <nav className="flex flex-wrap gap-4">
              {FOOTER_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-neutral-900 underline-offset-2 hover:underline">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </footer>

        {/* Sync sessione client->server (cookie) */}
        <Suspense fallback={null}>
          <SessionSyncMount />
        </Suspense>

        {/* Banner GDPR */}
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
