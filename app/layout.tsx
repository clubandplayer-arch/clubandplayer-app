// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

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
        <HashCleanup />

        {/* Contenuto pagina */}
        {children}

        {/* Sync sessione client->server (cookie) */}
        <SessionSyncMount />

        {/* Banner GDPR (fissato in basso) */}
        <CookieConsent />
      </body>
    </html>
  );
}
