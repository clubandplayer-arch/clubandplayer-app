// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Righteous } from 'next/font/google';

import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';
import CookieConsent from '@/components/misc/CookieConsent';
import SiteFooter from '@/components/layout/SiteFooter';
import PrivacyAnalytics from '@/components/analytics/PrivacyAnalytics';
import WebVitalsReporter from '@/components/analytics/WebVitalsReporter';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { loadMessages } from '@/lib/i18n/messages';
import { resolveRequestLocale } from '@/lib/i18n/server';
import { buildLocalizedMetadata } from '@/lib/i18n/metadata';
import { DEFAULT_OG_IMAGE, getSiteUrl, SITE_NAME } from '@/lib/seo';

const righteous = Righteous({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-righteous',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const BASE_URL = getSiteUrl();
const OG_IMAGE = DEFAULT_OG_IMAGE; // /public/og.jpg (1200x630)

// Disabilita la prerenderizzazione statica per evitare errori quando le variabili
// Supabase non sono disponibili in fase di build.
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  return { ...buildLocalizedMetadata(locale, 'home', BASE_URL), metadataBase: new URL(BASE_URL), applicationName: SITE_NAME };
}

// ✅ Next 15: viewport deve essere un export separato (non dentro metadata)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // facoltativi:
  // themeColor: '#0b6cff',
  // colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveRequestLocale();
  const messages = await loadMessages(locale);
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
    <html lang={locale}>
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
        {/* Font Material Symbols global (via Google Fonts) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>

      <body className={`${righteous.variable} ${inter.className} antialiased text-neutral-900`}>
        <I18nProvider initialLocale={locale} initialMessages={messages}>
        <a href="#main-content" className="skip-link">
          {messages['common.skipContent']}
        </a>
        <LanguageSwitcher />
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

        <SiteFooter year={new Date().getFullYear()} />

        {/* Sync sessione client->server (cookie) */}
        <Suspense fallback={null}>
          <SessionSyncMount />
        </Suspense>

        {/* Banner GDPR */}
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
        </I18nProvider>
      </body>
    </html>
  );
}
