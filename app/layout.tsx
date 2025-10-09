// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';
import CookieConsent from '@/components/misc/CookieConsent';
import PostHogInit from '@/components/analytics/PostHogInit';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clubandplayer.com';
const SITE_NAME = 'Club & Player';
const DEFAULT_TITLE = SITE_NAME;
const DEFAULT_DESC = 'Club & Player App';
const OG_IMAGE = '/og.jpg'; // metti il file in /public/og.jpg (1200x630)

export const metadata: Metadata = {
  // Serve a rendere assoluti gli URL (og:image, ecc.)
  metadataBase: new URL(BASE_URL),

  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  viewport: 'width=device-width, initial-scale=1',

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

  // niente canonical globale qui: meglio lasciarlo per-pagina se servirà
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD (Organization)
  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}${OG_IMAGE}`,
  };

  // JSON-LD (WebSite + SearchAction futura, se aggiungerai una ricerca interna)
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

      <body>
        {/* Init analytics (rispetta consenso, pageview & identify) */}
        <Suspense fallback={null}>
          <PostHogInit />
        </Suspense>

        {/* Pulisce hash OAuth e fa redirect sicuro */}
        <Suspense fallback={null}>
          <HashCleanup />
        </Suspense>

        {/* Contenuto pagina */}
        <Suspense fallback={null}>{children}</Suspense>

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
