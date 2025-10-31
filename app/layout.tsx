// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';

import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';
import CookieConsent from '@/components/misc/CookieConsent';
import PostHogInit from '@/components/analytics/PostHogInit';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clubandplayer.com';
const SITE_NAME = 'Club & Player';
const DEFAULT_TITLE = SITE_NAME;
const DEFAULT_DESC = 'Club & Player App';
const OG_IMAGE = '/og.jpg'; // /public/og.jpg (1200x630)

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
  // opzionale:
  // themeColor: '#0b6cff',
  // colorScheme: 'light dark',
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

      <body className={`${inter.className} antialiased bg-neutral-50 text-neutral-900`}>
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
