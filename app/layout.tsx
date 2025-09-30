// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';
import CookieConsent from '@/components/misc/CookieConsent';

export const metadata: Metadata = {
  title: 'Club & Player',
  description: 'Club & Player App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* Pulisce hash OAuth e fa redirect sicuro */}
        <Suspense fallback={null}>
          <HashCleanup />
        </Suspense>

        {/* Contenuto pagina (mettiamo sotto Suspense per coprire qualsiasi useSearchParams etc.) */}
        <Suspense fallback={null}>
          {children}
        </Suspense>

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
