// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Righteous } from 'next/font/google';

import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';
import CookieConsent from '@/components/misc/CookieConsent';
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
  const footerLinks = [
    { href: '/legal/privacy', label: messages['common.privacy'] },
    { href: '/legal/terms', label: messages['common.terms'] },
    { href: '/legal/beta', label: messages['common.betaInfo'] },
    { href: '/legal/child-safety', label: 'Child Safety' },
  ];
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
        {/* Privacy-friendly analytics by Plausible */}
        <script async src="https://plausible.io/js/pa-HXeQN5y875CNhL53TjafY.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()',
          }}
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

        <footer className="border-t border-neutral-200 bg-white/90 py-6 text-sm text-neutral-600">
          <div className="container mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              © {new Date().getFullYear()} Club and Player
            </p>
            <nav className="flex flex-wrap gap-4">
              {footerLinks.map((link) => (
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
        </I18nProvider>
      </body>
    </html>
  );
}
